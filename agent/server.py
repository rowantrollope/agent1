"""
FastAPI server for the Python agent.
"""
import os
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from dotenv import load_dotenv
from agent import PythonAgent
from mcp_config import get_enabled_servers, is_server_configured, validate_configuration
from mcp_client import mcp_manager, setup_mcp_server

# Load environment variables
load_dotenv("../.env.local")

app = FastAPI(title="Python Agent API")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global agent instance
agent: Optional[PythonAgent] = None

def get_agent():
    global agent
    if agent is None:
        api_key = os.getenv("OPENAI_API_KEY")
        if not api_key:
            raise HTTPException(status_code=500, detail="OPENAI_API_KEY not found")
        agent = PythonAgent(api_key=api_key)

        # Initialize MCP servers
        initialize_mcp_servers(agent)
    return agent

def initialize_mcp_servers(agent_instance: PythonAgent):
    """Initialize configured MCP servers."""
    enabled_servers = get_enabled_servers()

    for server_name, config in enabled_servers.items():
        if is_server_configured(server_name):
            print(f"🔌 Setting up MCP server: {server_name}")
            try:
                # Use the new simplified setup
                success = setup_mcp_server(
                    server_name,
                    config["path"],
                    config.get("env_vars", {})
                )
                if success:
                    print(f"✅ MCP server {server_name} configured")
                else:
                    print(f"⚠️  Failed to setup MCP server {server_name}")
            except Exception as e:
                print(f"⚠️  Failed to setup MCP server {server_name}: {e}")
                import traceback
                print(f"   Error details: {traceback.format_exc()}")
        else:
            print(f"⚠️  MCP server {server_name} not properly configured")

class ChatRequest(BaseModel):
    message: Optional[str] = None
    action: Optional[str] = None

class ChatResponse(BaseModel):
    response: Optional[dict] = None
    history: Optional[list] = None
    success: Optional[bool] = None
    message: Optional[str] = None
    error: Optional[str] = None

@app.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest):
    try:
        agent_instance = get_agent()

        if request.action == "clear":
            agent_instance.clear_history()
            return ChatResponse(success=True, message="Chat history cleared")

        if not request.message:
            raise HTTPException(status_code=400, detail="Message is required")

        response = await agent_instance.chat_async(request.message)
        history = agent_instance.get_messages()

        return ChatResponse(
            response=response.to_dict(),
            history=history
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/chat", response_model=ChatResponse)
async def get_chat_history():
    try:
        agent_instance = get_agent()
        history = agent_instance.get_messages()
        return ChatResponse(history=history)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/health")
async def health_check():
    return {"status": "healthy", "agent": "python"}

@app.get("/tools")
async def get_tools():
    try:
        agent_instance = get_agent()
        return {
            "tools": agent_instance.get_available_tools(),
            "enabled": agent_instance.is_tools_enabled()
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/mcp/status")
async def get_mcp_status():
    """Get MCP server configuration status."""
    try:
        status = validate_configuration()
        enabled_servers = get_enabled_servers()

        return {
            "mcp_available": True,
            "enabled_servers": list(enabled_servers.keys()),
            "valid_servers": status["valid_servers"],
            "invalid_servers": status["invalid_servers"],
            "warnings": status["warnings"]
        }
    except Exception as e:
        return {
            "mcp_available": False,
            "error": str(e)
        }

@app.get("/mcp/tools")
async def get_mcp_tools():
    """Get all available MCP tools from all connected servers."""
    try:
        from mcp_config import MCP_SERVERS
        all_tools = {}
        
        # Check all servers, not just enabled ones, to show disabled state
        for server_name, config in MCP_SERVERS.items():
            # Skip if disabled
            if not config.get("enabled", False):
                all_tools[server_name] = {
                    "description": config.get("description", ""),
                    "status": "disabled",
                    "enabled": False,
                    "tools": []
                }
                continue
            try:
                # Check if server is connected
                if server_name in mcp_manager.servers:
                    tools = await mcp_manager.get_server_tools(server_name)
                    all_tools[server_name] = {
                        "description": config.get("description", ""),
                        "status": "connected",
                        "enabled": True,
                        "tools": [
                            {
                                "name": tool["function"]["name"],
                                "description": tool["function"].get("description", ""),
                                "parameters": tool["function"].get("parameters", {})
                            }
                            for tool in tools
                        ]
                    }
                else:
                    all_tools[server_name] = {
                        "description": config.get("description", ""),
                        "status": "not_connected",
                        "enabled": True,
                        "tools": []
                    }
            except Exception as e:
                all_tools[server_name] = {
                    "description": config.get("description", ""),
                    "status": "error",
                    "enabled": True,
                    "error": str(e),
                    "tools": []
                }
        
        return {
            "success": True,
            "servers": all_tools
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "servers": {}
        }

@app.post("/mcp/enable/{server_name}")
async def enable_mcp_server(server_name: str):
    """Enable an MCP server (sets enabled=True in config)."""
    try:
        from mcp_config import MCP_SERVERS, reload_config
        
        if server_name not in MCP_SERVERS:
            raise HTTPException(status_code=404, detail=f"Server {server_name} not found")
        
        # Enable the server in memory
        MCP_SERVERS[server_name]["enabled"] = True
        
        return {
            "success": True,
            "message": f"Server {server_name} enabled",
            "server_name": server_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mcp/disable/{server_name}")
async def disable_mcp_server(server_name: str):
    """Disable an MCP server (sets enabled=False and disconnects)."""
    try:
        from mcp_config import MCP_SERVERS
        
        if server_name not in MCP_SERVERS:
            raise HTTPException(status_code=404, detail=f"Server {server_name} not found")
        
        # Disable the server in memory
        MCP_SERVERS[server_name]["enabled"] = False
        
        # Disconnect if currently connected
        if server_name in mcp_manager.servers:
            await mcp_manager.disconnect_server(server_name)
        
        return {
            "success": True,
            "message": f"Server {server_name} disabled and disconnected",
            "server_name": server_name
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/mcp/connect/{server_name}")
async def connect_mcp_server(server_name: str):
    """Manually connect to an MCP server by spawning the server process."""
    try:
        if not is_server_configured(server_name):
            raise HTTPException(
                status_code=400,
                detail=f"Server {server_name} is not properly configured"
            )

        config = get_enabled_servers().get(server_name)
        if not config:
            raise HTTPException(
                status_code=404,
                detail=f"Server {server_name} not found or not enabled"
            )

        # Setup and connect to the server (this spawns the server process)
        if server_name not in mcp_manager.servers:
            success = setup_mcp_server(
                server_name,
                config["path"],
                config.get("env_vars", {})
            )
            if not success:
                raise HTTPException(
                    status_code=500,
                    detail=f"Failed to setup server {server_name}"
                )

        # Test connection by spawning server process
        success = await mcp_manager.connect_server(server_name)

        if success:
            tools = await mcp_manager.get_server_tools(server_name)
            return {
                "success": True,
                "message": f"Connected to {server_name} (server process spawned)",
                "tools_count": len(tools),
                "tools": [tool["function"]["name"] for tool in tools]
            }
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to spawn and connect to {server_name}"
            )

    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500, 
            detail=f"Error connecting to {server_name}: {str(e)}\n{traceback.format_exc()}"
        )

@app.on_event("startup")
async def startup_event():
    """Initialize services on startup."""
    print("🚀 Starting Agent1 Python backend...")

    # Print MCP status
    status = validate_configuration()
    if status["valid_servers"]:
        print(f"🔌 MCP servers available: {', '.join(status['valid_servers'])}")
        
        # Eagerly connect to all enabled MCP servers
        print("🔄 Pre-connecting to enabled MCP servers...")
        enabled_servers = get_enabled_servers()
        
        for server_name, config in enabled_servers.items():
            if is_server_configured(server_name):
                try:
                    print(f"   Connecting to {server_name}...")
                    
                    # Setup the server configuration if not already done
                    if server_name not in mcp_manager.servers:
                        success = setup_mcp_server(
                            server_name, 
                            config["path"], 
                            config.get("env_vars"),
                            config.get("python_path")
                        )
                        if not success:
                            print(f"   ❌ Failed to setup {server_name}")
                            continue
                    
                    # Attempt connection
                    connected = await mcp_manager.connect_server(server_name)
                    if connected:
                        # Get tool count for feedback
                        tools = await mcp_manager.get_server_tools(server_name)
                        tool_count = len(tools)
                        print(f"   ✅ Connected to {server_name} ({tool_count} tools)")
                    else:
                        print(f"   ❌ Failed to connect to {server_name}")
                        
                except Exception as e:
                    print(f"   ❌ Error connecting to {server_name}: {str(e)}")
                    
        print("🔌 MCP server initialization complete")
    else:
        print("⚠️  No MCP servers configured")
        print("   Run: python setup_mcp.py to configure MCP servers")

@app.on_event("shutdown")
async def shutdown_event():
    """Cleanup on shutdown."""
    print("🛑 Shutting down Agent1 Python backend...")
    try:
        from mcp_client import cleanup_mcp
        await cleanup_mcp()
        print("✅ MCP connections cleaned up")
    except Exception as e:
        print(f"⚠️  Error during MCP cleanup: {e}")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

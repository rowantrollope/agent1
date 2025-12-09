"""
FastAPI server for the Python agent.
"""
import os
import json
import uuid
from contextlib import asynccontextmanager
from datetime import datetime, timezone
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Any, Optional, Tuple
from dotenv import load_dotenv
from agent import PythonAgent
from mcp_config import get_enabled_servers, is_server_configured, validate_configuration
from mcp_client import mcp_manager, setup_mcp_server

# Load environment variables
load_dotenv("../.env.local")

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Manage application lifespan: startup and shutdown."""
    # Startup
    print("🚀 Starting DateGPT Python backend...")

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
                            command=config.get("command"),
                            args=config.get("args", [])
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
    
    yield
    
    # Shutdown
    print("🛑 Shutting down DateGPT Python backend...")
    try:
        from mcp_client import cleanup_mcp
        await cleanup_mcp()
        print("✅ MCP connections cleaned up")
    except Exception as e:
        print(f"⚠️  Error during MCP cleanup: {e}")

app = FastAPI(title="Python Agent API", lifespan=lifespan)

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
                    config.get("env_vars", {}),
                    command=config.get("command"),
                    args=config.get("args", [])
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

async def generate_welcome_message() -> str:
    """
    Generate a proactive welcome message based on current dating data.
    Returns a personalized message about upcoming dates and active relationships.
    """
    try:
        from mcp_client import execute_mcp_tool
        import json
        from datetime import datetime, timedelta
        
        # Get active people
        active_result = await execute_mcp_tool("redis-dating_list_people", {
            "active_only": True,
            "include_details": False
        })
        
        active_people = []
        if active_result.get("success") and active_result.get("result"):
            try:
                people_data = json.loads(active_result["result"])
                if isinstance(people_data, dict) and "data" in people_data:
                    active_people = people_data["data"]
                elif isinstance(people_data, list):
                    active_people = people_data
            except (json.JSONDecodeError, TypeError):
                pass
        
        # Count active people
        active_count = len(active_people)
        
        # Find people with recent start dates (within last week)
        recent_people = []
        today = datetime.now()
        
        for person in active_people:
            name = person.get("name", "Unknown")
            
            # Check start_date for recent dates
            if person.get("start_date"):
                try:
                    start_date = datetime.fromisoformat(person["start_date"].replace("Z", "+00:00"))
                    start_date = start_date.replace(tzinfo=None)
                    days_ago = (today - start_date).days
                    if 0 <= days_ago <= 7:
                        recent_people.append({
                            "name": name,
                            "days_ago": days_ago
                        })
                except (ValueError, AttributeError):
                    pass
            
            # Note: We could add a "next_date" field to track upcoming dates
            # For now, we'll focus on recent dates
        
        # Prepare context for LLM
        context = {
            "active_count": active_count,
            "recent_people": recent_people[:3],  # Limit to 3 most recent
            "all_active_names": [p.get("name") for p in active_people[:5]]  # First 5 names
        }
        
        # Generate welcome message using OpenAI
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        
        # Build context string
        context_str = f"You have {active_count} active dating relationship(s)."
        if recent_people:
            # Sort by most recent (lowest days_ago)
            recent_people.sort(key=lambda x: x["days_ago"])
            names = [p["name"] for p in recent_people[:2]]  # Top 2 most recent
            if len(names) == 1:
                context_str += f" You had a date with {names[0]} recently."
            else:
                context_str += f" Recent dates: {', '.join(names)}."
        elif active_people:
            names = [p.get("name") for p in active_people[:3] if p.get("name")]
            if names:
                context_str += f" Active relationships: {', '.join(names)}."
        
        prompt = f"""Create a friendly, proactive welcome message for a dating assistant app. The user is returning to the app.

Context: {context_str}

Requirements:
- Be warm and engaging (start with "Hey, welcome back!" or similar)
- If there are recent dates (within last week), ask how things went with the most recent one by name (e.g., "I'm curious how things went with [Name]")
- If there are multiple active relationships but no recent dates, mention the count and ask if they want to catch up on anyone
- If no active dates, be encouraging and ask how you can help
- Keep it conversational and brief (2-3 sentences max)
- Don't be overly formal
- Make it feel like a friend checking in

Generate ONLY the welcome message, nothing else:"""

        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a friendly, proactive dating assistant that creates engaging welcome messages."},
                {"role": "user", "content": prompt}
            ],
            max_tokens=150,
            temperature=0.8
        )
        
        welcome_msg = response.choices[0].message.content.strip()
        return welcome_msg
        
    except Exception as e:
        # Fallback welcome message
        return "Hey, welcome back! How can I help you with your dating life today?"

@app.get("/chat", response_model=ChatResponse)
async def get_chat_history():
    try:
        agent_instance = get_agent()
        history = agent_instance.get_messages()
        
        # If no history (only system message), generate and add welcome message
        # get_messages() filters out system messages, so empty list means no conversation yet
        if len(history) == 0:
            welcome_message = await generate_welcome_message()
            # Add welcome message as assistant message
            from agent import ChatMessage
            welcome_msg = ChatMessage("assistant", welcome_message)
            agent_instance.messages.append(welcome_msg)
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
                config.get("env_vars", {}),
                command=config.get("command"),
                args=config.get("args", [])
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

async def generate_person_summary(person: Dict[str, Any]) -> str:
    """
    Generate a brief summary (1-2 sentences) for a person from their memories in agent-memory-server.
    Returns empty string if memory server is unavailable or has no memories.
    """
    try:
        from mcp_client import execute_mcp_tool
        
        # Get memory_tags from person record
        memory_tags = person.get("memory_tags") or person.get("name", "").lower()
        
        # Query memories from agent-memory-server using the correct tool name
        memories_text = ""
        try:
            # Use search_long_term_memory with text parameter (the actual tool name)
            result = await execute_mcp_tool(
                "agent-memory-server_search_long_term_memory", 
                {"text": memory_tags, "limit": 5}
            )
            if result.get("success") and result.get("result"):
                memories_text = result["result"]
        except Exception as e:
            # Silently fail - memories are optional
            pass
        
        # If we got memories, generate a brief summary
        if memories_text and len(memories_text.strip()) > 0:
            # Use OpenAI to generate a 1-2 sentence summary
            try:
                from openai import OpenAI
                client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
                
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[
                        {"role": "system", "content": "You are a helpful assistant that creates brief, concise summaries. Always complete your sentences - never cut off mid-word or mid-sentence."},
                        {"role": "user", "content": f"Create a brief 1-2 sentence summary of the following information about {person.get('name', 'this person')}:\n\n{memories_text[:2000]}"}
                    ],
                    max_tokens=200,
                    temperature=0.3
                )
                summary = response.choices[0].message.content.strip()
                return summary
            except Exception as e:
                # Fallback: truncate at word boundary instead of character boundary
                if len(memories_text) > 150:
                    # Find the last space before 150 characters
                    truncated = memories_text[:150]
                    last_space = truncated.rfind(' ')
                    if last_space > 100:  # Only use word boundary if it's not too short
                        return memories_text[:last_space] + "..."
                    return memories_text[:150] + "..."
                return memories_text
        
        return ""
    except Exception as e:
        # If anything fails, return empty string
        return ""

def normalize_date_entries(entries: Any) -> List[Dict[str, Any]]:
    normalized: List[Dict[str, Any]] = []
    if not isinstance(entries, list):
        return normalized
    for entry in entries:
        if isinstance(entry, dict):
            normalized_entry = dict(entry)
            if "date" in normalized_entry and "when" not in normalized_entry:
                normalized_entry["when"] = normalized_entry.pop("date")
            if "location" in normalized_entry and "where" not in normalized_entry:
                normalized_entry["where"] = normalized_entry.pop("location")
            normalized.append(normalized_entry)
    return normalized

def coerce_iso_datetime(value: Optional[str]) -> Optional[str]:
    if not value:
        return value
    if not isinstance(value, str):
        return value
    cleaned = value.strip()
    if not cleaned:
        return None
    try:
        normalized = cleaned.replace("Z", "+00:00") if cleaned.endswith("Z") else cleaned
        dt = datetime.fromisoformat(normalized)
        iso = dt.isoformat()
        if dt.tzinfo is None:
            iso = iso + "Z"
        return iso
    except ValueError:
        return cleaned

def hydrate_person(person: Dict[str, Any]) -> Dict[str, Any]:
    hydrated = dict(person)
    hydrated.setdefault("details", "")
    if not hydrated.get("how_we_met") and hydrated.get("meeting_place"):
        hydrated["how_we_met"] = hydrated.get("meeting_place")
    raw_dates = hydrated.get("dates")
    if isinstance(raw_dates, list):
        hydrated["dates"] = normalize_date_entries(raw_dates)
    elif isinstance(raw_dates, str) and raw_dates:
        try:
            parsed_dates = json.loads(raw_dates)
            hydrated["dates"] = normalize_date_entries(parsed_dates) if isinstance(parsed_dates, list) else []
        except json.JSONDecodeError:
            hydrated["dates"] = []
    else:
        hydrated["dates"] = []
    return hydrated

def extract_json_chunk(text: str) -> Optional[Dict[str, Any]]:
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        if not isinstance(text, str):
            return None
        start = text.find("{")
        end = text.rfind("}")
        if start != -1 and end != -1 and end > start:
            try:
                return json.loads(text[start : end + 1])
            except json.JSONDecodeError:
                return None
    return None

async def fetch_person_record(name: str) -> Dict[str, Any]:
    from mcp_client import execute_mcp_tool
    result = await execute_mcp_tool("redis-dating_get_person", {"name": name})
    if not result.get("success") or not result.get("result"):
        raise HTTPException(status_code=404, detail=f"Person '{name}' not found")

    payload = extract_json_chunk(result.get("result"))
    if isinstance(payload, dict):
        person_data = payload.get("data") if "data" in payload else payload
    else:
        person_data = None

    if isinstance(person_data, dict) and person_data.get("name"):
        return hydrate_person(person_data)
    raise HTTPException(status_code=404, detail=f"Person '{name}' not found")

async def list_people_records(active_only: bool = False) -> List[Dict[str, Any]]:
    from mcp_client import execute_mcp_tool
    args: Dict[str, Any] = {"include_details": False}
    if active_only:
        args["active_only"] = True
    result = await execute_mcp_tool("redis-dating_list_people", args)
    people: List[Dict[str, Any]] = []
    if result.get("success") and result.get("result"):
        payload = extract_json_chunk(result["result"])
        if isinstance(payload, dict) and "data" in payload:
            people = payload["data"]
        elif isinstance(payload, list):
            people = payload
    return [hydrate_person(person) for person in people]

async def fetch_memories_for_person(person: Dict[str, Any], limit: int = 12) -> Tuple[List[Dict[str, Any]], Optional[str]]:
    """
    Fetch memories for a person using tag-based filtering.
    This ensures we only get memories associated with this specific person.
    """
    from mcp_client import execute_mcp_tool
    
    person_name = person.get("name", "")
    if not person_name:
        return [], None
    
    # Get memory_tags from person record - these should be used for filtering
    memory_tags_str = person.get("memory_tags", "")
    if memory_tags_str:
        # Parse comma-separated tags
        memory_tags = [tag.strip().lower() for tag in memory_tags_str.split(",") if tag.strip()]
    else:
        # Fallback: use person's name as a tag
        memory_tags = [person_name.lower()]
    
    # Also include the person's name in the tag list for filtering
    person_name_lower = person_name.lower()
    if person_name_lower not in memory_tags:
        memory_tags.append(person_name_lower)
    
    memories: List[Dict[str, Any]] = []
    last_updated: Optional[str] = None
    
    # Use the correct agent-memory-server tool: search_long_term_memory
    try:
        # Search with the person's name as text
        result = await execute_mcp_tool(
            "agent-memory-server_search_long_term_memory",
            {"text": person_name, "limit": limit * 2},  # Get more to filter
        )
        if result.get("success") and result.get("result"):
            payload = extract_json_chunk(result["result"])
            if isinstance(payload, dict):
                memories = payload.get("memories", [])
                if not memories and isinstance(payload, list):
                    memories = payload
            elif isinstance(payload, list):
                memories = payload
    except Exception:
        pass
    
    # Filter memories to ensure they match this person
    # Check if memory has the person's name in entities or topics
    filtered_memories = []
    person_name_variations = {person_name, person_name.lower(), person_name.upper(), person_name.title()}
    
    for mem in memories:
        if not isinstance(mem, dict) or not mem.get("text"):
            continue
        
        # Check entities field (most reliable)
        entities = mem.get("entities", [])
        if isinstance(entities, list):
            entity_names = [str(e).lower() for e in entities if e]
            if any(pn.lower() in entity_names for pn in person_name_variations):
                filtered_memories.append(mem)
                continue
        
        # Check topics field
        topics = mem.get("topics", [])
        if isinstance(topics, list):
            topic_str = " ".join([str(t).lower() for t in topics if t])
            if any(pn.lower() in topic_str for pn in person_name_variations):
                filtered_memories.append(mem)
                continue
        
        # Check if person name appears in text (last resort, but be careful)
        text_lower = str(mem.get("text", "")).lower()
        if person_name_lower in text_lower:
            # Additional check: make sure it's not just a mention in a list
            # This is a simple heuristic - if the name appears prominently, include it
            filtered_memories.append(mem)
    
    # Limit to requested number
    filtered_memories = filtered_memories[:limit]
    
    # Get last updated timestamp
    if filtered_memories:
        latest = max(
            (mem.get("created_at") or mem.get("event_date") for mem in filtered_memories if mem.get("created_at") or mem.get("event_date")),
            default=None,
        )
        last_updated = latest
    
    # Simplify memory structure
    simplified = []
    for mem in filtered_memories:
        simplified.append(
            {
                "id": mem.get("id", str(len(simplified))),
                "text": mem.get("text", ""),
                "memory_type": mem.get("memory_type"),
                "event_date": mem.get("event_date"),
                "topics": mem.get("topics"),
                "entities": mem.get("entities"),
                "created_at": mem.get("created_at"),
            }
        )
    
    return simplified, last_updated

async def store_memory_entries(entries: List[Dict[str, Any]]):
    if not entries:
        return
    try:
        from mcp_client import execute_mcp_tool
        
        # Use the correct tool: agent-memory-server_create_long_term_memories
        payload = {"memories": entries}
        result = await execute_mcp_tool("agent-memory-server_create_long_term_memories", payload)
        
        if not (result.get("success") or result.get("result")):
            print(f"Warning: Failed to store memories: {result.get('error', 'Unknown error')}")
    except Exception as e:
        print(f"Warning: Failed to store memories: {e}")
        import traceback
        print(f"Traceback: {traceback.format_exc()}")

async def generate_dossier_brief(person: Dict[str, Any], memories: List[Dict[str, Any]], fallback_summary: str) -> Dict[str, Any]:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        memory_digest = [
            {k: v for k, v in mem.items() if k in {"text", "memory_type", "event_date"}}
            for mem in memories[:6]
        ]
        prompt = f"""
You are an elite dating intelligence analyst. Using the structured record and memory snippets provided, craft a JSON dossier summary.

Required JSON schema:
{{
  "summary": "2 sentences weaving structured + memory insights. Use fallback if needed.",
  "personaTone": "single evocative word (e.g., 'Velvet Rebel')",
  "highlightCards": [
    {{"id": "string", "title": "short label", "detail": "one sentence", "tone": "violet|emerald|amber|rose|cyan"}}
  ],
  "signalBars": [
    {{"label": "Chemistry", "score": 0.0-1.0, "note": "reason"}}
  ],
  "actionItems": ["three concrete next steps"]
}}

Structured data: {json.dumps(person, default=str)[:2000]}
Memories: {json.dumps(memory_digest, default=str)[:2000]}
Fallback summary: {fallback_summary or "N/A"}
Respond with JSON only.
"""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {
                    "role": "system",
                    "content": "Produce concise JSON. Do not include markdown or prose outside JSON.",
                },
                {"role": "user", "content": prompt},
            ],
            temperature=0.4,
            max_tokens=800,
        )
        content = response.choices[0].message.content
        parsed = extract_json_chunk(content)
        if isinstance(parsed, dict):
            return parsed
    except Exception as e:
        print(f"Warning: dossier brief generation failed: {e}")
    return {
        "summary": fallback_summary or "No summary available yet.",
        "personaTone": "Unknown",
        "highlightCards": [],
        "signalBars": [],
        "actionItems": [],
    }

def create_placeholder_brief() -> Dict[str, Any]:
    """Create a placeholder brief that will be replaced by the async generated one."""
    return {
        "summary": "Loading intelligence analysis...",
        "personaTone": "Analyzing",
        "highlightCards": [
            {
                "id": "loading-1",
                "title": "Loading",
                "detail": "Generating dossier insights...",
                "tone": "violet",
            }
        ],
        "signalBars": [
            {"label": "Chemistry", "score": 0.0, "note": "Analysis in progress"}
        ],
        "actionItems": ["Loading recommendations..."],
    }

async def build_dossier_payload(person_name: str, include_brief: bool = False) -> Dict[str, Any]:
    person = await fetch_person_record(person_name)
    memories, last_memory = await fetch_memories_for_person(person)
    
    if include_brief:
        # Generate brief synchronously (for backward compatibility or when explicitly requested)
        summary = await generate_person_summary(person)
        brief = await generate_dossier_brief(person, memories, summary)
        if not brief.get("highlightCards"):
            brief["highlightCards"] = [
                {
                    "id": "signal-1",
                    "title": "Chemistry pulse",
                    "detail": summary or "Keep collecting signals.",
                    "tone": "violet",
                }
            ]
        if not brief.get("signalBars"):
            brief["signalBars"] = [
                {"label": "Chemistry", "score": 0.6, "note": "Awaiting more intel"}
            ]
        if not brief.get("actionItems"):
            brief["actionItems"] = ["Schedule a new experience", "Capture new memories"]
    else:
        # Return placeholder brief for async loading
        brief = create_placeholder_brief()
    
    return {
        "person": person,
        "brief": brief,
        "memories": memories,
        "dates": person.get("dates", []),
        "memoryStats": {
            "total": len(memories),
            "lastUpdated": last_memory,
        },
        "lastRefreshed": datetime.utcnow().isoformat() + "Z",
    }

async def craft_chat_reply(person: Dict[str, Any], message: str, summary: str) -> str:
    try:
        from openai import OpenAI
        client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
        prompt = f"""
User update about {person.get('name', 'this person')}:
"{message}"

Existing summary:
{summary or 'No summary yet'}

Respond as a confident dating chief of staff. Acknowledge the intel, mention how it will be logged, and hint at a proactive next step. Keep it to 2 short sentences.
"""
        response = client.chat.completions.create(
            model="gpt-4o-mini",
            messages=[
                {"role": "system", "content": "You are a sharp, warm dating chief of staff who keeps dossiers perfectly updated."},
                {"role": "user", "content": prompt},
            ],
            temperature=0.6,
            max_tokens=150,
        )
        content = response.choices[0].message.content
        return content.strip() if content else "All logged. Let me know what else comes up."
    except Exception:
        return "Logged the update. I’ll keep the dossier tuned."

class UpdatePersonRequest(BaseModel):
    name: str
    status: Optional[str] = None
    start_date: Optional[str] = None
    end_date: Optional[str] = None
    meeting_place: Optional[str] = None  # Legacy support
    how_we_met: Optional[str] = None
    dates: Optional[List[Dict[str, Any]]] = None
    details: Optional[str] = None
    memory_tags: Optional[str] = None
    photo_url: Optional[str] = None

class AddDateRequest(BaseModel):
    where: str
    when: str
    notes: Optional[str] = None
    learnings: Optional[str] = None

class DossierChatRequest(BaseModel):
    message: str

class CreateDateRequest(BaseModel):
    person_name: str
    where: str
    when: str
    notes: Optional[str] = None
    learnings: Optional[str] = None
    completed: Optional[bool] = False

class UpdateDateRequest(BaseModel):
    where: Optional[str] = None
    when: Optional[str] = None
    notes: Optional[str] = None
    learnings: Optional[str] = None
    completed: Optional[bool] = None

@app.post("/dashboard/update-person")
async def update_person(request: UpdatePersonRequest):
    """Update a person record using MCP tools."""
    try:
        from mcp_client import execute_mcp_tool
        import json
        
        # Build update arguments (only include non-None and non-empty values)
        update_args = {"name": request.name}
        
        if request.status is not None and request.status and request.status.strip():
            update_args["status"] = request.status
        if request.start_date is not None and request.start_date and request.start_date.strip():
            update_args["start_date"] = request.start_date
        if request.how_we_met is not None:
            # Allow empty string for clearing
            update_args["how_we_met"] = request.how_we_met
        elif request.meeting_place is not None:
            # Legacy parameter
            update_args["how_we_met"] = request.meeting_place
        if request.end_date is not None and request.end_date and request.end_date.strip():
            update_args["end_date"] = request.end_date
        if request.details is not None:
            update_args["details"] = request.details
        if request.memory_tags is not None:
            update_args["memory_tags"] = request.memory_tags
        if request.dates is not None:
            update_args["dates"] = request.dates
        if request.photo_url is not None:
            update_args["photo_url"] = request.photo_url
        
        # Call MCP tool to update person
        result = await execute_mcp_tool("redis-dating_update_person", update_args)
        
        if result.get("success") and result.get("result"):
            try:
                # Parse the result
                result_data = json.loads(result["result"])
                if isinstance(result_data, dict) and "success" in result_data:
                    if result_data["success"]:
                        return {
                            "success": True,
                            "data": result_data.get("data", {})
                        }
                    else:
                        raise HTTPException(
                            status_code=400,
                            detail=result_data.get("error", "Update failed")
                        )
            except (json.JSONDecodeError, TypeError):
                # If result is not JSON, return as-is
                return {
                    "success": True,
                    "data": result.get("result", {})
                }
        
        raise HTTPException(
            status_code=500,
            detail=result.get("error", "Failed to update person")
        )
        
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        raise HTTPException(
            status_code=500,
            detail=f"Error updating person: {str(e)}\n{traceback.format_exc()}"
        )

@app.get("/dashboard")
async def get_dashboard_data():
    """Get dashboard data using MCP tools."""
    try:
        from mcp_client import execute_mcp_tool
        import json
        import asyncio
        from collections import defaultdict
        from datetime import datetime
        
        # Run independent API calls in parallel for better performance
        stats_result, active_result, all_people_result = await asyncio.gather(
            execute_mcp_tool("redis-dating_get_statistics", {}),
            execute_mcp_tool("redis-dating_list_people", {
                "active_only": True,
                "include_details": False
            }),
            execute_mcp_tool("redis-dating_list_people", {
                "include_details": False
            })
        )
        
        # Process statistics
        statistics = {
            "total_people": 0,
            "active_count": 0,
            "not_pursuing_count": 0,
            "paused_count": 0,
            "exploring_count": 0,
            "common_how_we_met": [],
            "common_meeting_places": []
        }
        
        if stats_result.get("success") and stats_result.get("result"):
            try:
                stats_data = json.loads(stats_result["result"])
                if isinstance(stats_data, dict) and "data" in stats_data:
                    data = stats_data["data"]
                    # Convert how_we_met dict to array format
                    meeting_places = data.get("common_how_we_met") or data.get("common_meeting_places", {})
                    meeting_places_array = [
                        {"place": place, "count": count}
                        for place, count in meeting_places.items()
                    ]
                    not_pursuing_count = data.get("not_pursuing_count")
                    if not_pursuing_count is None:
                        not_pursuing_count = data.get("past_count", 0)
                    statistics = {
                        "total_people": data.get("total_people", 0),
                        "active_count": data.get("active_count", 0),
                        "not_pursuing_count": not_pursuing_count,
                        "paused_count": data.get("paused_count", 0),
                        "exploring_count": data.get("exploring_count", 0),
                        "common_how_we_met": meeting_places_array,
                        "common_meeting_places": meeting_places_array
                    }
            except (json.JSONDecodeError, TypeError):
                pass
        
        # Process active people
        active_people = []
        if active_result.get("success") and active_result.get("result"):
            try:
                people_data = json.loads(active_result["result"])
                if isinstance(people_data, dict) and "data" in people_data:
                    active_people = people_data["data"]
                elif isinstance(people_data, list):
                    active_people = people_data
            except (json.JSONDecodeError, TypeError):
                pass
        
        active_people = [hydrate_person(person) for person in active_people]
        
        # Process dating history (group by month)
        
        dating_history = []
        next_date = None
        
        if all_people_result.get("success") and all_people_result.get("result"):
            try:
                all_people_data = json.loads(all_people_result["result"])
                people_list = []
                if isinstance(all_people_data, dict) and "data" in all_people_data:
                    people_list = all_people_data["data"]
                elif isinstance(all_people_data, list):
                    people_list = all_people_data
                
                people_list = [hydrate_person(person) for person in people_list]
                
                # Group by month for history chart
                monthly_counts = defaultdict(int)
                upcoming_dates = []
                
                for person in people_list:
                    if person.get("start_date"):
                        try:
                            date_obj = datetime.fromisoformat(person["start_date"].replace("Z", "+00:00"))
                            month_key = date_obj.strftime("%Y-%m")
                            monthly_counts[month_key] += 1
                        except (ValueError, AttributeError):
                            pass
                    
                    # Check for upcoming dates from unified dates array
                    dates_list = person.get("dates", [])
                    if isinstance(dates_list, str):
                        try:
                            dates_list = json.loads(dates_list)
                        except (json.JSONDecodeError, TypeError):
                            dates_list = []
                    if not isinstance(dates_list, list):
                        dates_list = []
                    
                    # Find upcoming dates (not completed, in the future)
                    for date_entry in dates_list:
                        if isinstance(date_entry, dict):
                            completed = date_entry.get("completed", False)
                            if not completed:
                                when_str = date_entry.get("when")
                                if when_str:
                                    try:
                                        # Parse date with timezone handling
                                        date_str = when_str.replace("Z", "+00:00") if when_str.endswith("Z") else when_str
                                        date_obj = datetime.fromisoformat(date_str)
                                        # Ensure timezone-aware comparison
                                        if date_obj.tzinfo is None:
                                            date_obj = date_obj.replace(tzinfo=timezone.utc)
                                        now = datetime.now(timezone.utc)
                                        if date_obj > now:
                                            upcoming_dates.append({
                                                "name": person.get("name", "Unknown"),
                                                "date": when_str
                                            })
                                    except (ValueError, AttributeError) as e:
                                        print(f"Error parsing date '{when_str}': {e}")
                                        pass
                
                # Convert to array format for chart
                dating_history = [
                    {"month": month, "count": count}
                    for month, count in sorted(monthly_counts.items())
                ]
                
                # Get next upcoming date
                if upcoming_dates:
                    next_date = min(upcoming_dates, key=lambda x: x["date"])
                
                # Enhanced analytics
                total_dates = 0
                dates_per_person = []
                date_locations = defaultdict(int)
                dates_by_month = defaultdict(int)
                relationship_durations = []
                date_frequency = defaultdict(int)
                
                for person in people_list:
                    person_name = person.get("name", "Unknown")
                    dates_list = person.get("dates", [])
                    
                    # Parse dates if string
                    if isinstance(dates_list, str):
                        try:
                            dates_list = json.loads(dates_list)
                        except (json.JSONDecodeError, TypeError):
                            dates_list = []
                    
                    if not isinstance(dates_list, list):
                        dates_list = []
                    
                    date_count = len(dates_list)
                    total_dates += date_count
                    
                    if date_count > 0:
                        dates_per_person.append({
                            "name": person_name,
                            "count": date_count
                        })
                    
                    # Track date locations
                    for date_entry in dates_list:
                        if isinstance(date_entry, dict):
                            location = date_entry.get("where", "Unknown")
                            if location:
                                date_locations[location] += 1
                            
                            # Track dates by month
                            when_str = date_entry.get("when")
                            if when_str:
                                try:
                                    date_obj = datetime.fromisoformat(when_str.replace("Z", "+00:00"))
                                    month_key = date_obj.strftime("%Y-%m")
                                    dates_by_month[month_key] += 1
                                except (ValueError, AttributeError):
                                    pass
                    
                    # Calculate relationship duration
                    start_date_str = person.get("start_date")
                    end_date_str = person.get("end_date")
                    if start_date_str:
                        try:
                            start_dt = datetime.fromisoformat(start_date_str.replace("Z", "+00:00"))
                            end_dt = None
                            if end_date_str:
                                try:
                                    end_dt = datetime.fromisoformat(end_date_str.replace("Z", "+00:00"))
                                except (ValueError, AttributeError):
                                    pass
                            if not end_dt:
                                end_dt = datetime.now()
                            
                            duration_days = (end_dt - start_dt).days
                            if duration_days > 0:
                                relationship_durations.append({
                                    "name": person_name,
                                    "days": duration_days
                                })
                        except (ValueError, AttributeError):
                            pass
                    
                    # Date frequency (how many dates per person)
                    date_frequency[date_count] += 1
                
                # Sort and format analytics data
                dates_per_person_sorted = sorted(
                    dates_per_person, 
                    key=lambda x: x["count"], 
                    reverse=True
                )[:10]  # Top 10
                
                date_locations_sorted = sorted(
                    [{"location": loc, "count": count} for loc, count in date_locations.items()],
                    key=lambda x: x["count"],
                    reverse=True
                )[:10]  # Top 10
                
                dates_by_month_sorted = [
                    {"month": month, "count": count}
                    for month, count in sorted(dates_by_month.items())
                ]
                
                relationship_durations_sorted = sorted(
                    relationship_durations,
                    key=lambda x: x["days"],
                    reverse=True
                )[:10]  # Top 10
                
                date_frequency_dist = [
                    {"dates": count, "people": freq}
                    for count, freq in sorted(date_frequency.items())
                ]
                
                # Calculate averages
                avg_dates_per_person = total_dates / len(people_list) if people_list else 0
                avg_relationship_duration = (
                    sum(d["days"] for d in relationship_durations) / len(relationship_durations)
                    if relationship_durations else 0
                )
                longest_relationship = relationship_durations_sorted[0] if relationship_durations_sorted else None
                
                # Add to statistics
                statistics["total_dates"] = total_dates
                statistics["avg_dates_per_person"] = round(avg_dates_per_person, 1)
                statistics["avg_relationship_duration_days"] = round(avg_relationship_duration, 1)
                statistics["longest_relationship"] = longest_relationship
                
                # Add analytics arrays
                analytics = {
                    "dates_per_person": dates_per_person_sorted,
                    "date_locations": date_locations_sorted,
                    "dates_by_month": dates_by_month_sorted,
                    "relationship_durations": relationship_durations_sorted,
                    "date_frequency_distribution": date_frequency_dist
                }
                    
            except (json.JSONDecodeError, TypeError) as e:
                print(f"Error parsing people data: {e}")
                analytics = {
                    "dates_per_person": [],
                    "date_locations": [],
                    "dates_by_month": [],
                    "relationship_durations": [],
                    "date_frequency_distribution": []
                }
        
        return {
            "success": True,
            "statistics": statistics,
            "activePeople": active_people,
            "nextDate": next_date,
            "datingHistory": dating_history,
            "analytics": analytics if 'analytics' in locals() else {
                "dates_per_person": [],
                "date_locations": [],
                "dates_by_month": [],
                "relationship_durations": [],
                "date_frequency_distribution": []
            }
        }
        
    except Exception as e:
        import traceback
        print(f"Error fetching dashboard data: {e}\n{traceback.format_exc()}")
        return {
            "success": False,
            "error": str(e),
            "statistics": {
                "total_people": 0,
                "active_count": 0,
                "not_pursuing_count": 0,
                "paused_count": 0,
                "exploring_count": 0,
                "common_how_we_met": []
            },
            "activePeople": [],
            "datingHistory": [],
            "analytics": {
                "dates_per_person": [],
                "date_locations": [],
                "dates_by_month": [],
                "relationship_durations": [],
                "date_frequency_distribution": []
            }
        }

@app.get("/dossiers")
async def list_dossiers(activeOnly: bool = Query(False)):
    try:
        people = await list_people_records(active_only=activeOnly)
        simplified = [
            {
                "name": person.get("name"),
                "status": person.get("status"),
                "how_we_met": person.get("how_we_met"),
                "photo_url": person.get("photo_url"),
            }
            for person in people
        ]
        return {"success": True, "people": simplified}
    except Exception as e:
        return {"success": False, "error": str(e), "people": []}

@app.get("/dossiers/{person_name}")
async def get_dossier(person_name: str, includeBrief: bool = Query(False, alias="includeBrief")):
    """
    Get dossier payload. By default, returns immediately with placeholder brief.
    Set includeBrief=true to wait for LLM-generated brief (slower).
    """
    try:
        data = await build_dossier_payload(person_name, include_brief=includeBrief)
        return {"success": True, "data": data}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to build dossier: {e}")

@app.get("/dossiers/{person_name}/brief")
async def get_dossier_brief(person_name: str):
    """
    Generate and return the dossier brief asynchronously.
    This endpoint makes LLM calls and may take several seconds.
    """
    try:
        person = await fetch_person_record(person_name)
        memories, _ = await fetch_memories_for_person(person)
        summary = await generate_person_summary(person)
        brief = await generate_dossier_brief(person, memories, summary)
        
        # Ensure required fields exist
        if not brief.get("highlightCards"):
            brief["highlightCards"] = [
                {
                    "id": "signal-1",
                    "title": "Chemistry pulse",
                    "detail": summary or "Keep collecting signals.",
                    "tone": "violet",
                }
            ]
        if not brief.get("signalBars"):
            brief["signalBars"] = [
                {"label": "Chemistry", "score": 0.6, "note": "Awaiting more intel"}
            ]
        if not brief.get("actionItems"):
            brief["actionItems"] = ["Schedule a new experience", "Capture new memories"]
        
        return {"success": True, "brief": brief}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate brief: {e}")

@app.post("/dossiers/{person_name}/dates")
async def add_dossier_date(person_name: str, request: AddDateRequest):
    if not request.where.strip():
        raise HTTPException(status_code=400, detail="Location is required")
    when_iso = coerce_iso_datetime(request.when)
    if not when_iso:
        raise HTTPException(status_code=400, detail="Invalid date/time provided")
    try:
        person = await fetch_person_record(person_name)
        new_entry = {
            "where": request.where.strip(),
            "when": when_iso,
            "notes": request.notes,
            "learnings": request.learnings,
            "id": str(uuid.uuid4()),
        }
        updated_dates = person.get("dates", []) + [new_entry]
        from mcp_client import execute_mcp_tool
        await execute_mcp_tool(
            "redis-dating_update_person",
            {"name": person["name"], "dates": updated_dates},
        )
        memory_text_parts = [
            f"Date with {person['name']} at {request.where.strip()}",
            f"on {when_iso}",
        ]
        if request.notes:
            memory_text_parts.append(f"Notes: {request.notes.strip()}")
        if request.learnings:
            memory_text_parts.append(f"Learnings: {request.learnings.strip()}")
        # Get memory_tags from person record for proper tagging
        memory_tags_str = person.get("memory_tags", "")
        memory_tags_list = []
        if memory_tags_str:
            memory_tags_list = [tag.strip() for tag in memory_tags_str.split(",") if tag.strip()]
        else:
            # Fallback: use person's name as a tag
            memory_tags_list = [person["name"].lower()]
        
        await store_memory_entries(
            [
                {
                    "text": ". ".join(memory_text_parts),
                    "memory_type": "episodic",
                    "event_date": when_iso,
                    "topics": ["date-log", "field-report"] + memory_tags_list,
                    "entities": [person["name"]],
                }
            ]
        )
        updated = await build_dossier_payload(person_name)
        return {"success": True, "data": updated}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to add date: {e}")

@app.post("/dossiers/{person_name}/chat")
async def dossier_chat(person_name: str, request: DossierChatRequest):
    if not request.message.strip():
        raise HTTPException(status_code=400, detail="Message is required")
    try:
        person = await fetch_person_record(person_name)
        summary = await generate_person_summary(person)
        timestamp = datetime.utcnow().isoformat() + "Z"
        # Get memory_tags from person record for proper tagging
        memory_tags_str = person.get("memory_tags", "")
        memory_tags_list = []
        if memory_tags_str:
            memory_tags_list = [tag.strip() for tag in memory_tags_str.split(",") if tag.strip()]
        else:
            # Fallback: use person's name as a tag
            memory_tags_list = [person["name"].lower()]
        
        await store_memory_entries(
            [
                {
                    "text": f"Update for {person['name']}: {request.message.strip()}",
                    "memory_type": "semantic",
                    "event_date": timestamp,
                    "topics": ["dossier-update"] + memory_tags_list,
                    "entities": [person["name"]],
                }
            ]
        )
        reply = await craft_chat_reply(person, request.message, summary)
        updated = await build_dossier_payload(person_name)
        assistant_message = {
            "id": str(uuid.uuid4()),
            "role": "assistant",
            "content": reply,
            "timestamp": timestamp,
        }
        return {
            "success": True,
            "assistantMessage": assistant_message,
            "dossier": updated,
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Chat update failed: {e}")

@app.get("/calendar/dates")
async def get_calendar_dates(
    person_name: Optional[str] = Query(None, description="Filter by person name"),
    active_only: bool = Query(False, description="Only show dates for active people"),
    completed: Optional[bool] = Query(None, description="Filter by completed status")
):
    """Get all dates across all people with optional filtering."""
    try:
        from mcp_client import execute_mcp_tool
        import json
        
        # Get all people (or just active if requested)
        args: Dict[str, Any] = {"include_details": False}
        if active_only:
            args["active_only"] = True
        
        result = await execute_mcp_tool("redis-dating_list_people", args)
        people: List[Dict[str, Any]] = []
        if result.get("success") and result.get("result"):
            payload = extract_json_chunk(result["result"])
            if isinstance(payload, dict) and "data" in payload:
                people = payload["data"]
            elif isinstance(payload, list):
                people = payload
        
        # Collect all dates from all people
        all_dates = []
        for person in people:
            person_name_val = person.get("name", "")
            
            # Apply person filter if specified
            if person_name and person_name_val.lower() != person_name.lower():
                continue
            
            # Get dates for this person
            dates = person.get("dates", [])
            if isinstance(dates, str) and dates:
                try:
                    dates = json.loads(dates)
                except json.JSONDecodeError:
                    dates = []
            
            if not isinstance(dates, list):
                dates = []
            
            # Process each date
            for date_entry in dates:
                if not isinstance(date_entry, dict):
                    continue
                
                # Add person_name if not present
                date_entry = dict(date_entry)
                date_entry["person_name"] = person_name_val
                
                # Ensure id exists
                if "id" not in date_entry:
                    date_entry["id"] = str(uuid.uuid4())
                
                # Ensure completed field exists (default to False)
                if "completed" not in date_entry:
                    date_entry["completed"] = False
                
                # Apply completed filter if specified
                if completed is not None and date_entry.get("completed") != completed:
                    continue
                
                all_dates.append(date_entry)
        
        return {"success": True, "data": all_dates}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to fetch dates: {e}")

@app.post("/calendar/dates")
async def create_calendar_date(request: CreateDateRequest):
    """Create a new date for a person."""
    if not request.where.strip():
        raise HTTPException(status_code=400, detail="Location is required")
    if not request.when.strip():
        raise HTTPException(status_code=400, detail="Date and time are required")
    
    when_iso = coerce_iso_datetime(request.when)
    if not when_iso:
        raise HTTPException(status_code=400, detail="Invalid date/time provided")
    
    try:
        person = await fetch_person_record(request.person_name)
        new_entry = {
            "where": request.where.strip(),
            "when": when_iso,
            "notes": request.notes or "",
            "learnings": request.learnings or "",
            "id": str(uuid.uuid4()),
            "completed": request.completed if request.completed is not None else False,
            "person_name": request.person_name,
        }
        
        # Get existing dates
        existing_dates = person.get("dates", [])
        if isinstance(existing_dates, str) and existing_dates:
            try:
                existing_dates = json.loads(existing_dates)
            except json.JSONDecodeError:
                existing_dates = []
        if not isinstance(existing_dates, list):
            existing_dates = []
        
        # Add new date
        updated_dates = existing_dates + [new_entry]
        
        # Update person record
        from mcp_client import execute_mcp_tool
        await execute_mcp_tool(
            "redis-dating_update_person",
            {"name": person["name"], "dates": updated_dates},
        )
        
        # Store memory if not completed (future date)
        if not new_entry["completed"]:
            memory_text_parts = [
                f"Upcoming date with {person['name']} at {request.where.strip()}",
                f"on {when_iso}",
            ]
            if request.notes:
                memory_text_parts.append(f"Notes: {request.notes.strip()}")
            if request.learnings:
                memory_text_parts.append(f"Learnings: {request.learnings.strip()}")
            
            memory_tags_str = person.get("memory_tags", "")
            memory_tags_list = []
            if memory_tags_str:
                memory_tags_list = [tag.strip() for tag in memory_tags_str.split(",") if tag.strip()]
            else:
                memory_tags_list = [person["name"].lower()]
            
            await store_memory_entries(
                [
                    {
                        "text": ". ".join(memory_text_parts),
                        "memory_type": "episodic",
                        "event_date": when_iso,
                        "topics": ["date-log", "upcoming-date"] + memory_tags_list,
                        "entities": [person["name"]],
                    }
                ]
            )
        
        return {"success": True, "data": new_entry}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create date: {e}")

@app.put("/calendar/dates/{date_id}")
async def update_calendar_date(date_id: str, request: UpdateDateRequest):
    """Update an existing date."""
    try:
        from mcp_client import execute_mcp_tool
        import json
        
        # Find the date across all people
        result = await execute_mcp_tool("redis-dating_list_people", {
            "include_details": False
        })
        people: List[Dict[str, Any]] = []
        if result.get("success") and result.get("result"):
            payload = extract_json_chunk(result["result"])
            if isinstance(payload, dict) and "data" in payload:
                people = payload["data"]
            elif isinstance(payload, list):
                people = payload
        
        found_person = None
        found_date_index = -1
        
        for person in people:
            dates = person.get("dates", [])
            if isinstance(dates, str) and dates:
                try:
                    dates = json.loads(dates)
                except json.JSONDecodeError:
                    dates = []
            if not isinstance(dates, list):
                dates = []
            
            for idx, date_entry in enumerate(dates):
                if isinstance(date_entry, dict) and date_entry.get("id") == date_id:
                    found_person = person
                    found_date_index = idx
                    break
            
            if found_person:
                break
        
        if not found_person or found_date_index == -1:
            raise HTTPException(status_code=404, detail="Date not found")
        
        # Get the date entry
        dates = found_person.get("dates", [])
        if isinstance(dates, str) and dates:
            try:
                dates = json.loads(dates)
            except json.JSONDecodeError:
                dates = []
        if not isinstance(dates, list):
            dates = []
        
        date_entry = dict(dates[found_date_index])
        
        # Update fields
        if request.where is not None:
            date_entry["where"] = request.where.strip()
        if request.when is not None:
            when_iso = coerce_iso_datetime(request.when)
            if not when_iso:
                raise HTTPException(status_code=400, detail="Invalid date/time provided")
            date_entry["when"] = when_iso
        if request.notes is not None:
            date_entry["notes"] = request.notes
        if request.learnings is not None:
            date_entry["learnings"] = request.learnings
        if request.completed is not None:
            date_entry["completed"] = request.completed
        
        # Ensure person_name is set
        if "person_name" not in date_entry:
            date_entry["person_name"] = found_person.get("name", "")
        
        # Update the dates array
        dates[found_date_index] = date_entry
        
        # Update person record
        await execute_mcp_tool(
            "redis-dating_update_person",
            {"name": found_person["name"], "dates": dates},
        )
        
        return {"success": True, "data": date_entry}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update date: {e}")

@app.delete("/calendar/dates/{date_id}")
async def delete_calendar_date(date_id: str):
    """Delete a date."""
    try:
        from mcp_client import execute_mcp_tool
        import json
        
        # Find the date across all people
        result = await execute_mcp_tool("redis-dating_list_people", {
            "include_details": False
        })
        people: List[Dict[str, Any]] = []
        if result.get("success") and result.get("result"):
            payload = extract_json_chunk(result["result"])
            if isinstance(payload, dict) and "data" in payload:
                people = payload["data"]
            elif isinstance(payload, list):
                people = payload
        
        found_person = None
        found_date_index = -1
        
        for person in people:
            dates = person.get("dates", [])
            if isinstance(dates, str) and dates:
                try:
                    dates = json.loads(dates)
                except json.JSONDecodeError:
                    dates = []
            if not isinstance(dates, list):
                dates = []
            
            for idx, date_entry in enumerate(dates):
                if isinstance(date_entry, dict) and date_entry.get("id") == date_id:
                    found_person = person
                    found_date_index = idx
                    break
            
            if found_person:
                break
        
        if not found_person or found_date_index == -1:
            raise HTTPException(status_code=404, detail="Date not found")
        
        # Get the dates array
        dates = found_person.get("dates", [])
        if isinstance(dates, str) and dates:
            try:
                dates = json.loads(dates)
            except json.JSONDecodeError:
                dates = []
        if not isinstance(dates, list):
            dates = []
        
        # Remove the date
        dates.pop(found_date_index)
        
        # Update person record
        await execute_mcp_tool(
            "redis-dating_update_person",
            {"name": found_person["name"], "dates": dates},
        )
        
        return {"success": True, "message": "Date deleted"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to delete date: {e}")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

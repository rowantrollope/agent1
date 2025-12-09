"""
MCP Client for connecting to external MCP servers.

This module provides functionality to connect to and interact with
Model Context Protocol (MCP) servers running as external processes.
"""

import asyncio
import json
import os
import subprocess
import sys
from typing import Dict, List, Any, Optional, Union
import logging

# Try to import MCP - if not available, provide graceful degradation
try:
    from mcp import ClientSession, StdioServerParameters
    from mcp.client.stdio import stdio_client
    MCP_AVAILABLE = True
except ImportError:
    MCP_AVAILABLE = False
    ClientSession = None
    StdioServerParameters = None
    stdio_client = None
    print("Warning: MCP not available. Install with: pip install mcp")

logger = logging.getLogger(__name__)

class MCPClientManager:
    """Manager for MCP server connections and tool execution."""

    def __init__(self):
        self.servers: Dict[str, Dict[str, Any]] = {}
        self.sessions: Dict[str, Any] = {}
        self.stdio_contexts: Dict[str, Any] = {}

    def add_server(self, name: str, server_path: str, args: List[str] = None,
                   env: Dict[str, str] = None, python_path: str = None, command: str = None):
        """
        Add an MCP server configuration.

        Args:
            name: Server identifier
            server_path: Path to the server script or executable
            args: Additional arguments for the server
            env: Environment variables for the server
            python_path: Python executable path (defaults to sys.executable) - deprecated, use command instead
            command: Command to run (e.g., 'python', 'node') - defaults to sys.executable
        """
        if not MCP_AVAILABLE:
            logger.warning(f"Cannot add server {name}: MCP not available")
            return

        # Determine the command to use
        if command:
            exec_path = command
        elif python_path:
            exec_path = python_path
        else:
            exec_path = sys.executable

        self.servers[name] = {
            'path': server_path,
            'args': args or [],
            'env': env or {},
            'command': exec_path,
            'connected': False
        }

    async def connect_server(self, name: str) -> bool:
        """
        Connect to an MCP server by spawning the server process.

        Args:
            name: Server identifier

        Returns:
            bool: True if connection successful
        """
        if not MCP_AVAILABLE:
            logger.error(f"Cannot connect to server {name}: MCP not available")
            return False

        if name not in self.servers:
            logger.error(f"Server {name} not configured")
            return False

        server_config = self.servers[name]
        server_path = server_config['path']
        
        # Check if server file exists
        if not os.path.exists(server_path):
            logger.error(f"MCP server file not found: {server_path}")
            return False

        try:
            # Prepare server parameters to spawn the process
            exec_command = server_config.get('command', sys.executable)
            command = [exec_command, server_path] + server_config['args']
            env = {**os.environ, **server_config['env']}
            
            logger.info(f"Starting MCP server: {' '.join(command)}")
            
            # Create stdio server parameters
            server_params = StdioServerParameters(
                command=command[0],  # Executable (python, node, etc.)
                args=command[1:],     # Script path and args
                env=env
            )

            # Create stdio client - this spawns the server process
            stdio_context = stdio_client(server_params)
            read_stream, write_stream = await stdio_context.__aenter__()
            
            # Create and enter the session context
            session = ClientSession(read_stream, write_stream)
            await session.__aenter__()

            # Initialize the server connection
            await session.initialize()

            # Store both session and stdio context for cleanup
            self.sessions[name] = session
            self.stdio_contexts[name] = stdio_context
            self.servers[name]['connected'] = True

            logger.info(f"Successfully connected to MCP server: {name}")
            return True

        except Exception as e:
            logger.error(f"Failed to connect to server {name}: {str(e)}")
            import traceback
            logger.debug(f"Full traceback: {traceback.format_exc()}")
            return False

    async def disconnect_server(self, name: str):
        """Disconnect from an MCP server and cleanup resources."""
        import asyncio
        errors = []
        
        # Close session
        if name in self.sessions:
            try:
                session = self.sessions[name]
                await session.__aexit__(None, None, None)
                del self.sessions[name]
            except (asyncio.CancelledError, RuntimeError) as e:
                # Ignore cancellation errors during shutdown
                if "cancel scope" not in str(e).lower():
                    errors.append(f"Error closing session: {e}")
            except Exception as e:
                errors.append(f"Error closing session: {e}")
                
        # Close stdio context
        if name in self.stdio_contexts:
            try:
                stdio_context = self.stdio_contexts[name]
                await stdio_context.__aexit__(None, None, None)
                del self.stdio_contexts[name]
            except (asyncio.CancelledError, RuntimeError) as e:
                # Ignore cancellation errors during shutdown
                if "cancel scope" not in str(e).lower():
                    errors.append(f"Error closing stdio context: {e}")
            except Exception as e:
                errors.append(f"Error closing stdio context: {e}")
        
        if name in self.servers:
            self.servers[name]['connected'] = False
            
        if errors:
            error_msg = f"Errors disconnecting from server {name}: {'; '.join(errors)}"
            logger.error(error_msg)
        else:
            logger.info(f"Successfully disconnected from MCP server: {name}")

    async def get_server_tools(self, name: str) -> List[Dict[str, Any]]:
        """
        Get available tools from an MCP server.

        Args:
            name: Server identifier

        Returns:
            List of tool definitions
        """
        if name not in self.sessions:
            if not await self.connect_server(name):
                return []

        try:
            session = self.sessions[name]
            tools_response = await session.list_tools()

            # Convert MCP tools to OpenAI function format
            openai_tools = []
            for tool in tools_response.tools:
                openai_tool = {
                    "type": "function",
                    "function": {
                        "name": f"{name}_{tool.name}",  # Prefix with server name
                        "description": tool.description,
                        "parameters": tool.inputSchema or {
                            "type": "object",
                            "properties": {}
                        }
                    }
                }
                openai_tools.append(openai_tool)

            return openai_tools

        except Exception as e:
            logger.error(f"Error getting tools from server {name}: {e}")
            return []

    async def call_tool(self, server_name: str, tool_name: str,
                       arguments: Dict[str, Any]) -> Dict[str, Any]:
        """
        Call a tool on an MCP server.

        Args:
            server_name: Server identifier
            tool_name: Tool name (without server prefix)
            arguments: Tool arguments

        Returns:
            Tool execution result
        """
        if server_name not in self.sessions:
            if not await self.connect_server(server_name):
                return {"error": f"Could not connect to server {server_name}"}

        try:
            session = self.sessions[server_name]
            result = await session.call_tool(tool_name, arguments)

            # Extract text content from MCP result
            if hasattr(result, 'content') and result.content:
                content_text = ""
                for content in result.content:
                    if hasattr(content, 'text'):
                        content_text += content.text
                    elif isinstance(content, str):
                        content_text += content

                return {
                    "success": True,
                    "result": content_text,
                    "raw_result": result
                }
            else:
                return {
                    "success": True,
                    "result": str(result),
                    "raw_result": result
                }

        except Exception as e:
            error_msg = str(e)
            # Check if this is the background_tasks error
            if "background_tasks" in error_msg:
                logger.warning(f"Tool {tool_name} on server {server_name} requires FastAPI background_tasks which is not available via MCP. This tool cannot be used.")
                return {
                    "error": f"Tool {tool_name} requires FastAPI dependencies that are not available via MCP. Please use an alternative tool.",
                    "tool_name": tool_name,
                    "server_name": server_name
                }
            logger.error(f"Error calling tool {tool_name} on server {server_name}: {e}")
            return {"error": error_msg}

    async def disconnect_all(self):
        """Disconnect from all MCP servers."""
        for name in list(self.sessions.keys()):
            await self.disconnect_server(name)

# Global MCP client manager instance
mcp_manager = MCPClientManager()

def setup_mcp_server(name: str, server_path: str, env_vars: Dict[str, str] = None, python_path: str = None, command: str = None, args: List[str] = None):
    """
    Setup an MCP server for spawning.

    Args:
        name: Server name
        server_path: Path to the MCP server script
        env_vars: Additional environment variables
        python_path: Python executable path (deprecated, use command instead)
        command: Command to run (e.g., 'python', 'node')
        args: Additional arguments for the server
    """
    logger.info(f"Setting up MCP server '{name}' at path: {server_path}")
    
    if not os.path.exists(server_path):
        logger.error(f"MCP server script not found: {server_path}")
        return False
    
    # Ensure the server script is executable (only for Python scripts)
    if not command or command == 'python' or command == sys.executable:
        try:
            os.chmod(server_path, 0o755)
        except Exception as e:
            logger.warning(f"Could not make server script executable: {e}")
    
    env = env_vars or {}
    
    mcp_manager.add_server(
        name=name,
        server_path=server_path,
        args=args or [],
        env=env,
        command=command or python_path
    )
    
    logger.info(f"MCP server '{name}' configured")
    return True

# Legacy function for backward compatibility
def setup_localmcp_server(server_path: str, env_vars: Dict[str, str] = None):
    """
    Setup the localmcp MCP server (legacy function).
    """
    default_env = {
        "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY", ""),
    }

    if env_vars:
        default_env.update(env_vars)

    return setup_mcp_server("localmcp", server_path, default_env)

async def get_mcp_tools() -> List[Dict[str, Any]]:
    """Get all available MCP tools in OpenAI function format."""
    all_tools = []

    for server_name in mcp_manager.servers:
        tools = await mcp_manager.get_server_tools(server_name)
        all_tools.extend(tools)

    return all_tools

async def execute_mcp_tool(function_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute an MCP tool by function name.

    Args:
        function_name: Function name (format: servername_toolname)
        arguments: Tool arguments

    Returns:
        Tool execution result
    """
    # Parse server name and tool name
    if '_' not in function_name:
        return {"error": "Invalid MCP function name format"}

    parts = function_name.split('_', 1)
    server_name = parts[0]
    tool_name = parts[1]

    return await mcp_manager.call_tool(server_name, tool_name, arguments)

# Cleanup function for graceful shutdown
async def cleanup_mcp():
    """Cleanup MCP connections."""
    await mcp_manager.disconnect_all()

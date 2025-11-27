#!/usr/bin/env python3
import sys
import os
# Add the agent directory to path so we can find the venv
agent_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'agent')
venv_path = os.path.join(agent_dir, 'venv', 'lib', 'python3.12', 'site-packages')
if os.path.exists(venv_path):
    sys.path.insert(0, venv_path)
"""
Simple Test MCP Server for DateGPT

This is a basic MCP server implementation that provides simple tools
for testing the MCP integration in DateGPT.
"""

import asyncio
import logging
from typing import Any, Dict, List, Optional
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import (
    Tool,
    TextContent,
    CallToolRequest,
    CallToolResult,
    ListToolsRequest,
    ListToolsResult,
)

# Configure logging
logging.basicConfig(level=logging.DEBUG, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("test-mcp-server")

# Create server instance
server = Server("test-mcp-server")

# Define available tools
@server.list_tools()
async def list_tools() -> List[Tool]:
    """List available tools."""
    return [
        Tool(
            name="get_secret",
            description="Get a secret message",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        )
    ]


@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls."""
    logger.info(f"Tool called: {name} with arguments: {arguments}")

    try:
        if name == "get_secret":
            result = "The secret is 42"
        else:
            result = f"Unknown tool: {name}"

    except Exception as e:
        result = f"Error executing tool {name}: {str(e)}"
        logger.error(result)

    logger.info(f"Tool result: {result}")
    return [TextContent(type="text", text=result)]

async def main():
    """Run the MCP server."""
    logger.info("Starting local (test) MCP Server...")

    # Run the server with stdio transport
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())

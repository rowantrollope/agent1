#!/usr/bin/env python3
"""
Python wrapper for agent-memory-server MCP server.
This wrapper ensures the agent-memory-server virtual environment is properly activated.
"""

import os
import sys
import subprocess

def main():
    # Set the agent-memory-server project directory
    server_dir = "/Users/rowantrollope/git/agent-memory-server"
    
    # Check if server directory exists
    if not os.path.exists(server_dir):
        print(f"Error: agent-memory-server directory not found: {server_dir}", file=sys.stderr)
        sys.exit(1)
    
    # Change to server directory for uv to find the project
    os.chdir(server_dir)
    
    # Check if virtual environment exists
    venv_path = os.path.join(server_dir, ".venv")
    if not os.path.exists(venv_path):
        print(f"Error: Virtual environment not found in {venv_path}", file=sys.stderr)
        sys.exit(1)
    
    # Execute the MCP server using uv run
    # Run: uv run agent-memory mcp --mode stdio
    cmd = ["uv", "run", "agent-memory", "mcp", "--mode", "stdio"] + sys.argv[1:]
    
    # Set up environment variables
    env = os.environ.copy()
    
    # For MCP stdio mode, we need to use os.execv to replace the process
    # This ensures proper stdio handling
    try:
        os.execvp("uv", cmd)
    except FileNotFoundError:
        print(f"Error: uv not found. Please install uv: pip install uv", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
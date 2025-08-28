#!/usr/bin/env python3
"""
Python wrapper for remem MCP server.
This wrapper ensures the remem virtual environment is properly activated.
"""

import os
import sys
import subprocess

def main():
    # Set the remem project directory
    remem_dir = "/Users/rowantrollope/git/remem"
    
    # Change to remem directory
    os.chdir(remem_dir)
    
    # Check if virtual environment exists
    venv_path = os.path.join(remem_dir, ".venv")
    if not os.path.exists(venv_path):
        print(f"Error: Virtual environment not found in {venv_path}", file=sys.stderr)
        sys.exit(1)
    
    # Use the Python from remem's virtual environment
    python_path = os.path.join(venv_path, "bin", "python")
    if not os.path.exists(python_path):
        print(f"Error: Python executable not found: {python_path}", file=sys.stderr)
        sys.exit(1)
    
    # Path to the MCP server script
    server_script = os.path.join(remem_dir, "mcp_server.py")
    if not os.path.exists(server_script):
        print(f"Error: MCP server script not found: {server_script}", file=sys.stderr)
        sys.exit(1)
    
    # Execute the MCP server with the proper Python environment
    # Pass through all command line arguments
    cmd = [python_path, server_script] + sys.argv[1:]
    
    # Set up environment variables
    env = os.environ.copy()
    
    # Execute with execve to replace current process (important for MCP stdio)
    os.execve(python_path, cmd, env)

if __name__ == "__main__":
    main()
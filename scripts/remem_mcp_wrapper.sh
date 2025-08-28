#!/bin/bash

# Wrapper script for remem MCP server
# This script ensures the remem virtual environment is properly activated

# Set the remem project directory
REMEM_DIR="/Users/rowantrollope/git/remem"

# Change to remem directory
cd "$REMEM_DIR" || {
    echo "Error: Could not change to remem directory: $REMEM_DIR" >&2
    exit 1
}

# Check if virtual environment exists
if [ ! -d ".venv" ]; then
    echo "Error: Virtual environment not found in $REMEM_DIR/.venv" >&2
    exit 1
fi

# Activate virtual environment and run the MCP server
source .venv/bin/activate

# Ensure numpy is available (quick check)
python -c "import numpy" 2>/dev/null || {
    echo "Error: Required dependencies not installed in remem environment" >&2
    exit 1
}

# Run the MCP server with proper environment
exec python mcp_server.py "$@"
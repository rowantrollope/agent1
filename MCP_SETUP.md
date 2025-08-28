# MCP Server Integration Setup

This guide explains how to integrate external MCP (Model Context Protocol) servers with your Agent1 Python backend.

## Overview

Agent1 can connect to external MCP servers running as separate processes, allowing you to extend the agent's capabilities without importing large codebases into this project. This is perfect for connecting to complex systems like your remem server.

## Prerequisites

1. **Python 3.8+** installed
2. **MCP package** installed: `pip install mcp`
3. **Your MCP server** (e.g., remem) running in a separate project

## Quick Setup

### 1. Install MCP Dependencies

```bash
cd agent
pip install -r requirements.txt
```

### 2. Run the MCP Setup Script

```bash
cd agent
python setup_mcp.py
```

This will:
- Check for MCP dependencies
- Prompt you for your MCP server paths
- Test connections
- Save configuration

### 3. Configure Your Remem Server Path

When prompted, provide the full path to your remem MCP server:
```
Example: /Users/yourusername/projects/remem/mcp_server.py
```

### 4. Start Your Servers

1. **Start your MCP server** (in its own terminal):
   ```bash
   cd /path/to/your/remem/project
   python mcp_server.py
   ```

2. **Start Agent1 backend**:
   ```bash
   npm run python:start
   ```

3. **Start Agent1 frontend**:
   ```bash
   npm run dev
   ```

## Manual Configuration

### Environment Variables

Add to your `.env.local`:

```env
# MCP Server Configuration
REMEM_SERVER_PATH=/path/to/your/remem/mcp_server.py

# Required for remem server
OPENAI_API_KEY=your_openai_api_key
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_DB=0

# Optional debug settings
MEMORY_DEBUG=false
MEMORY_VERBOSE=false
```

### Manual Server Registration

If you prefer to configure servers programmatically:

```python
from agent import PythonAgent
from mcp_client import mcp_manager

# Create agent
agent = PythonAgent(api_key="your_key")

# Setup MCP server
agent.setup_mcp_server(
    name="remem",
    server_path="/path/to/your/remem/mcp_server.py",
    env_vars={
        "OPENAI_API_KEY": "your_key",
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "REDIS_DB": "0"
    }
)
```

## Adding More MCP Servers

### 1. Update Configuration

Edit `agent/mcp_config.py`:

```python
MCP_SERVERS = {
    "remem": {
        "enabled": True,
        "path": "/path/to/remem/mcp_server.py",
        # ... existing config
    },
    
    "your_server": {
        "enabled": True,
        "path": "/path/to/your/other/server.py",
        "description": "Your custom MCP server",
        "env_vars": {
            "API_KEY": "your_api_key",
            # ... other env vars
        },
        "args": [],
        "timeout": 30
    }
}
```

### 2. Register with Agent

```python
agent.setup_mcp_server(
    name="your_server",
    server_path="/path/to/your/other/server.py",
    env_vars={"API_KEY": "your_key"}
)
```

## Usage

Once configured, your agent will automatically have access to all MCP server tools:

### In Chat Interface

```
User: "Store this information in memory: Python is awesome"
Agent: [Uses remem_store tool automatically]

User: "What did I tell you about Python?"
Agent: [Uses remem_recall tool automatically]
```

### Available Endpoints

Check MCP status:
```bash
curl http://localhost:8000/mcp/status
```

Manual server connection:
```bash
curl -X POST http://localhost:8000/mcp/connect/remem
```

## Troubleshooting

### Common Issues

#### "MCP not available" Error
```bash
pip install mcp
```

#### "Server path does not exist"
- Verify the full path to your MCP server file
- Ensure the file has execute permissions
- Check that the path doesn't contain spaces or special characters

#### Connection Timeout
- Increase timeout in `mcp_config.py`
- Check that your MCP server starts properly
- Verify all required environment variables are set

#### Tool Not Found
- Check that your MCP server implements the expected tools
- Verify the server starts without errors
- Use the `/mcp/status` endpoint to check available tools

### Debug Mode

Enable debug logging:
```env
MEMORY_DEBUG=true
MEMORY_VERBOSE=true
```

### Testing Connection

Test your MCP server independently:
```bash
cd /path/to/your/remem/project
python -c "
import subprocess
import sys
proc = subprocess.Popen([sys.executable, 'mcp_server.py'], 
                       stdin=subprocess.PIPE, 
                       stdout=subprocess.PIPE)
print('MCP server started successfully')
proc.terminate()
"
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│  Frontend       │    │  Agent1 Python   │    │  External MCP   │
│  (Next.js)      │◄──►│  Backend         │◄──►│  Server         │
│                 │    │  (FastAPI)       │    │  (remem, etc.)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

### Communication Flow

1. **Frontend** sends user message to **Python Backend**
2. **Python Backend** processes message with OpenAI
3. **OpenAI** decides to use MCP tools
4. **Python Backend** calls **External MCP Server**
5. **MCP Server** returns results
6. **Python Backend** sends final response to **Frontend**

## Security Considerations

### Environment Variables
- Never commit API keys to version control
- Use `.env.local` for sensitive configuration
- Ensure MCP servers validate inputs properly

### Network Security
- MCP servers communicate via stdio (secure by default)
- No network ports exposed between Agent1 and MCP servers
- All external API calls (OpenAI, Redis) use standard security practices

### Process Isolation
- MCP servers run as separate processes
- Failures in MCP servers don't crash Agent1
- Easy to restart individual servers independently

## Performance Tips

### Connection Pooling
- MCP connections are maintained during the session
- Servers are connected on-demand
- Automatic reconnection on failures

### Caching
- Tool definitions are cached after first load
- Connection status is tracked to avoid repeated attempts
- Consider implementing result caching in your MCP servers

### Monitoring
- Check `/mcp/status` endpoint regularly
- Monitor MCP server process health
- Log tool usage and performance metrics

## Next Steps

1. **Configure your remem server path** using the setup script
2. **Test the connection** using the web interface
3. **Try some memory operations** to verify everything works
4. **Add more MCP servers** as needed for your workflow

## Support

- Check the `mcp_config.py` file for configuration options
- Use `python setup_mcp.py` to reconfigure servers
- Monitor the console output for connection status
- Use the `/mcp/status` API endpoint for runtime status
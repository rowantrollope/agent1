# Claude Desktop MCP Configuration

This guide shows how to configure `agent-memory-server` to work with Claude Desktop.

## Prerequisites

1. **Claude Desktop** installed
2. **agent-memory-server** project at `/Users/rowantrollope/git/agent-memory-server`
3. **uv** installed (`pip install uv` or `brew install uv`)

## Configuration Steps

### 1. Locate Claude Desktop Config File

On macOS, the config file is located at:
```
~/Library/Application Support/Claude/claude_desktop_config.json
```

If the file doesn't exist, create it.

### 2. Add agent-memory-server Configuration

Open the config file and add the following configuration:

```json
{
  "mcpServers": {
    "agent-memory-server": {
      "command": "uv",
      "args": [
        "run",
        "agent-memory",
        "mcp",
        "--mode",
        "stdio"
      ],
      "cwd": "/Users/rowantrollope/git/agent-memory-server",
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key_here"
      }
    }
  }
}
```

**Important Notes:**
- Replace `"your_openai_api_key_here"` with your actual OpenAI API key
- The `cwd` field ensures the command runs from the correct directory
- The `uv run agent-memory mcp --mode stdio` command is what the wrapper script executes

### 3. Alternative: Use the Wrapper Script

If you prefer to use the wrapper script directly, you can configure it like this:

```json
{
  "mcpServers": {
    "agent-memory-server": {
      "command": "python3",
      "args": [
        "/Users/rowantrollope/git/agent1/scripts/agent_memory_server_mcp_wrapper.py"
      ],
      "env": {
        "OPENAI_API_KEY": "your_openai_api_key_here"
      }
    }
  }
}
```

**Note:** Make sure the wrapper script is executable:
```bash
chmod +x /Users/rowantrollope/git/agent1/scripts/agent_memory_server_mcp_wrapper.py
```

### 4. Restart Claude Desktop

After saving the configuration file:
1. Quit Claude Desktop completely
2. Reopen Claude Desktop
3. The MCP server should now be available

### 5. Verify Connection

Once Claude Desktop is running:
1. Open a new conversation
2. Check if `agent-memory-server` tools are available
3. You can test by asking Claude to use a memory tool

## Troubleshooting

### Server Not Connecting

1. **Check uv is installed:**
   ```bash
   which uv
   uv --version
   ```

2. **Verify agent-memory-server directory exists:**
   ```bash
   ls -la /Users/rowantrollope/git/agent-memory-server
   ```

3. **Test the command manually:**
   ```bash
   cd /Users/rowantrollope/git/agent-memory-server
   uv run agent-memory mcp --mode stdio
   ```
   (This should start the server - you can Ctrl+C to stop it)

4. **Check Claude Desktop logs:**
   - On macOS: `~/Library/Logs/Claude/`
   - Look for MCP-related errors

### Environment Variables

If `agent-memory-server` needs additional environment variables (like database connections), add them to the `env` section:

```json
{
  "mcpServers": {
    "agent-memory-server": {
      "command": "uv",
      "args": [
        "run",
        "agent-memory",
        "mcp",
        "--mode",
        "stdio"
      ],
      "cwd": "/Users/rowantrollope/git/agent-memory-server",
      "env": {
        "OPENAI_API_KEY": "your_key",
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379",
        "POSTGRES_HOST": "localhost",
        "POSTGRES_PORT": "5432"
      }
    }
  }
}
```

### Multiple MCP Servers

You can configure multiple MCP servers in the same config file:

```json
{
  "mcpServers": {
    "agent-memory-server": {
      "command": "uv",
      "args": ["run", "agent-memory", "mcp", "--mode", "stdio"],
      "cwd": "/Users/rowantrollope/git/agent-memory-server",
      "env": {
        "OPENAI_API_KEY": "your_key"
      }
    },
    "redis-dating": {
      "command": "python3",
      "args": ["/Users/rowantrollope/git/agent1/mcp_servers/redis-dating/mcp_server.py"],
      "env": {
        "REDIS_HOST": "localhost",
        "REDIS_PORT": "6379"
      }
    }
  }
}
```

## Configuration File Location by OS

- **macOS**: `~/Library/Application Support/Claude/claude_desktop_config.json`
- **Windows**: `%APPDATA%\Claude\claude_desktop_config.json`
- **Linux**: `~/.config/Claude/claude_desktop_config.json`

## Additional Resources

- [MCP Documentation](https://modelcontextprotocol.io/)
- [Claude Desktop MCP Guide](https://docs.anthropic.com/claude/docs/mcp)


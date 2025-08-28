"""
MCP Server Configuration

This file manages configuration for external MCP servers that the agent can connect to.
Configuration is now loaded from mcp_servers.json file.
"""

import json
import os
from typing import Dict, Any, Optional

# Path to the JSON configuration file
CONFIG_FILE = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mcp_servers.json")

# Default path to the built-in localmcp MCP server
DEFAULT_LOCALMCP_PATH = os.path.join(os.path.dirname(os.path.dirname(__file__)), "mcp_servers", "localmcp", "mcp_server.py")

def _expand_env_vars(value: str, env_vars: Dict[str, str]) -> str:
    """Expand environment variable placeholders in a string."""
    if not isinstance(value, str):
        return value
    
    # Replace ${VAR_NAME} with actual environment variable values
    for var_name, var_value in env_vars.items():
        placeholder = f"${{{var_name}}}"
        if placeholder in value:
            actual_value = os.getenv(var_name, var_value)
            value = value.replace(placeholder, actual_value)
    
    return value

def _load_mcp_config() -> Dict[str, Any]:
    """Load MCP server configuration from JSON file."""
    try:
        with open(CONFIG_FILE, 'r') as f:
            config = json.load(f)
        
        # Expand environment variables in server configurations
        global_env = config.get('global_env_vars', {})
        servers = config.get('servers', {})
        
        # Process each server configuration
        for server_name, server_config in servers.items():
            # Expand path
            if 'path' in server_config:
                server_config['path'] = _expand_env_vars(server_config['path'], global_env)
            
            # Expand environment variables in env_vars
            if 'env_vars' in server_config:
                for env_key, env_value in server_config['env_vars'].items():
                    server_config['env_vars'][env_key] = _expand_env_vars(env_value, global_env)
        
        return servers
        
    except FileNotFoundError:
        print(f"Warning: MCP configuration file not found: {CONFIG_FILE}")
        # Return default configuration
        return {
            "localmcp": {
                "enabled": True,
                "path": DEFAULT_LOCALMCP_PATH,
                "description": "Built-in local MCP server with basic tools",
                "env_vars": {
                    "OPENAI_API_KEY": os.getenv("OPENAI_API_KEY", ""),
                },
                "args": [],
                "timeout": 30
            }
        }
    except json.JSONDecodeError as e:
        print(f"Error parsing MCP configuration file: {e}")
        return {}

# Load configuration on module import
MCP_SERVERS = _load_mcp_config()

def reload_config():
    """Reload MCP server configuration from JSON file."""
    global MCP_SERVERS
    MCP_SERVERS = _load_mcp_config()
    return MCP_SERVERS

def get_server_config(server_name: str) -> Optional[Dict[str, Any]]:
    """Get configuration for a specific MCP server."""
    return MCP_SERVERS.get(server_name)

def get_enabled_servers() -> Dict[str, Dict[str, Any]]:
    """Get all enabled MCP servers."""
    return {name: config for name, config in MCP_SERVERS.items() if config.get("enabled", False)}

def is_server_configured(server_name: str) -> bool:
    """Check if a server is properly configured."""
    config = get_server_config(server_name)
    if not config or not config.get("enabled", False):
        return False

    # Check if path is set
    if not config.get("path"):
        return False

    # Check if path exists
    path = config["path"]
    if not os.path.exists(path):
        return False

    return True

def validate_configuration() -> Dict[str, Any]:
    """Validate MCP server configuration and return status."""
    status = {
        "valid_servers": [],
        "invalid_servers": [],
        "warnings": []
    }

    for server_name, config in MCP_SERVERS.items():
        if not config.get("enabled", False):
            status["warnings"].append(f"{server_name}: Disabled")
            continue

        if is_server_configured(server_name):
            status["valid_servers"].append(server_name)
            
            # Check if it's the default localmcp server
            if server_name == "localmcp" and config["path"] == DEFAULT_LOCALMCP_PATH:
                if os.path.exists(config["path"]):
                    status["warnings"].append(f"{server_name}: Using built-in server at {config['path']}")
        else:
            status["invalid_servers"].append(server_name)

            # Add specific warnings
            if not config.get("path"):
                status["warnings"].append(f"{server_name}: No path configured")
            elif not os.path.exists(config["path"]):
                status["warnings"].append(f"{server_name}: Server script not found: {config['path']}")
                if server_name == "localmcp":
                    status["warnings"].append(f"   Expected built-in server at: {DEFAULT_LOCALMCP_PATH}")

    return status

# Helper function to set the localmcp server path programmatically
def set_localmcp_server_path(path: str):
    """Set the localmcp server path."""
    if "localmcp" in MCP_SERVERS:
        MCP_SERVERS["localmcp"]["path"] = path
        MCP_SERVERS["localmcp"]["enabled"] = True

    # Also set environment variable
    os.environ["LOCALMCP_SERVER_PATH"] = path

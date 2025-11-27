"""
MCP Setup Script

This script helps initialize and configure MCP server connections for the DateGPT project.
Run this script to set up your MCP servers before starting the agent.
"""

import os
import sys
import asyncio
from typing import Dict, Any
from mcp_config import MCP_SERVERS, validate_configuration, set_remem_server_path
from mcp_client import mcp_manager


def print_banner():
    """Print setup banner."""
    print("=" * 60)
    print("🔧 DateGPT MCP Server Setup")
    print("=" * 60)


def check_dependencies():
    """Check if required dependencies are installed."""
    try:
        import mcp
        print("✅ MCP package is available")
        return True
    except ImportError:
        print("❌ MCP package not found")
        print("   Install with: pip install mcp")
        return False


def prompt_for_remem_path() -> str:
    """Prompt user for remem server path."""
    print("\n📍 Remem Server Configuration")
    print("Please provide the path to your remem MCP server.")
    print("Example: /path/to/your/remem-project/mcp_server.py")

    while True:
        path = input("\nEnter remem server path: ").strip()

        if not path:
            print("❌ Path cannot be empty")
            continue

        if not os.path.exists(path):
            print(f"❌ Path does not exist: {path}")
            retry = input("Would you like to try again? (y/n): ").strip().lower()
            if retry != 'y':
                return ""
            continue

        if not path.endswith('.py'):
            print("⚠️  Warning: Path doesn't end with .py, but continuing...")

        return path


async def test_server_connection(server_name: str, config: Dict[str, Any]) -> bool:
    """Test connection to an MCP server."""
    try:
        print(f"🔌 Testing connection to {server_name}...")

        # Add server to manager
        mcp_manager.add_server(
            name=server_name,
            server_path=config["path"],
            args=config.get("args", []),
            env=config.get("env_vars", {})
        )

        # Try to connect
        success = await mcp_manager.connect_server(server_name)

        if success:
            print(f"✅ Successfully connected to {server_name}")

            # Try to get tools
            tools = await mcp_manager.get_server_tools(server_name)
            print(f"📋 Found {len(tools)} tools: {[tool['function']['name'] for tool in tools]}")

            # Disconnect
            await mcp_manager.disconnect_server(server_name)
            return True
        else:
            print(f"❌ Failed to connect to {server_name}")
            return False

    except Exception as e:
        print(f"❌ Error testing {server_name}: {e}")
        return False


def save_configuration():
    """Save current configuration to environment file."""
    try:
        env_file_path = "../.env.local"

        # Read existing .env.local if it exists
        env_vars = {}
        if os.path.exists(env_file_path):
            with open(env_file_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        env_vars[key] = value

        # Add MCP configuration
        for server_name, config in MCP_SERVERS.items():
            if config.get("enabled") and config.get("path"):
                env_key = f"{server_name.upper()}_SERVER_PATH"
                env_vars[env_key] = config["path"]

        # Write back to .env.local
        with open(env_file_path, 'w') as f:
            f.write("# DateGPT Environment Configuration\n")
            f.write("# This file is automatically updated by setup_mcp.py\n\n")

            for key, value in env_vars.items():
                f.write(f"{key}={value}\n")

        print(f"✅ Configuration saved to {env_file_path}")

    except Exception as e:
        print(f"⚠️  Could not save configuration: {e}")


async def main():
    """Main setup routine."""
    print_banner()

    # Check dependencies
    if not check_dependencies():
        print("\n❌ Setup cannot continue without required dependencies.")
        sys.exit(1)

    # Check current configuration
    print("\n🔍 Checking current configuration...")
    status = validate_configuration()

    print(f"Valid servers: {len(status['valid_servers'])}")
    print(f"Invalid servers: {len(status['invalid_servers'])}")

    if status['warnings']:
        print("\n⚠️  Warnings:")
        for warning in status['warnings']:
            print(f"   - {warning}")

    # Handle remem server setup
    if "remem" not in status['valid_servers']:
        print("\n🔧 Setting up remem server...")

        # Check if path is set in environment
        remem_path = os.getenv("REMEM_SERVER_PATH")
        if remem_path and os.path.exists(remem_path):
            print(f"Found remem path in environment: {remem_path}")
            use_env_path = input("Use this path? (y/n): ").strip().lower()
            if use_env_path == 'y':
                set_remem_server_path(remem_path)
            else:
                remem_path = prompt_for_remem_path()
                if remem_path:
                    set_remem_server_path(remem_path)
        else:
            remem_path = prompt_for_remem_path()
            if remem_path:
                set_remem_server_path(remem_path)

    # Re-validate after setup
    status = validate_configuration()

    if not status['valid_servers']:
        print("\n❌ No valid MCP servers configured. Setup incomplete.")
        return

    # Test connections
    print("\n🧪 Testing server connections...")

    for server_name in status['valid_servers']:
        config = MCP_SERVERS[server_name]
        success = await test_server_connection(server_name, config)

        if not success:
            print(f"⚠️  {server_name} connection test failed")

    # Save configuration
    print("\n💾 Saving configuration...")
    save_configuration()

    print("\n✅ MCP setup complete!")
    print("\nNext steps:")
    print("1. Start your MCP servers (e.g., the remem server)")
    print("2. Start the DateGPT backend: npm run python:start")
    print("3. Start the DateGPT frontend: npm run dev")

    print("\nYour agent will now have access to MCP server tools!")


if __name__ == "__main__":
    asyncio.run(main())

#!/Users/rowantrollope/git/agent1/agent/venv/bin/python
"""
SMS/iMessage MCP Server for DateGPT
Provides tools to send and receive SMS/iMessage through various methods.
"""

import asyncio
import json
import os
import subprocess
import sys
from typing import Any, Dict, List, Optional
import logging

# Load environment variables from .env.local
try:
    from dotenv import load_dotenv
    env_path = os.path.join(os.path.dirname(__file__), '.env.local')
    if os.path.exists(env_path):
        load_dotenv(env_path)
        logging.info(f"Loaded environment variables from {env_path}")
except ImportError:
    logging.warning("python-dotenv not available, environment variables may not be loaded")

# MCP imports
from mcp.server.models import InitializationOptions
from mcp.server import NotificationOptions, Server
from mcp.types import Resource, Tool, TextContent, ImageContent, EmbeddedResource
from mcp.server.stdio import stdio_server

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class SMSiMessageServer:
    def __init__(self):
        self.server = Server("sms-imessage")
        self.setup_handlers()

    def setup_handlers(self):
        @self.server.list_tools()
        async def handle_list_tools() -> List[Tool]:
            """List available SMS/iMessage tools."""
            return [
                Tool(
                    name="send_imessage",
                    description="Send an iMessage using AppleScript (macOS only)",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "recipient": {
                                "type": "string",
                                "description": "Phone number or email address to send message to"
                            },
                            "message": {
                                "type": "string",
                                "description": "Message text to send"
                            }
                        },
                        "required": ["recipient", "message"]
                    }
                ),
                Tool(
                    name="send_sms_twilio",
                    description="Send SMS using Twilio API",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "to_number": {
                                "type": "string",
                                "description": "Phone number to send SMS to (E.164 format)"
                            },
                            "message": {
                                "type": "string",
                                "description": "SMS message text to send"
                            }
                        },
                        "required": ["to_number", "message"]
                    }
                ),
                Tool(
                    name="get_recent_imessages",
                    description="Get recent iMessages from Messages.app (macOS only)",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "limit": {
                                "type": "integer",
                                "description": "Number of recent messages to retrieve",
                                "default": 10
                            },
                            "contact": {
                                "type": "string",
                                "description": "Optional: filter messages from specific contact",
                                "default": None
                            }
                        }
                    }
                ),
                Tool(
                    name="setup_sms_webhook",
                    description="Setup webhook for receiving SMS messages via Twilio",
                    inputSchema={
                        "type": "object",
                        "properties": {
                            "webhook_url": {
                                "type": "string",
                                "description": "URL to receive SMS webhooks"
                            },
                            "phone_number": {
                                "type": "string",
                                "description": "Twilio phone number to configure"
                            }
                        },
                        "required": ["webhook_url", "phone_number"]
                    }
                )
            ]

        @self.server.call_tool()
        async def handle_call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
            """Handle tool calls."""
            try:
                if name == "send_imessage":
                    return await self.send_imessage(arguments)
                elif name == "send_sms_twilio":
                    return await self.send_sms_twilio(arguments)
                elif name == "get_recent_imessages":
                    return await self.get_recent_imessages(arguments)
                elif name == "setup_sms_webhook":
                    return await self.setup_sms_webhook(arguments)
                else:
                    raise ValueError(f"Unknown tool: {name}")
            except Exception as e:
                logger.error(f"Error in tool {name}: {e}")
                return [TextContent(type="text", text=f"Error: {str(e)}")]

    async def send_imessage(self, args: Dict[str, Any]) -> List[TextContent]:
        """Send iMessage using AppleScript (macOS only)."""
        recipient = args["recipient"]
        message = args["message"]

        # Check if running on macOS
        if sys.platform != "darwin":
            return [TextContent(
                type="text",
                text="Error: iMessage sending is only available on macOS"
            )]

        # AppleScript to send iMessage
        applescript = f'''
        tell application "Messages"
            set targetService to 1st service whose service type = iMessage
            set targetBuddy to buddy "{recipient}" of targetService
            send "{message}" to targetBuddy
        end tell
        '''

        try:
            # Execute AppleScript
            result = subprocess.run(
                ["osascript", "-e", applescript],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                return [TextContent(
                    type="text",
                    text=f"✅ iMessage sent successfully to {recipient}"
                )]
            else:
                return [TextContent(
                    type="text",
                    text=f"❌ Failed to send iMessage: {result.stderr}"
                )]

        except subprocess.TimeoutExpired:
            return [TextContent(
                type="text",
                text="❌ Timeout: AppleScript took too long to execute"
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"❌ Error sending iMessage: {str(e)}"
            )]

    async def send_sms_twilio(self, args: Dict[str, Any]) -> List[TextContent]:
        """Send SMS using Twilio API."""
        to_number = args["to_number"]
        message = args["message"]

        # Get Twilio credentials from environment
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")
        from_number = os.getenv("TWILIO_PHONE_NUMBER")

        logger.info(f"Twilio credentials check: SID={bool(account_sid)}, Token={bool(auth_token)}, Phone={bool(from_number)}")

        if not all([account_sid, auth_token, from_number]):
            return [TextContent(
                type="text",
                text="❌ Missing Twilio credentials. Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and TWILIO_PHONE_NUMBER environment variables."
            )]

        try:
            from twilio.rest import Client

            client = Client(account_sid, auth_token)

            message_obj = client.messages.create(
                body=message,
                from_=from_number,
                to=to_number
            )

            return [TextContent(
                type="text",
                text=f"✅ SMS sent successfully to {to_number}. Message SID: {message_obj.sid}"
            )]

        except ImportError:
            return [TextContent(
                type="text",
                text="❌ Twilio library not installed. Run: pip install twilio"
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"❌ Error sending SMS: {str(e)}"
            )]

    async def get_recent_imessages(self, args: Dict[str, Any]) -> List[TextContent]:
        """Get recent iMessages from Messages.app (macOS only)."""
        limit = args.get("limit", 10)
        contact = args.get("contact")

        # Check if running on macOS
        if sys.platform != "darwin":
            return [TextContent(
                type="text",
                text="Error: iMessage reading is only available on macOS"
            )]

        # AppleScript to get recent messages
        contact_filter = f'from buddy "{contact}"' if contact else ""
        applescript = f'''
        tell application "Messages"
            set recentMessages to {{}}
            repeat with i from 1 to {limit}
                try
                    set messageText to text of message i {contact_filter}
                    set messageDate to date sent of message i {contact_filter}
                    set messageSender to handle of sender of message i {contact_filter}
                    set end of recentMessages to (messageText & " | " & messageDate & " | " & messageSender)
                on error
                    exit repeat
                end try
            end repeat
            return recentMessages as string
        end tell
        '''

        try:
            result = subprocess.run(
                ["osascript", "-e", applescript],
                capture_output=True,
                text=True,
                timeout=10
            )

            if result.returncode == 0:
                messages = result.stdout.strip()
                if messages:
                    return [TextContent(
                        type="text",
                        text=f"Recent iMessages:\n{messages}"
                    )]
                else:
                    return [TextContent(
                        type="text",
                        text="No recent messages found"
                    )]
            else:
                return [TextContent(
                    type="text",
                    text=f"❌ Failed to retrieve messages: {result.stderr}"
                )]

        except Exception as e:
            return [TextContent(
                type="text",
                text=f"❌ Error retrieving messages: {str(e)}"
            )]

    async def setup_sms_webhook(self, args: Dict[str, Any]) -> List[TextContent]:
        """Setup webhook for receiving SMS messages via Twilio."""
        webhook_url = args["webhook_url"]
        phone_number = args["phone_number"]

        # Get Twilio credentials
        account_sid = os.getenv("TWILIO_ACCOUNT_SID")
        auth_token = os.getenv("TWILIO_AUTH_TOKEN")

        if not all([account_sid, auth_token]):
            return [TextContent(
                type="text",
                text="❌ Missing Twilio credentials. Set TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN environment variables."
            )]

        try:
            from twilio.rest import Client

            client = Client(account_sid, auth_token)

            # Update phone number webhook
            incoming_phone_number = client.incoming_phone_numbers.list(
                phone_number=phone_number
            )[0]

            incoming_phone_number.update(sms_url=webhook_url)

            return [TextContent(
                type="text",
                text=f"✅ SMS webhook configured for {phone_number} -> {webhook_url}"
            )]

        except ImportError:
            return [TextContent(
                type="text",
                text="❌ Twilio library not installed. Run: pip install twilio"
            )]
        except Exception as e:
            return [TextContent(
                type="text",
                text=f"❌ Error setting up webhook: {str(e)}"
            )]

    async def run(self):
        """Run the MCP server."""
        async with stdio_server() as (read_stream, write_stream):
            await self.server.run(
                read_stream,
                write_stream,
                InitializationOptions(
                    server_name="sms-imessage",
                    server_version="1.0.0",
                    capabilities=self.server.get_capabilities(
                        notification_options=NotificationOptions(),
                        experimental_capabilities={},
                    ),
                ),
            )

async def main():
    """Main entry point."""
    server = SMSiMessageServer()
    await server.run()

if __name__ == "__main__":
    asyncio.run(main())

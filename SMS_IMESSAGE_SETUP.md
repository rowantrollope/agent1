# SMS/iMessage Integration Setup Guide

This guide explains how to set up SMS and iMessage integration with your DateGPT application using the SMS/iMessage MCP server.

## Overview

The SMS/iMessage MCP server provides tools to:
- Send iMessages using AppleScript (macOS only)
- Send SMS messages using Twilio API
- Retrieve recent iMessages from Messages.app (macOS only)  
- Setup SMS webhooks for receiving messages

## Prerequisites

1. **DateGPT installed and running**
2. **MCP dependencies installed** in the agent virtual environment
3. **For SMS**: Twilio account with API credentials
4. **For iMessage**: macOS system with Messages.app

## Quick Setup

### 1. Verify Installation

The SMS/iMessage MCP server should already be installed at:
```
/Users/rowantrollope/git/agent1/sms_imessage_server.py
```

### 2. Configure Environment Variables

Add these environment variables to your `.env.local` file:

```bash
# Required for SMS functionality via Twilio
TWILIO_ACCOUNT_SID=your_twilio_account_sid
TWILIO_AUTH_TOKEN=your_twilio_auth_token  
TWILIO_PHONE_NUMBER=your_twilio_phone_number

# Existing variables
OPENAI_API_KEY=your_openai_api_key
```

### 3. Get Twilio Credentials (For SMS)

1. **Sign up for Twilio**: https://www.twilio.com/try-twilio
2. **Get your credentials** from the Twilio Console:
   - Account SID
   - Auth Token
   - Purchase a phone number for sending SMS

3. **Add to environment**:
```bash
TWILIO_ACCOUNT_SID=ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_AUTH_TOKEN=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
TWILIO_PHONE_NUMBER=+1234567890
```

### 4. Restart DateGPT Backend

```bash
cd /Users/rowantrollope/git/agent1
npm run python:start
```

## Available Tools

Once configured, your agent will have access to these SMS/iMessage tools:

### 1. Send iMessage (macOS only)
```
Tool: send_imessage
Description: Send an iMessage using AppleScript
Parameters:
  - recipient: Phone number or email address
  - message: Message text to send
```

### 2. Send SMS via Twilio
```
Tool: send_sms_twilio  
Description: Send SMS using Twilio API
Parameters:
  - to_number: Phone number in E.164 format (e.g., +1234567890)
  - message: SMS message text to send
```

### 3. Get Recent iMessages (macOS only)
```
Tool: get_recent_imessages
Description: Get recent iMessages from Messages.app
Parameters:
  - limit: Number of messages to retrieve (default: 10)
  - contact: Optional filter by specific contact
```

### 4. Setup SMS Webhook
```
Tool: setup_sms_webhook
Description: Setup webhook for receiving SMS via Twilio
Parameters:
  - webhook_url: URL to receive SMS webhooks
  - phone_number: Twilio phone number to configure
```

## Usage Examples

### Send an iMessage (macOS)
```
User: "Send an iMessage to john@example.com saying 'Hello from DateGPT!'"
Agent: [Uses send_imessage tool] ✅ iMessage sent successfully to john@example.com
```

### Send SMS via Twilio
```
User: "Send an SMS to +1234567890 saying 'Meeting at 3pm'"
Agent: [Uses send_sms_twilio tool] ✅ SMS sent successfully to +1234567890. Message SID: SMxxxxxxx
```

### Get Recent Messages
```
User: "Show me my recent iMessages"
Agent: [Uses get_recent_imessages tool] Recent iMessages:
- "Hey, how are you? | 2024-01-15 10:30 AM | +1234567890"
- "See you later! | 2024-01-15 09:15 AM | john@example.com"
```

## Configuration Details

The MCP server is configured in `/Users/rowantrollope/git/agent1/mcp_servers.json`:

```json
{
  "servers": {
    "sms-imessage": {
      "enabled": true,
      "path": "/Users/rowantrollope/git/agent1/sms_imessage_server.py",
      "description": "SMS and iMessage integration server for sending/receiving messages",
      "env_vars": {
        "TWILIO_ACCOUNT_SID": "${TWILIO_ACCOUNT_SID}",
        "TWILIO_AUTH_TOKEN": "${TWILIO_AUTH_TOKEN}",
        "TWILIO_PHONE_NUMBER": "${TWILIO_PHONE_NUMBER}"
      },
      "args": [],
      "timeout": 30
    }
  }
}
```

## Troubleshooting

### "Twilio library not installed"
```bash
cd /Users/rowantrollope/git/agent1/agent
source venv/bin/activate  
pip install twilio
```

### "Missing Twilio credentials"
Verify your `.env.local` file contains all required Twilio environment variables and restart the backend.

### "iMessage sending is only available on macOS"
iMessage functionality requires macOS and the Messages.app. For cross-platform messaging, use SMS via Twilio.

### "AppleScript execution failed"
- Ensure Messages.app is running
- Grant necessary permissions in System Preferences > Security & Privacy
- The recipient must be reachable via iMessage

### "Server sms-imessage is not properly configured"  
- Verify the server path exists: `/Users/rowantrollope/git/agent1/sms_imessage_server.py`
- Ensure the file has execute permissions: `chmod +x sms_imessage_server.py`
- Restart the DateGPT backend to reload configuration

### Check Server Status
```bash
curl http://localhost:8000/mcp/status
curl http://localhost:8000/mcp/tools
```

## Security Considerations

1. **Environment Variables**: Never commit Twilio credentials to version control
2. **Permissions**: Grant minimal necessary permissions to Messages.app
3. **Rate Limiting**: Be mindful of Twilio API rate limits and costs
4. **Message Content**: Validate message content to prevent spam/abuse

## Advanced Configuration

### Custom Webhook for Receiving SMS
To receive SMS messages, set up a webhook endpoint:

1. **Create webhook endpoint** in your application
2. **Configure Twilio webhook**:
   ```
   User: "Setup SMS webhook for +1234567890 to receive at https://myapp.com/sms/webhook"
   Agent: [Uses setup_sms_webhook tool] ✅ SMS webhook configured
   ```

### Message Automation
You can create automated responses by combining SMS/iMessage tools with other DateGPT capabilities:

```
User: "When I receive an SMS, automatically check my calendar and respond with my availability"
Agent: [Can implement complex automation workflows using multiple tools]
```

## Integration with Other MCP Servers

The SMS/iMessage server works seamlessly with other MCP servers:
- **Memory server**: Remember message preferences and contacts
- **Calendar server**: Send meeting reminders via SMS
- **Weather server**: Send weather alerts to specified contacts

## Next Steps

1. **Test the integration** by sending a test message
2. **Set up webhooks** if you need to receive SMS messages  
3. **Create automated workflows** combining SMS/iMessage with other tools
4. **Configure message templates** for common responses

## Support

- Check MCP server status: `GET /mcp/status`
- View available tools: `GET /mcp/tools`  
- Monitor agent logs for detailed error information
- Refer to Twilio documentation for SMS API details

Happy messaging! 📱✨
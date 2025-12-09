# DateGPT Project Overview for Coding Agents

DateGPT is an advanced agentic dating assistant application combining a ChatGPT-like interface with a powerful Python agent backend. This document provides vital information for coding agents to understand and contribute effectively to the project.

## Project Features

- **Python Agent**: A robust Python-based agent with native OpenAI integration and extensible tool system
- **MCP Integration**: Model Context Protocol support for connecting to external tool servers (remem, Redis, etc.)
- **Modern Web Interface**: A responsive Next.js frontend providing a seamless, ChatGPT-like chat experience
- **Dossier Management**: Create and manage dating profiles with photos, notes, and date history
- **Calendar & Scheduling**: Track and manage upcoming dates with calendar views
- **Analytics Dashboard**: Visualize dating patterns, statistics, and trends
- **SMS Integration**: Twilio-powered messaging capabilities
- **Tool System**: Extensible tool architecture allowing the agent to perform various external actions

## Key Components

- **Next.js Frontend**: Modern React-based user interface built with Next.js 15 and React 19
- **Python Agent Backend**: FastAPI-powered backend with OpenAI integration and custom tools
- **MCP Client**: Model Context Protocol client for connecting to external tool servers
- **OpenAI Integration**: Direct integration with OpenAI's API for advanced AI capabilities
- **Tool Architecture**: Modular tool system for extending agent capabilities

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Python 3.8+, FastAPI
- **Styling**: Tailwind CSS and shadcn/ui components
- **AI Engine**: OpenAI API
- **Data Visualization**: Recharts
- **Drag & Drop**: @dnd-kit
- **Icons**: Lucide React
- **Messaging**: Twilio SMS
- **Protocol**: MCP (Model Context Protocol)
- **Data Storage**: Redis (via MCP server)
- **Communication**: RESTful API between frontend and Python backend

## Project Structure

```
agent1/
├── src/                       # Next.js frontend source
│   ├── app/                   # Next.js app router
│   │   ├── analytics/         # Analytics dashboard page
│   │   ├── calendar/          # Calendar/scheduling page
│   │   ├── dossiers/          # Dossier management page
│   │   ├── faces/             # Face/person view page
│   │   └── api/               # API routes
│   │       ├── chat-python/   # Python agent chat endpoint
│   │       ├── dashboard/     # Dashboard data endpoints
│   │       ├── dossiers/      # Dossier CRUD endpoints
│   │       ├── calendar/      # Calendar/date endpoints
│   │       ├── mcp/           # MCP server management
│   │       └── sms/           # SMS webhook endpoint
│   ├── components/            # React components
│   │   ├── analytics/         # Analytics charts and stats
│   │   ├── calendar/          # Calendar components
│   │   ├── chat/              # Chat interface components
│   │   ├── dashboard/         # Dashboard components
│   │   ├── dossiers/          # Dossier management components
│   │   ├── faces/             # Face card components
│   │   ├── upcoming-dates/    # Upcoming dates components
│   │   └── ui/                # shadcn/ui components
│   └── lib/                   # Shared utilities and types
├── agent/                     # Python agent backend
│   ├── agent.py               # Main agent implementation
│   ├── server.py              # FastAPI server
│   ├── tools.py               # Agent tools
│   ├── mcp_client.py          # MCP client for external servers
│   ├── mcp_config.py          # MCP configuration
│   ├── setup_mcp.py           # MCP setup script
│   ├── start.sh               # Server start script
│   ├── test_agent.py          # Agent tests
│   └── requirements.txt       # Python dependencies
├── mcp_servers/               # Local MCP servers
│   ├── localmcp/              # Local MCP server
│   ├── redis-dating/          # Redis-based dating data MCP server
│   └── web-search/            # Web search MCP server
├── scripts/                   # Utility scripts
│   └── remem_mcp_wrapper.py   # Remem MCP wrapper
├── public/                    # Static assets
│   └── uploads/               # Uploaded photos
└── Configuration files
    ├── mcp_servers.json       # MCP server configuration
    ├── package.json           # Node.js dependencies
    └── tailwind.config.ts     # Tailwind configuration
```

## Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone <repo-url>
   cd agent1
   ```

2. **Install Frontend Dependencies**:
   ```bash
   npm install
   ```

3. **Setup Python Environment**:
   ```bash
   cd agent
   python3 -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   pip install -r requirements.txt
   ```

4. **Environment Configuration**:
   Configure environment variables in `.env.local` using `.env.example` as a template. Required variables:
   - `OPENAI_API_KEY`: Your OpenAI API key
   
   Optional variables:
   - `OPENAI_MODEL`: Model to use (default: gpt-4o-mini)
   - `AGENT_PORT`: Python agent port (default: 8000)

5. **MCP Server Configuration** (Optional):
   ```bash
   cd agent
   python setup_mcp.py
   ```
   See `MCP_SETUP.md` for detailed MCP configuration.

6. **Running the Application**:
   - **Start Python Agent**: `npm run python:start` (runs on port 8000)
   - **Start Frontend**: `npm run dev` (runs on http://localhost:3000)
   - **Test Python Agent**: `npm run python:test`

## Development Workflow

1. **Frontend Development**: Use `npm run dev` to start the Next.js development server with Turbopack
2. **Backend Development**: Use `npm run python:start` to run the FastAPI server with hot reload
3. **Testing**: Use `npm run python:test` to test the Python agent functionality

## API Endpoints

### Chat API
- `POST /api/chat-python`: Send messages to the agent and receive responses
- `GET /api/chat-python`: Retrieve chat history

### Dashboard API
- `GET /api/dashboard`: Get dashboard statistics and person data
- `POST /api/dashboard/update-person`: Update person information

### Dossier API
- `GET /api/dossiers`: List all dossiers
- `GET /api/dossiers/[name]`: Get specific dossier
- `POST /api/dossiers/[name]/photo`: Upload photo for a person
- `GET /api/dossiers/[name]/dates`: Get dates for a person
- `POST /api/dossiers/[name]/chat`: Chat about a specific person
- `GET /api/dossiers/[name]/date-prep`: Get date preparation info
- `GET /api/dossiers/[name]/brief`: Get brief summary

### Calendar API
- `GET /api/calendar/dates`: Get all dates
- `POST /api/calendar/dates`: Create a new date
- `PUT /api/calendar/dates/[id]`: Update a date
- `DELETE /api/calendar/dates/[id]`: Delete a date

### MCP API
- `GET /api/mcp/tools`: List available MCP tools
- `POST /api/mcp/enable/[serverName]`: Enable an MCP server
- `POST /api/mcp/disable/[serverName]`: Disable an MCP server

### SMS API
- `POST /api/sms/webhook`: Twilio SMS webhook

## Frontend Pages

- `/` - Main chat interface with AI agent
- `/dossiers` - Manage dating profiles with photos and notes
- `/calendar` - View and manage upcoming dates
- `/analytics` - Dating statistics and trend visualization
- `/faces` - Browse person cards

## Agent Capabilities

The Python agent includes:
- **Natural Language Processing**: Powered by OpenAI's latest models
- **Tool Execution**: Extensible tool system for external actions
- **MCP Integration**: Connect to external MCP servers for extended capabilities
- **Memory Management**: Conversation history and context management
- **Error Handling**: Robust error handling and recovery
- **Dating Domain Knowledge**: Specialized for dating assistance

## MCP (Model Context Protocol) Integration

The agent can connect to external MCP servers for extended capabilities:

### Configured MCP Servers
- **redis-dating**: Redis-based storage for dating data (persons, dates, conversations)
- **localmcp**: Local utility tools
- **web-search**: Web search capabilities

### Adding MCP Servers
1. Add server configuration to `mcp_servers.json`
2. Run `python agent/setup_mcp.py` to configure
3. The agent will automatically load available MCP tools

See `MCP_SETUP.md` for detailed configuration instructions.

## Documentation

For detailed technical documentation, please refer to:
- `TOOLS.md`: Documentation of the agent's tool system
- `README.md`: General project information and quick start guide
- `MCP_SETUP.md`: MCP server integration guide
- `CLAUDE_DESKTOP_SETUP.md`: Claude Desktop configuration
- `SMS_IMESSAGE_SETUP.md`: SMS and iMessage setup guide

## Contribution Guidelines

To contribute to DateGPT:
- **Fork the Repository**: Create a personal fork and clone it locally
- **Create a Feature Branch**: Work on your feature or fix in a separate branch
- **Test Your Changes**: Ensure both frontend and backend work correctly
- **Submit Pull Request**: Once ready, submit a pull request for review

## UI Component Guidelines

- Keep files small with similar functionality grouped
- Create new components rather than embedding functionality
- Use shadcn/ui components from `src/components/ui/`
- Follow existing patterns in component directories

## License

DateGPT is released under the MIT License. For more details, see the LICENSE file included in the repository.

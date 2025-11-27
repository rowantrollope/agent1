# DateGPT

A modern agentic application built with a Python agent backend and Next.js frontend, featuring a ChatGPT-like web interface powered by OpenAI.

## Features

- 🤖 **Python Agent**: Robust Python-based agent with OpenAI integration and tool support
- 🛠️ **Tool System**: Extensible tool system allowing the agent to perform external actions
- 💬 **ChatGPT-like Web UI**: Modern, responsive chat interface built with Next.js
- 🎨 **Modern Design**: Built with Tailwind CSS and shadcn/ui components
- 🔄 **Real-time Chat**: Seamless conversation flow with message history
- 🌙 **Dark Mode Support**: Automatic theme switching
- ⚡ **Fast Performance**: FastAPI backend with efficient API communication

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Python 3.8+, FastAPI
- **Agent**: OpenAI SDK with function calling support
- **Styling**: Tailwind CSS, shadcn/ui
- **AI**: OpenAI API with advanced tool integration

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.8+
- npm or pnpm
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd agent1
```

2. Install frontend dependencies:
```bash
npm install
```

3. Set up Python environment:
```bash
cd agent
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
cd ..
```

4. Set up environment variables:
```bash
cp .env.example .env.local
```

5. Add your OpenAI API key to `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Running the Application

#### Development Mode

1. Start the Python agent server:
```bash
npm run python:start
```
The Python agent will run on http://localhost:8000

2. In a new terminal, start the frontend:
```bash
npm run dev
```
The web interface will be available at http://localhost:3000

#### Production Mode
```bash
npm run build
npm run start
```

#### Testing the Agent
```bash
npm run python:test
```

## Usage

### Web Interface
- Navigate to http://localhost:3000
- Start typing in the chat input
- Have natural conversations with the AI agent
- Ask the agent to use tools: "Can you calculate 25 + 17 using the demo tool?"
- Use the "Clear" button to reset chat history

### Agent Capabilities
The Python agent can:
- Engage in natural language conversations
- Execute tools and functions
- Maintain conversation context
- Handle complex queries with tool assistance
- Provide detailed responses with proper formatting

### Tool System
The agent has access to various tools including:
- **Demo Tool**: Greet users, perform calculations, show system info, echo messages
- Try asking: "Please greet me using the demo tool" or "Calculate 15 + 27"
- See [TOOLS.md](TOOLS.md) for detailed tool documentation

## Project Structure

```
agent1/
├── src/                    # Next.js frontend source
│   ├── app/               # Next.js app router
│   │   ├── api/          # API routes
│   │   │   └── chat-python/  # Python agent API endpoint
│   │   ├── globals.css   # Global styles
│   │   ├── layout.tsx    # Root layout
│   │   └── page.tsx      # Home page
│   ├── components/        # React components
│   │   ├── chat/         # Chat interface components
│   │   └── ui/           # shadcn/ui components
│   └── lib/              # Shared utilities
│       ├── types.ts      # TypeScript type definitions
│       └── utils.ts      # Utility functions
├── agent/                 # Python agent backend
│   ├── agent.py          # Main agent implementation
│   ├── server.py         # FastAPI server
│   ├── tools.py          # Agent tools
│   ├── requirements.txt  # Python dependencies
│   └── start.sh          # Start script
├── public/               # Static assets
└── package.json          # Node.js dependencies and scripts
```

## API Endpoints

The frontend communicates with the Python backend through:

- **POST /api/chat-python**: Send messages to the agent and receive responses
- **GET /api/chat-python**: Retrieve chat history

## Configuration

### Python Agent Configuration
Modify settings in `agent/agent.py`:
- OpenAI model selection
- Temperature and other model parameters
- System prompts and behavior

### Frontend Configuration
Modify settings in Next.js configuration files:
- `next.config.ts`: Next.js settings
- `tailwind.config.ts`: Styling configuration
- `components.json`: shadcn/ui component configuration

## Development

### Adding New Tools
1. Define your tool in `agent/tools.py`
2. Register it in the agent's tool list
3. Test the tool using `npm run python:test`

### Frontend Development
- Use `npm run dev` for hot reload during development
- Components are built with React 19 and TypeScript
- Styling uses Tailwind CSS with shadcn/ui components

### Backend Development
- The FastAPI server supports hot reload during development
- Agent logic is in `agent/agent.py`
- Tool implementations are in `agent/tools.py`

## Environment Variables

Required environment variables in `.env.local`:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Optional environment variables:
```env
OPENAI_MODEL=gpt-4o-mini
AGENT_PORT=8000
```

## Troubleshooting

### Common Issues

1. **Python agent not starting**: Ensure Python 3.8+ is installed and virtual environment is activated
2. **OpenAI API errors**: Verify your API key is correct and has sufficient credits
3. **Port conflicts**: Check that ports 3000 and 8000 are available
4. **Dependencies**: Run `npm install` and `pip install -r requirements.txt` to ensure all dependencies are installed

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Make your changes
4. Test both frontend and backend
5. Commit your changes (`git commit -m 'Add some amazing feature'`)
6. Push to the branch (`git push origin feature/amazing-feature`)
7. Open a Pull Request

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with [OpenAI API](https://openai.com/api/)
- Frontend powered by [Next.js](https://nextjs.org/)
- Backend powered by [FastAPI](https://fastapi.tiangolo.com/)
- UI components from [shadcn/ui](https://ui.shadcn.com/)
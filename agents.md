# DateGPT Project Overview for Coding Agents

DateGPT is an advanced agentic application combining a ChatGPT-like interface with a powerful Python agent backend. This document provides vital information for coding agents to understand and contribute effectively to the project.

## Project Features

- **Python Agent**: A robust Python-based agent with native OpenAI integration and extensible tool system
- **Modern Web Interface**: A responsive Next.js frontend providing a seamless, ChatGPT-like chat experience
- **Tool System**: Extensible tool architecture allowing the agent to perform various external actions
- **Real-time Communication**: Efficient API communication between the frontend and Python backend

## Key Components

- **Next.js Frontend**: Modern React-based user interface built with Next.js 15 and React 19
- **Python Agent Backend**: FastAPI-powered backend with OpenAI integration and custom tools
- **OpenAI Integration**: Direct integration with OpenAI's API for advanced AI capabilities
- **Tool Architecture**: Modular tool system for extending agent capabilities

## Technology Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Backend**: Python 3.8+, FastAPI
- **Styling**: Tailwind CSS and shadcn/ui components
- **AI Engine**: OpenAI API
- **Communication**: RESTful API between frontend and Python backend

## Project Structure

```
dategpt/
├── src/                    # Next.js frontend source
│   ├── app/               # Next.js app router
│   ├── components/        # React components
│   └── lib/               # Shared utilities and types
├── agent/                 # Python agent backend
│   ├── agent.py          # Main agent implementation
│   ├── server.py         # FastAPI server
│   ├── tools.py          # Agent tools
│   └── requirements.txt  # Python dependencies
└── public/               # Static assets
```

## Setup Instructions

1. **Clone the Repository**:
   ```bash
   git clone <repo-url>
   cd dategpt
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

5. **Running the Application**:
   - **Start Python Agent**: `npm run python:start` (runs on port 8000)
   - **Start Frontend**: `npm run dev` (runs on http://localhost:3000)
   - **Test Python Agent**: `npm run python:test`

## Development Workflow

1. **Frontend Development**: Use `npm run dev` to start the Next.js development server
2. **Backend Development**: Use `npm run python:start` to run the FastAPI server with hot reload
3. **Testing**: Use `npm run python:test` to test the Python agent functionality

## API Endpoints

The frontend communicates with the Python backend through these endpoints:
- `POST /api/chat-python`: Send messages to the agent and receive responses
- `GET /api/chat-python`: Retrieve chat history

## Contribution Guidelines

To contribute to DateGPT:
- **Fork the Repository**: Create a personal fork and clone it locally
- **Create a Feature Branch**: Work on your feature or fix in a separate branch
- **Test Your Changes**: Ensure both frontend and backend work correctly
- **Submit Pull Request**: Once ready, submit a pull request for review

## Agent Capabilities

The Python agent includes:
- **Natural Language Processing**: Powered by OpenAI's latest models
- **Tool Execution**: Extensible tool system for external actions
- **Memory Management**: Conversation history and context management
- **Error Handling**: Robust error handling and recovery

## Documentation

For detailed technical documentation, please refer to:
- `TOOLS.md`: Documentation of the agent's tool system
- `README.md`: General project information and quick start guide

## License

DateGPT is released under the MIT License. For more details, see the LICENSE file included in the repository.
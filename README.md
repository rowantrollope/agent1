# Agent1

A modern agentic application built with OpenAI agents, featuring both a ChatGPT-like web interface and a command-line interface.

## Features

- 🤖 **OpenAI Agent Integration**: Powered by OpenAI's GPT models
- 💬 **ChatGPT-like Web UI**: Modern, responsive chat interface built with Next.js
- 🖥️ **Command Line Interface**: Terminal-based chat for quick interactions
- 🎨 **Modern Design**: Built with Tailwind CSS and shadcn/ui components
- 🔄 **Real-time Chat**: Seamless conversation flow with message history
- 🌙 **Dark Mode Support**: Automatic theme switching

## Tech Stack

- **Frontend**: Next.js 15, React 19, TypeScript
- **Styling**: Tailwind CSS, shadcn/ui
- **AI**: OpenAI API
- **CLI**: Node.js with chalk for colored output

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or pnpm
- OpenAI API key

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd agent1
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env.local
```

4. Add your OpenAI API key to `.env.local`:
```env
OPENAI_API_KEY=your_openai_api_key_here
```

### Running the Application

#### Web Interface
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the web interface.

#### CLI Interface
```bash
# Build the CLI first
npm run build:cli

# Run the CLI
npm run cli
```

## Usage

### Web Interface
- Navigate to the web interface
- Start typing in the chat input
- Have natural conversations with the AI agent
- Use the "Clear" button to reset chat history

### CLI Interface
- Run `npm run cli` to start the terminal chat
- Type your messages and press Enter
- Use special commands:
  - `clear` - Clear chat history
  - `exit` or `quit` - Exit the CLI
  - `Ctrl+C` - Force quit

## Project Structure

```
agent1/
├── src/
│   ├── app/              # Next.js app directory
│   ├── components/       # React components
│   │   ├── chat/        # Chat-related components
│   │   └── ui/          # shadcn/ui components
│   └── lib/             # Utility libraries
│       ├── openai/      # OpenAI integration
│       └── cli.ts       # CLI implementation
├── bin/                 # CLI executable
├── public/              # Static assets
└── ...config files
```

## Configuration

The agent can be configured by modifying the `AgentConfig` in `src/lib/openai/agent.ts`:

- `model`: OpenAI model to use (default: `gpt-4o-mini`)
- `temperature`: Response creativity (0-1, default: 0.7)
- `maxTokens`: Maximum response length (default: 2000)
- `systemPrompt`: System prompt for the agent

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Submit a pull request

## License

MIT License - see LICENSE file for details

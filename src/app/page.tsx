import { ChatInterface } from '@/components/chat/ChatInterface';
import { Bot } from 'lucide-react';

export default function Home() {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Bot className="h-8 w-8 text-primary" />
            <h1 className="text-2xl font-bold">Agent1</h1>
            <span className="text-sm text-muted-foreground ml-2">
              AI Agent Chat Interface
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <h2 className="text-lg font-semibold mb-2">
              Welcome to your AI Agent
            </h2>
            <p className="text-muted-foreground">
              Start a conversation with your AI assistant. Ask questions, get help with tasks, 
              or just have a friendly chat.
            </p>
          </div>
          
          <ChatInterface />
        </div>
      </main>
    </div>
  );
}

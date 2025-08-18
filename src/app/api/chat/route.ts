import { NextRequest, NextResponse } from 'next/server';
import { Agent } from '@/lib/openai/agent';

let agent: Agent | null = null;

function getAgent() {
  if (!agent) {
    agent = new Agent({
      systemPrompt: `You are a helpful AI assistant. You are part of an agentic application called Agent1. 
You can help users with various tasks, answer questions, and engage in meaningful conversations.
Be helpful, accurate, and friendly in your responses.`,
    });
  }
  return agent;
}

export async function POST(req: NextRequest) {
  try {
    const { message, action } = await req.json();

    if (!message && action !== 'clear') {
      return NextResponse.json(
        { error: 'Message is required' },
        { status: 400 }
      );
    }

    const agentInstance = getAgent();

    if (action === 'clear') {
      agentInstance.clearHistory();
      return NextResponse.json({ 
        success: true, 
        message: 'Chat history cleared' 
      });
    }

    const response = await agentInstance.chat(message);
    const history = agentInstance.getMessages();

    return NextResponse.json({
      response,
      history,
    });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const agentInstance = getAgent();
    const history = agentInstance.getMessages();

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Chat API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
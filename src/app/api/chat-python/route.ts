import { NextRequest, NextResponse } from 'next/server';

const PYTHON_AGENT_URL = 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    
    const response = await fetch(`${PYTHON_AGENT_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      throw new Error(`Python agent responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Python agent API error:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with Python agent' },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const response = await fetch(`${PYTHON_AGENT_URL}/chat`);
    
    if (!response.ok) {
      throw new Error(`Python agent responded with status: ${response.status}`);
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Python agent API error:', error);
    return NextResponse.json(
      { error: 'Failed to communicate with Python agent' },
      { status: 500 }
    );
  }
}

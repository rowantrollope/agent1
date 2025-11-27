import { NextRequest, NextResponse } from 'next/server';

const PYTHON_AGENT_URL = 'http://localhost:8000';

export async function POST(req: NextRequest) {
  try {
    // Parse Twilio webhook data
    const formData = await req.formData();
    const messageBody = formData.get('Body') as string;
    const fromNumber = formData.get('From') as string;
    const toNumber = formData.get('To') as string;

    console.log(`SMS received from ${fromNumber}: ${messageBody}`);

    // Send message to Python agent for processing
    const agentResponse = await fetch(`${PYTHON_AGENT_URL}/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        message: messageBody,
        metadata: {
          source: 'sms',
          from: fromNumber,
          to: toNumber
        }
      }),
    });

    if (!agentResponse.ok) {
      console.error(`Agent responded with status: ${agentResponse.status}`);
      return new Response(`<?xml version="1.0" encoding="UTF-8"?>
        <Response>
          <Message>Sorry, I'm having trouble processing your request right now.</Message>
        </Response>`, {
        status: 200,
        headers: { 'Content-Type': 'text/xml' },
      });
    }

    const agentData = await agentResponse.json();
    const responseMessage = agentData.response || 'Got your message!';

    // Respond with TwiML to send SMS reply
    const twimlResponse = `<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>${responseMessage}</Message>
      </Response>`;

    return new Response(twimlResponse, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });

  } catch (error) {
    console.error('SMS webhook error:', error);

    // Always return valid TwiML even on error
    return new Response(`<?xml version="1.0" encoding="UTF-8"?>
      <Response>
        <Message>Sorry, I encountered an error processing your message.</Message>
      </Response>`, {
      status: 200,
      headers: { 'Content-Type': 'text/xml' },
    });
  }
}

// Handle Twilio webhook validation (optional but recommended)
export async function GET() {
  return NextResponse.json({
    status: 'SMS webhook endpoint is running',
    timestamp: new Date().toISOString()
  });
}

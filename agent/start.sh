#!/bin/bash

# Start script for Python agent
echo "🐍 Starting Python Agent Server..."

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
fi

# Activate virtual environment
source venv/bin/activate

# Install dependencies
echo "Installing dependencies..."
pip install -r requirements.txt

# Load environment variables from .env.local
if [ -f "../.env.local" ]; then
    echo "Loading environment variables from .env.local..."
    # Use python-dotenv to load variables properly
    python3 -c "
from dotenv import load_dotenv
import os
load_dotenv('../.env.local')
# Export the variables to the environment
for key, value in os.environ.items():
    if key.startswith(('TWILIO_', 'OPENAI_')):
        print(f'export {key}=\"{value}\"')
" > /tmp/env_vars.sh
    source /tmp/env_vars.sh
    rm /tmp/env_vars.sh
    echo "✅ Environment variables loaded"
fi

# Start the server
echo "Starting FastAPI server on port 8000..."
python server.py

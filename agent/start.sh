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

# Start the server
echo "Starting FastAPI server on port 8000..."
python server.py

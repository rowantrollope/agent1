#!/usr/bin/env python3
"""
Test script for the Python agent
"""
import os
import json
from dotenv import load_dotenv
from agent import PythonAgent

def test_python_agent():
    print("🐍 Testing Python Agent with Tools...\n")
    
    # Load environment variables
    load_dotenv("../.env.local")
    api_key = os.getenv("OPENAI_API_KEY")
    
    if not api_key:
        print("❌ OPENAI_API_KEY not found in environment")
        return
    
    agent = PythonAgent(api_key=api_key)
    
    print(f"Available tools: {agent.get_available_tools()}")
    print(f"Tools enabled: {agent.is_tools_enabled()}")
    print()
    
    # Test 1: Greeting
    print("Test 1: Requesting a greeting...")
    try:
        response1 = agent.chat("Please greet me using the demo tool. My name is John.")
        print(f"Response: {response1.content}")
        print()
    except Exception as e:
        print(f"Error in test 1: {e}")
    
    # Test 2: Calculation
    print("Test 2: Requesting a calculation...")
    try:
        response2 = agent.chat("Can you calculate 25 + 17 using the demo tool?")
        print(f"Response: {response2.content}")
        print()
    except Exception as e:
        print(f"Error in test 2: {e}")
    
    # Test 3: System info
    print("Test 3: Requesting system info...")
    try:
        response3 = agent.chat("Please show me system information using the demo tool.")
        print(f"Response: {response3.content}")
        print()
    except Exception as e:
        print(f"Error in test 3: {e}")
    
    print("✅ Python agent testing completed!")

if __name__ == "__main__":
    test_python_agent()

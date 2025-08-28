"""
Demo tools for the Python agent - much simpler than TypeScript version!
"""
import json
import platform
import time
from typing import Dict, Any


def demo_tool(action: str, name: str = None, operation: str = None, a: float = None, b: float = None, message: str = None) -> str:
    """
    A demonstration tool that shows how the tool system works.
    
    Args:
        action: The action to perform (greet, calculate, system_info, echo)
        name: Name for greeting (required when action is "greet")
        operation: Math operation (add, subtract, multiply, divide) for calculate
        a: First number for calculation
        b: Second number for calculation  
        message: Message to echo back
    
    Returns:
        JSON string with the result
    """
    try:
        if action == "greet":
            if not name:
                return json.dumps({"success": False, "error": "Name is required for greeting"})
            
            greeting = f"Hello, {name}! 👋 This is the Python demo tool speaking. Tool system is working correctly!"
            return json.dumps({
                "success": True,
                "data": {"greeting": greeting},
                "message": greeting
            })
        
        elif action == "calculate":
            if not all([operation, a is not None, b is not None]):
                return json.dumps({"success": False, "error": "Operation, a, and b are required for calculation"})
            
            if operation == "add":
                result = a + b
                symbol = "+"
            elif operation == "subtract":
                result = a - b
                symbol = "-"
            elif operation == "multiply":
                result = a * b
                symbol = "*"
            elif operation == "divide":
                if b == 0:
                    return json.dumps({"success": False, "error": "Cannot divide by zero"})
                result = a / b
                symbol = "/"
            else:
                return json.dumps({"success": False, "error": f"Unknown operation: {operation}"})
            
            calculation = f"{a} {symbol} {b} = {result}"
            return json.dumps({
                "success": True,
                "data": {
                    "operation": operation,
                    "a": a,
                    "b": b,
                    "result": result,
                    "calculation": calculation
                },
                "message": f"Calculation result: {calculation}"
            })
        
        elif action == "system_info":
            info = {
                "timestamp": time.time(),
                "tool_name": "demo_tool",
                "python_version": platform.python_version(),
                "platform": platform.system(),
                "architecture": platform.machine(),
                "processor": platform.processor(),
            }
            
            return json.dumps({
                "success": True,
                "data": info,
                "message": f"System Info: Python {info['python_version']} on {info['platform']} ({info['architecture']})"
            })
        
        elif action == "echo":
            if not message:
                return json.dumps({"success": False, "error": "Message is required for echo"})
            
            return json.dumps({
                "success": True,
                "data": {"original_message": message},
                "message": f"Echo: {message}"
            })
        
        else:
            return json.dumps({"success": False, "error": f"Unknown action: {action}"})
    
    except Exception as e:
        return json.dumps({"success": False, "error": f"Tool execution failed: {str(e)}"})


# Tool definitions for OpenAI
TOOLS = [
    {
        "type": "function",
        "function": {
            "name": "demo_tool",
            "description": "A demonstration tool that can greet users, perform calculations, provide system info, or echo messages.",
            "parameters": {
                "type": "object",
                "properties": {
                    "action": {
                        "type": "string",
                        "description": "The action to perform",
                        "enum": ["greet", "calculate", "system_info", "echo"]
                    },
                    "name": {
                        "type": "string",
                        "description": "Name for greeting (required when action is 'greet')"
                    },
                    "operation": {
                        "type": "string",
                        "description": "Math operation: add, subtract, multiply, divide (required when action is 'calculate')",
                        "enum": ["add", "subtract", "multiply", "divide"]
                    },
                    "a": {
                        "type": "number",
                        "description": "First number for calculation (required when action is 'calculate')"
                    },
                    "b": {
                        "type": "number", 
                        "description": "Second number for calculation (required when action is 'calculate')"
                    },
                    "message": {
                        "type": "string",
                        "description": "Message to echo back (required when action is 'echo')"
                    }
                },
                "required": ["action"]
            }
        }
    }
]

# Tool function mapping
TOOL_FUNCTIONS = {
    "demo_tool": demo_tool
}

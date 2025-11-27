# DateGPT Tool System Documentation

This document describes the tool system implemented in DateGPT's Python agent backend, enabling the AI to perform external actions and access system resources.

## Overview

The Python agent uses OpenAI's native function calling capabilities to execute tools. This approach provides:

- **Simple Implementation**: Direct function definitions with minimal boilerplate
- **Native Integration**: Built-in OpenAI tool support
- **Easy Extension**: Add new tools by writing simple Python functions
- **Reliable Execution**: Automatic parameter validation and error handling

## Architecture

The tool system consists of:

### 1. Tool Functions (`agent/tools.py`)
- Python functions decorated for OpenAI integration
- Direct parameter validation through function signatures
- JSON-based return values for structured responses

### 2. Tool Definitions
- OpenAI function schemas that describe available tools
- Automatic parameter inference from function signatures
- Built-in type validation

### 3. Agent Integration (`agent/agent.py`)
- Seamless tool calling through OpenAI's API
- Automatic function execution and result handling
- Context-aware tool usage

## Available Tools

### Demo Tool
A comprehensive demonstration tool showcasing various capabilities.

**Function**: `demo_tool(action, name=None, operation=None, a=None, b=None, message=None)`

**Actions:**
- **`greet`**: Personal greeting with the provided name
- **`calculate`**: Mathematical operations (add, subtract, multiply, divide)
- **`system_info`**: System information (Python version, platform, timestamp)
- **`echo`**: Echo back a message

**Examples:**
```python
# Greeting
demo_tool(action="greet", name="Alice")
# Returns: "Hello, Alice! 👋 This is the demo tool speaking..."

# Calculation  
demo_tool(action="calculate", operation="add", a=15, b=25)
# Returns: {"operation": "15 + 25", "result": 40}

# System Info
demo_tool(action="system_info")
# Returns: {"python_version": "3.11.0", "platform": "Darwin", ...}

# Echo
demo_tool(action="echo", message="Hello World")
# Returns: {"echoed_message": "Hello World"}
```

## Usage Examples

### Web Interface
1. Start the Python agent: `npm run python:start`
2. Start the frontend: `npm run dev`  
3. Navigate to http://localhost:3000
4. Try these prompts:
   - "Calculate 42 + 58 using the demo tool"
   - "Greet me using the demo tool, my name is John"
   - "Show me system information"
   - "Echo back the message 'Testing tools'"

### Direct Testing
Test the Python agent directly:
```bash
npm run python:test
```

## Tool Implementation Guide

### Creating New Tools

Adding a new tool requires three simple steps:

#### 1. Define the Function
Create your tool function in `agent/tools.py`:

```python
def my_new_tool(parameter1: str, parameter2: int = 10) -> str:
    """
    Description of what this tool does.
    
    Args:
        parameter1: Description of the first parameter
        parameter2: Description of the second parameter (optional, default: 10)
    
    Returns:
        JSON string with the result
    """
    try:
        # Implement your tool logic here
        result = {"input": parameter1, "multiplied": parameter2 * 2}
        return json.dumps(result)
    except Exception as e:
        return json.dumps({"error": str(e)})
```

#### 2. Add Tool Definition
Add the OpenAI function definition to the `TOOLS` list:

```python
TOOLS = [
    # Existing tools...
    {
        "type": "function",
        "function": {
            "name": "my_new_tool",
            "description": "Description of what this tool does",
            "parameters": {
                "type": "object",
                "properties": {
                    "parameter1": {
                        "type": "string",
                        "description": "Description of the first parameter"
                    },
                    "parameter2": {
                        "type": "integer", 
                        "description": "Description of the second parameter",
                        "default": 10
                    }
                },
                "required": ["parameter1"]
            }
        }
    }
]
```

#### 3. Register the Function
Add your function to the `TOOL_FUNCTIONS` mapping:

```python
TOOL_FUNCTIONS = {
    "demo_tool": demo_tool,
    "my_new_tool": my_new_tool,  # Add your function here
}
```

### Best Practices

**Function Design:**
- Use clear, descriptive function names
- Include comprehensive docstrings
- Use type hints for all parameters
- Return JSON strings for structured data
- Handle errors gracefully

**Parameter Definition:**
- Match OpenAI schema types to Python types
- Use required arrays for mandatory parameters
- Provide clear descriptions for all parameters
- Set sensible defaults where appropriate

**Error Handling:**
- Wrap tool logic in try-catch blocks
- Return JSON error objects for failures
- Include helpful error messages
- Log errors for debugging

## Configuration

### Agent Configuration
Modify tool behavior in `agent/agent.py`:

```python
# Enable/disable tools
client.chat.completions.create(
    model="gpt-4o-mini",
    messages=messages,
    tools=TOOLS if enable_tools else None,  # Control tool availability
    tool_choice="auto"  # Let the model decide when to use tools
)
```

### Tool-Specific Configuration
Configure individual tools by modifying their function implementations:

```python
def demo_tool(action: str, ...):
    # Add configuration options here
    MAX_CALCULATION = 1000000  # Limit calculation size
    ALLOWED_OPERATIONS = ["add", "subtract", "multiply", "divide"]
    # ... rest of implementation
```

## Testing

### Automated Testing
Create test cases for your tools:

```python
# In agent/test_agent.py or a new test file
def test_my_tool():
    result = my_new_tool("test input", 5)
    data = json.loads(result)
    assert data["input"] == "test input"
    assert data["multiplied"] == 10
```

### Manual Testing
Test tools interactively:

```bash
cd agent
python3 test_agent.py
```

### Integration Testing
Test tools through the web interface:
1. Start both backend and frontend
2. Use the chat interface to test tool functionality
3. Verify responses and error handling

## Tool Security

### Input Validation
- Validate all parameters before processing
- Sanitize string inputs to prevent injection
- Check numeric ranges and limits
- Handle edge cases gracefully

### Output Sanitization  
- Ensure output doesn't contain sensitive information
- Validate JSON structure before returning
- Log security-relevant events

### Access Control
- Implement permission checks for sensitive operations
- Consider user context when available
- Limit resource access appropriately

## Troubleshooting

### Common Issues

**Tool Not Found:**
- Verify function is defined in `tools.py`
- Check function is added to `TOOL_FUNCTIONS` mapping
- Ensure tool definition exists in `TOOLS` array

**Parameter Errors:**
- Validate OpenAI schema matches function signature
- Check required vs optional parameters
- Verify parameter types are correct

**Execution Errors:**
- Check function implementation for bugs
- Verify error handling is present
- Review logs for detailed error information

**Integration Issues:**
- Ensure Python agent server is running
- Check API endpoints are responding
- Verify OpenAI API key is configured

## Performance Considerations

### Optimization Tips
- Keep tool functions lightweight and fast
- Use async operations for I/O-bound tasks
- Cache results when appropriate
- Limit resource-intensive operations

### Monitoring
- Log tool usage and performance
- Monitor error rates and types  
- Track response times
- Alert on unusual patterns

## Future Enhancements

Potential improvements to consider:
- **Async Tool Support**: For long-running operations
- **Tool Composition**: Chain multiple tools together
- **Dynamic Tool Loading**: Load tools from external modules
- **Tool Metrics**: Usage analytics and performance monitoring
- **Advanced Validation**: Schema validation with Pydantic
- **Tool Versioning**: Support multiple versions of the same tool

## Migration from TypeScript

If migrating tools from the previous TypeScript implementation:

1. **Simplify Structure**: Convert class-based tools to simple functions
2. **Remove Boilerplate**: Eliminate custom validation and registry code
3. **Use Native Types**: Replace custom types with Python built-ins
4. **Streamline Definitions**: Use OpenAI's standard function schema format
5. **Test Thoroughly**: Verify functionality matches original implementation

The Python approach typically reduces tool implementation code by 60-80% while maintaining the same functionality.
"""
Python OpenAI Agent with native tool support - much simpler!
"""
import json
import uuid
import asyncio
from datetime import datetime
from typing import List, Dict, Any, Optional
from openai import OpenAI
from tools import TOOLS, TOOL_FUNCTIONS
from mcp_client import mcp_manager, get_mcp_tools, execute_mcp_tool


class ChatMessage:
    def __init__(self, role: str, content: str, tool_calls: Optional[List] = None, tool_call_id: Optional[str] = None):
        self.id = str(uuid.uuid4())
        self.role = role
        self.content = content
        self.timestamp = datetime.now()
        self.tool_calls = tool_calls
        self.tool_call_id = tool_call_id

    def to_dict(self):
        result = {
            "id": self.id,
            "role": self.role,
            "content": self.content,
            "timestamp": self.timestamp.isoformat()
        }
        if self.tool_calls:
            result["tool_calls"] = self.tool_calls
        if self.tool_call_id:
            result["tool_call_id"] = self.tool_call_id
        return result


class PythonAgent:
    def __init__(self, api_key: str, model: str = "gpt-4o-mini", enable_tools: bool = True):
        self.client = OpenAI(api_key=api_key)
        self.model = model
        self.enable_tools = enable_tools
        self.messages: List[ChatMessage] = []
        self.mcp_tools_cache = None

        # Add system message
        system_prompt = """You are a helpful AI assistant in the Agent1 application.
Be accurate, friendly, and make effective use of available tools.

Tool usage guidance:
- You can call both built-in tools and MCP (Model Context Protocol) server tools. The full tool list (with names and descriptions) is provided to you; select tools based on their descriptions.
- Memory tools: If any MCP tool indicates the ability to store, search, or retrieve user memories or profile information (for example, tools from a server like 'agent-memory-server_*' or similar), use them appropriately.
  - Retrieval: When answering questions that may rely on facts from earlier sessions (e.g., the user's name, preferences, recurring tasks) or when the current chat lacks context (such as after a chat reset), first attempt to retrieve relevant memories by calling the memory search/retrieval tool with a concise query (e.g., 'user name', 'preferred name', 'preferences about X').
  - Writing: When the user shares stable personal facts (name, preferred name, pronouns, timezone, preferences, long-term goals, contact info), store or upsert them using the memory write/upsert tool, including a brief description and any useful tags/keys to aid future retrieval.
  - Be conservative: Only write durable facts (not ephemeral content). Update existing memories rather than duplicating where possible.
- If memory tools are not available, proceed normally without failing the request.

General behavior:
- If a tool call is likely to materially improve the answer (computation, lookup, memory, etc.), prefer using the tool before responding.
- Clearly cite results from tool outputs in your response.
"""

        self.messages.append(ChatMessage("system", system_prompt))

    def _get_tools_sync(self) -> List[Dict[str, Any]]:
        """Get all tools synchronously - fallback to local tools only if MCP fails."""
        try:
            # Try to get the current loop
            try:
                loop = asyncio.get_running_loop()
                # If we're in an async context, return just local tools for now
                print("Warning: In async context, using local tools only")
                return TOOLS.copy()
            except RuntimeError:
                # No running loop, safe to create new one
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(self.get_all_tools())
                    return result
                finally:
                    asyncio.set_event_loop(None)
                    loop.close()
        except Exception as e:
            print(f"Error in _get_tools_sync: {e}")
            return TOOLS.copy()

    def _execute_mcp_tool_sync(self, function_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an MCP tool synchronously."""
        try:
            # Try to get the current loop  
            try:
                loop = asyncio.get_running_loop()
                # If we're in an async context, we can't easily execute MCP tools
                return {"error": "Cannot execute MCP tools in async context"}
            except RuntimeError:
                # No running loop, safe to create new one
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)
                try:
                    result = loop.run_until_complete(execute_mcp_tool(function_name, arguments))
                    return result
                finally:
                    asyncio.set_event_loop(None)
                    loop.close()
        except Exception as e:
            return {"error": f"MCP tool execution failed: {str(e)}"}

    async def get_all_tools(self) -> List[Dict[str, Any]]:
        """Get all available tools (local + MCP)."""
        all_tools = TOOLS.copy()

        # Get MCP tools
        try:
            mcp_tools = await get_mcp_tools()
            all_tools.extend(mcp_tools)
            self.mcp_tools_cache = mcp_tools
        except Exception as e:
            print(f"Warning: Could not load MCP tools: {e}")

        return all_tools

    async def chat_async(self, user_message: str) -> ChatMessage:
        """Async version of chat that properly handles MCP tools."""
        # Add user message
        self.messages.append(ChatMessage("user", user_message))

        try:
            # Prepare messages for OpenAI API
            api_messages = []
            for msg in self.messages:
                if msg.role == "tool":
                    api_messages.append({
                        "role": "tool",
                        "content": msg.content,
                        "tool_call_id": msg.tool_call_id
                    })
                elif msg.role == "assistant" and msg.tool_calls:
                    api_messages.append({
                        "role": "assistant",
                        "content": msg.content,
                        "tool_calls": msg.tool_calls
                    })
                else:
                    api_messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })

            # Make API call
            kwargs = {
                "model": self.model,
                "messages": api_messages,
                "temperature": 0.7,
                "max_tokens": 2000
            }

            if self.enable_tools:
                # Get all tools (local + MCP) asynchronously
                try:
                    all_tools = await self.get_all_tools()
                    kwargs["tools"] = all_tools
                except Exception as e:
                    print(f"Warning: Could not load all tools: {e}")
                    kwargs["tools"] = TOOLS

            response = self.client.chat.completions.create(**kwargs)

            message = response.choices[0].message

            # Handle tool calls
            if message.tool_calls:
                # Add assistant message with tool calls
                assistant_msg = ChatMessage(
                    "assistant",
                    message.content or "",
                    tool_calls=[{
                        "id": tc.id,
                        "type": tc.type,
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    } for tc in message.tool_calls]
                )
                self.messages.append(assistant_msg)

                # Execute tools
                for tool_call in message.tool_calls:
                    if tool_call.type == "function":
                        tool_result = await self._execute_tool_async(tool_call)
                        self.messages.append(ChatMessage("tool", tool_result, tool_call_id=tool_call.id))

                # Get final response
                return await self.chat_async("Please provide a response based on the tool results.")

            # Regular response
            assistant_message = ChatMessage("assistant", message.content or "Sorry, I could not generate a response.")
            self.messages.append(assistant_message)
            return assistant_message

        except Exception as e:
            error_msg = ChatMessage("assistant", f"Sorry, there was an error processing your request: {str(e)}")
            self.messages.append(error_msg)
            return error_msg

    def chat(self, user_message: str) -> ChatMessage:
        """Send a message and get a response from the agent."""
        # Add user message
        self.messages.append(ChatMessage("user", user_message))

        try:
            # Prepare messages for OpenAI API
            api_messages = []
            for msg in self.messages:
                if msg.role == "tool":
                    api_messages.append({
                        "role": "tool",
                        "content": msg.content,
                        "tool_call_id": msg.tool_call_id
                    })
                elif msg.role == "assistant" and msg.tool_calls:
                    api_messages.append({
                        "role": "assistant",
                        "content": msg.content,
                        "tool_calls": msg.tool_calls
                    })
                else:
                    api_messages.append({
                        "role": msg.role,
                        "content": msg.content
                    })

            # Make API call
            kwargs = {
                "model": self.model,
                "messages": api_messages,
                "temperature": 0.7,
                "max_tokens": 2000
            }

            if self.enable_tools:
                # Start with local tools only for now
                kwargs["tools"] = TOOLS

            response = self.client.chat.completions.create(**kwargs)

            message = response.choices[0].message

            # Handle tool calls
            if message.tool_calls:
                # Add assistant message with tool calls
                assistant_msg = ChatMessage(
                    "assistant",
                    message.content or "",
                    tool_calls=[{
                        "id": tc.id,
                        "type": tc.type,
                        "function": {
                            "name": tc.function.name,
                            "arguments": tc.function.arguments
                        }
                    } for tc in message.tool_calls]
                )
                self.messages.append(assistant_msg)

                # Execute tools
                for tool_call in message.tool_calls:
                    if tool_call.type == "function":
                        tool_result = self._execute_tool(tool_call)
                        self.messages.append(ChatMessage("tool", tool_result, tool_call_id=tool_call.id))

                # Get final response
                return self.chat("Please provide a response based on the tool results.")

            # Regular response
            assistant_message = ChatMessage("assistant", message.content or "Sorry, I could not generate a response.")
            self.messages.append(assistant_message)
            return assistant_message

        except Exception as e:
            error_msg = ChatMessage("assistant", f"Sorry, there was an error processing your request: {str(e)}")
            self.messages.append(error_msg)
            return error_msg

    async def _execute_tool_async(self, tool_call) -> str:
        """Execute a tool call asynchronously and return the result."""
        try:
            function_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            # Check local tools first
            if function_name in TOOL_FUNCTIONS:
                return TOOL_FUNCTIONS[function_name](**arguments)

            # Check if it's an MCP tool (format: servername_toolname)
            if '_' in function_name:
                try:
                    result = await execute_mcp_tool(function_name, arguments)

                    if "error" in result:
                        return json.dumps({"success": False, "error": result["error"]})
                    else:
                        return json.dumps({"success": True, "result": result.get("result", result)})

                except Exception as e:
                    return json.dumps({"success": False, "error": f"MCP tool execution failed: {str(e)}"})

            return json.dumps({"success": False, "error": f"Unknown tool: {function_name}"})

        except Exception as e:
            return json.dumps({"success": False, "error": f"Tool execution failed: {str(e)}"})

    def _execute_tool(self, tool_call) -> str:
        """Execute a tool call and return the result."""
        try:
            function_name = tool_call.function.name
            arguments = json.loads(tool_call.function.arguments)

            # Check local tools first
            if function_name in TOOL_FUNCTIONS:
                return TOOL_FUNCTIONS[function_name](**arguments)

            # Check if it's an MCP tool (format: servername_toolname)
            if '_' in function_name:
                try:
                    # Handle async execution properly
                    try:
                        loop = asyncio.get_running_loop()
                        # We're in an async context, need to create task
                        import concurrent.futures
                        with concurrent.futures.ThreadPoolExecutor() as executor:
                            result = executor.submit(self._execute_mcp_tool_sync, function_name, arguments).result(timeout=10)
                    except RuntimeError:
                        # No running loop, safe to create new one
                        loop = asyncio.new_event_loop()
                        asyncio.set_event_loop(loop)
                        result = loop.run_until_complete(execute_mcp_tool(function_name, arguments))
                        loop.close()

                    if "error" in result:
                        return json.dumps({"success": False, "error": result["error"]})
                    else:
                        return json.dumps({"success": True, "result": result.get("result", result)})

                except Exception as e:
                    return json.dumps({"success": False, "error": f"MCP tool execution failed: {str(e)}"})

            return json.dumps({"success": False, "error": f"Unknown tool: {function_name}"})

        except Exception as e:
            return json.dumps({"success": False, "error": f"Tool execution failed: {str(e)}"})

    def get_messages(self) -> List[Dict]:
        """Get all messages except system messages."""
        return [msg.to_dict() for msg in self.messages if msg.role != "system"]

    def clear_history(self):
        """Clear chat history but keep system message."""
        self.messages = [msg for msg in self.messages if msg.role == "system"]

    def get_available_tools(self) -> List[str]:
        """Get list of available tool names."""
        tools = list(TOOL_FUNCTIONS.keys())

        # Add MCP tools if available
        if self.mcp_tools_cache:
            for tool in self.mcp_tools_cache:
                tools.append(tool["function"]["name"])

        return tools

    def is_tools_enabled(self) -> bool:
        """Check if tools are enabled."""
        return self.enable_tools

    def setup_mcp_server(self, name: str, server_path: str, env_vars: Dict[str, str] = None):
        """Setup an MCP server connection (legacy method - now using direct setup)."""
        from mcp_client import setup_mcp_server
        
        return setup_mcp_server(name, server_path, env_vars)

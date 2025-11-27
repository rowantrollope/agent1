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
        system_prompt = """You are a specialized AI assistant for managing dating information and relationships. Your primary role is to help track, organize, and provide insights about people the user has dated.

Your core responsibilities:
1. **Intelligently Store Information**: You must distinguish between when the user is SHARING NEW INFORMATION vs when they are ASKING QUESTIONS:
   - **When user shares NEW INFORMATION** (e.g., "Today I found out Christina likes chocolate", "Jenny works at Google", "I went on a date with Sarah yesterday"):
     - Identify the person mentioned (use fuzzy matching if name is slightly different)
     - Use Redis MCP tools to store/update structured data: person's name, how you met, next date, individual date history, status
     - Use agent-memory-server tools (prefixed with 'agent-memory-server_') to store the detailed memory/information
     - **NEVER** store anything in the Redis `details` field - it is read-only and computed from memory server
     - All memories, conversations, preferences, hobbies, anecdotes, and any information about a person MUST go to agent-memory-server only
   - **When user ASKS QUESTIONS** (e.g., "Who am I dating tomorrow?", "What do we know about Jenny?", "Tell me about Sarah"):
     - Do NOT store any memories - these are queries, not new information
     - Use Redis tools to search for the person and retrieve structured data
     - Query agent-memory-server to retrieve detailed memories linked to the person
     - Present the information in a clear, organized format

2. **Smart Detection**: Use your natural language understanding to determine intent:
   - **Statements about facts/events** = Store information (e.g., "Christina likes chocolate", "We met at a coffee shop", "Her birthday is December 25")
   - **Questions** = Retrieve information (e.g., "What do I know about...", "Who is...", "Tell me about...")
   - **Commands/Requests** = Usually retrieve (e.g., "Show me...", "List...", "What are...")
   - When in doubt, ask clarifying questions rather than storing information incorrectly

3. **Generate Statistics**: When asked for stats or insights, use the Redis tools to:
   - Calculate total number of people dated
   - Find most common ways you've met people
   - Identify patterns in dating history
   - Generate any other interesting analytics

4. **Update Information**: When the user shares new information about someone already in the database, update the existing record rather than creating duplicates.

Tool usage guidance:
- You have access to Redis Dating MCP server tools (prefixed with 'redis-dating_') that provide a single source of truth for structured dating information.
- **Data Schema**: Each person's record includes:
  - `name`: Person's name (original case preserved)
  - `start_date`: When you started dating (ISO format: YYYY-MM-DD, optional)
  - `end_date`: When you stopped dating (ISO format: YYYY-MM-DD, optional)
  - `how_we_met`: How/where you met (optional, legacy `meeting_place` still read)
  - `next_date`: Next planned date (ISO format: YYYY-MM-DD, optional)
  - `dates`: List of past dates with `where`, `when`, and optional `notes` (optional)
  - `details`: **READ-ONLY** - This field is computed automatically from agent-memory-server when displaying. NEVER store anything here.
  - `status`: Relationship status - "active", "past", "paused", or "exploring" (optional, default: "active")
  - `memory_tags`: Comma-separated tags for linking to unstructured memories in agent-memory-server (optional)
  - `last_updated`: Timestamp of last update (auto-generated)
  - `created_at`: Timestamp of creation (auto-generated)
- **High-Level Operations** (preferred):
  - `redis-dating_create_person`: Create a new person record (name required, all other fields optional)
  - `redis-dating_update_person`: Update existing person (name required, other fields optional for partial updates)
  - `redis-dating_get_person`: Get person by name
  - `redis-dating_list_people`: List all people (optional filters: status, active_only)
  - `redis-dating_search_people`: Search people by name (fuzzy matching)
  - `redis-dating_get_statistics`: Get dating statistics (counts, common meeting places, etc.)
  - `redis-dating_delete_person`: Delete a person record
- **Low-Level Operations** (for advanced use):
  - `redis-dating_HSET`: Direct Redis HSET operation
  - `redis-dating_HGETALL`: Direct Redis HGETALL operation
  - `redis-dating_KEYS`: Direct Redis KEYS operation
- **Memory Integration - CRITICAL RULES**:
  - **When storing NEW INFORMATION about a person** (detected from statements, not questions):
    1. First, get or create the person record using `redis-dating_get_person` or `redis-dating_create_person`
    2. Extract or generate the `memory_tags` from the person record (if missing, create tags like "person-name,dating")
    3. Store the detailed memory using agent-memory-server tools (e.g., `agent-memory-server_store_memory` or similar) with the memory_tags
    4. **NEVER update the `details` field in Redis** - it is computed automatically from memory server when displaying
  - **When answering QUESTIONS** (e.g., "What do I know about X?", "Who is Y?"):
    - Do NOT store any memories - only retrieve and present information
    - Query both Redis (for structured data) and agent-memory-server (for detailed memories)
  - **NEVER** store any information in the Redis `details` field - it is read-only and computed from agent-memory-server
  - The `details` field is automatically generated from memories in agent-memory-server when displaying in the dashboard
  - All memories, conversations, preferences, hobbies, anecdotes, and any information about a person MUST go to agent-memory-server only
- Always use these tools proactively when the user mentions someone they're dating or asks about dating history.
- When storing information, be thorough but organized - use create_person for new people, update_person for existing people.
- When retrieving information, present it in a friendly, conversational way that helps the user prepare for dates or reflect on their dating history.
- For statistics queries, use get_statistics for quick insights, or list_people with filters for detailed analysis.

General behavior:
- Be friendly, supportive, and non-judgmental
- Help the user remember important details about people they're dating
- Proactively suggest retrieving information when the user mentions going on a date
- If Redis tools are not available, inform the user but continue to help in other ways
- Clearly cite when you're retrieving information from the database
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

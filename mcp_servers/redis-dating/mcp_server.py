#!/usr/bin/env python3
"""
Redis Dating MCP Server

Provides tools for managing structured dating information in Redis.
Serves as the single source of truth for people the user is dating.
"""

import sys
import os
import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

# Add the agent directory to path so we can find the venv
agent_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), 'agent')
venv_path = os.path.join(agent_dir, 'venv', 'lib', 'python3.12', 'site-packages')
if os.path.exists(venv_path):
    sys.path.insert(0, venv_path)

import asyncio
import logging
from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import Tool, TextContent

try:
    import redis
    REDIS_AVAILABLE = True
except ImportError:
    REDIS_AVAILABLE = False

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger("redis-dating-server")

# Create server instance
server = Server("redis-dating-server")

# Redis connection
redis_client: Optional[redis.Redis] = None

def get_redis_client() -> redis.Redis:
    """Get or create Redis client."""
    global redis_client
    if redis_client is None:
        host = os.getenv("REDIS_HOST", "localhost")
        port = int(os.getenv("REDIS_PORT", "6379"))
        db = int(os.getenv("REDIS_DB", "0"))
        redis_client = redis.Redis(host=host, port=port, db=db, decode_responses=True)
    return redis_client

def normalize_name(name: str) -> str:
    """Normalize name to lowercase for use in Redis keys."""
    return name.lower().strip()

def get_person_key(name: str) -> str:
    """Get Redis key for a person."""
    return f"dating:person:{normalize_name(name)}"

def validate_status(status: Optional[str]) -> bool:
    """Validate status value."""
    if status is None:
        return True
    valid_statuses = ["active", "paused", "exploring", "not_pursuing", "past"]
    return status.lower() in valid_statuses

def get_timestamp() -> str:
    """Get current ISO timestamp."""
    return datetime.now().isoformat()

def ensure_index(normalized_name: str):
    """Ensure person is in the index set."""
    r = get_redis_client()
    r.sadd("dating:people:all", normalized_name)

def remove_from_index(normalized_name: str):
    """Remove person from index set."""
    r = get_redis_client()
    r.srem("dating:people:all", normalized_name)

# High-Level Operations

def serialize_dates_field(dates: Optional[Any]) -> Optional[str]:
    """Serialize dates data to JSON for storage."""
    if dates is None:
        return None
    
    if isinstance(dates, str):
        return dates
    
    try:
        return json.dumps(dates)
    except (TypeError, ValueError):
        raise ValueError("Dates must be JSON serializable (array of objects).")


async def create_person(name: str, start_date: Optional[str] = None, 
                       end_date: Optional[str] = None, meeting_place: Optional[str] = None,
                       details: Optional[str] = None, status: Optional[str] = None,
                       memory_tags: Optional[str] = None, how_we_met: Optional[str] = None,
                       next_date: Optional[str] = None, dates: Optional[Any] = None,
                       photo_url: Optional[str] = None) -> Dict[str, Any]:
    """Create a new person record."""
    if not name:
        return {"success": False, "error": "Name is required"}
    
    if status and not validate_status(status):
        return {"success": False, "error": "Invalid status. Must be one of: active, paused, exploring, not_pursuing"}
    
    r = get_redis_client()
    normalized_name = normalize_name(name)
    key = get_person_key(name)
    
    # Check if person already exists
    if r.exists(key):
        return {"success": False, "error": f"Person '{name}' already exists. Use update_person to modify."}
    
    # Set default status
    if not status:
        status = "active"
    
    # Create person record
    person_data = {
        "name": name,  # Preserve original case
        "status": status,
        "created_at": get_timestamp(),
        "last_updated": get_timestamp()
    }
    
    if start_date:
        person_data["start_date"] = start_date
    if end_date:
        person_data["end_date"] = end_date
    # Backwards compatibility: prefer explicit how_we_met but fall back to meeting_place
    how_we_met_value = how_we_met or meeting_place
    if how_we_met_value:
        person_data["how_we_met"] = how_we_met_value
    if details:
        person_data["details"] = details
    if memory_tags:
        person_data["memory_tags"] = memory_tags
    if next_date:
        person_data["next_date"] = next_date
    if photo_url:
        person_data["photo_url"] = photo_url
    if dates is not None:
        try:
            serialized_dates = serialize_dates_field(dates)
            if serialized_dates is not None:
                person_data["dates"] = serialized_dates
        except ValueError as e:
            return {"success": False, "error": str(e)}
    
    # Store in Redis
    r.hset(key, mapping=person_data)
    
    # Add to index
    ensure_index(normalized_name)
    
    return {"success": True, "data": person_data}

async def update_person(name: str, start_date: Optional[str] = None,
                       end_date: Optional[str] = None, meeting_place: Optional[str] = None,
                       details: Optional[str] = None, status: Optional[str] = None,
                       memory_tags: Optional[str] = None, how_we_met: Optional[str] = None,
                       next_date: Optional[str] = None, dates: Optional[Any] = None,
                       photo_url: Optional[str] = None) -> Dict[str, Any]:
    """Update an existing person record."""
    if not name:
        return {"success": False, "error": "Name is required"}
    
    if status and not validate_status(status):
        return {"success": False, "error": "Invalid status. Must be one of: active, paused, exploring, not_pursuing"}
    
    r = get_redis_client()
    normalized_name = normalize_name(name)
    key = get_person_key(name)
    
    # Check if person exists
    if not r.exists(key):
        return {"success": False, "error": f"Person '{name}' not found. Use create_person to create a new record."}
    
    # Build update data
    update_data = {"last_updated": get_timestamp()}
    
    if start_date is not None:
        update_data["start_date"] = start_date
    if end_date is not None:
        update_data["end_date"] = end_date
    if how_we_met is not None:
        update_data["how_we_met"] = how_we_met
    elif meeting_place is not None:
        # Allow legacy field to continue working
        update_data["how_we_met"] = meeting_place
    if details is not None:
        update_data["details"] = details
    if status is not None:
        update_data["status"] = status
    if memory_tags is not None:
        update_data["memory_tags"] = memory_tags
    if next_date is not None:
        update_data["next_date"] = next_date
    if photo_url is not None:
        update_data["photo_url"] = photo_url
    if dates is not None:
        try:
            serialized_dates = serialize_dates_field(dates)
            update_data["dates"] = serialized_dates if serialized_dates is not None else ""
        except ValueError as e:
            return {"success": False, "error": str(e)}
    
    # Update Redis
    r.hset(key, mapping=update_data)
    
    # Get updated record
    person_data = r.hgetall(key)
    
    return {"success": True, "data": person_data}

async def get_person(name: str) -> Dict[str, Any]:
    """Get a person's record by name."""
    if not name:
        return {"success": False, "error": "Name is required"}
    
    r = get_redis_client()
    key = get_person_key(name)
    
    if not r.exists(key):
        return {"success": False, "error": f"Person '{name}' not found"}
    
    person_data = r.hgetall(key)
    return {"success": True, "data": person_data}

async def list_people(status: Optional[str] = None, active_only: bool = False,
                     include_details: bool = True) -> Dict[str, Any]:
    """List all people with optional filtering."""
    r = get_redis_client()
    
    # Get all normalized names from index
    normalized_names = r.smembers("dating:people:all")
    
    if not normalized_names:
        return {"success": True, "data": []}
    
    people = []
    for normalized_name in normalized_names:
        key = f"dating:person:{normalized_name}"
        if not r.exists(key):
            continue
        
        person_data = r.hgetall(key)
        
        # Apply filters
        person_status = person_data.get("status", "active")
        
        if active_only and person_status != "active":
            continue
        
        if status and person_status != status:
            continue
        
        # Optionally exclude details
        if not include_details:
            person_data = {k: v for k, v in person_data.items() 
                          if k not in ["details", "memory_tags"]}
        
        people.append(person_data)
    
    return {"success": True, "data": people}

async def delete_person(name: str) -> Dict[str, Any]:
    """Delete a person record."""
    if not name:
        return {"success": False, "error": "Name is required"}
    
    r = get_redis_client()
    normalized_name = normalize_name(name)
    key = get_person_key(name)
    
    if not r.exists(key):
        return {"success": False, "error": f"Person '{name}' not found"}
    
    # Delete record
    r.delete(key)
    
    # Remove from index
    remove_from_index(normalized_name)
    
    return {"success": True, "message": f"Person '{name}' deleted"}

async def search_people(query: str, status: Optional[str] = None) -> Dict[str, Any]:
    """Search people by name (fuzzy matching)."""
    if not query:
        return {"success": False, "error": "Query is required"}
    
    r = get_redis_client()
    normalized_names = r.smembers("dating:people:all")
    
    query_lower = query.lower()
    matches = []
    
    for normalized_name in normalized_names:
        key = f"dating:person:{normalized_name}"
        if not r.exists(key):
            continue
        
        person_data = r.hgetall(key)
        person_name = person_data.get("name", "")
        
        # Check if query matches name (case-insensitive)
        if query_lower in person_name.lower() or query_lower in normalized_name:
            person_status = person_data.get("status", "active")
            
            if status and person_status != status:
                continue
            
            matches.append(person_data)
    
    return {"success": True, "data": matches}

async def get_statistics() -> Dict[str, Any]:
    """Get statistics about dating history."""
    r = get_redis_client()
    normalized_names = r.smembers("dating:people:all")
    
    total = len(normalized_names)
    status_counts = {"active": 0, "paused": 0, "exploring": 0, "not_pursuing": 0}
    legacy_status_map = {"past": "not_pursuing"}
    meeting_places = {}
    
    for normalized_name in normalized_names:
        key = f"dating:person:{normalized_name}"
        if not r.exists(key):
            continue
        
        person_data = r.hgetall(key)
        status = person_data.get("status", "active").lower()
        if status in status_counts:
            status_counts[status] += 1
        elif status in legacy_status_map:
            mapped_status = legacy_status_map[status]
            status_counts[mapped_status] += 1
        
        how_we_met = person_data.get("how_we_met") or person_data.get("meeting_place")
        if how_we_met:
            meeting_places[how_we_met] = meeting_places.get(how_we_met, 0) + 1
    
    return {
        "success": True,
        "data": {
            "total_people": total,
            "active_count": status_counts["active"],
            "paused_count": status_counts["paused"],
            "exploring_count": status_counts["exploring"],
            "not_pursuing_count": status_counts["not_pursuing"],
            "past_count": status_counts["not_pursuing"],  # Backwards compatibility
            "status_distribution": status_counts,
            "common_meeting_places": meeting_places,
            "common_how_we_met": meeting_places
        }
    }

# Low-Level Operations

async def hset(key: str, field: str, value: str) -> Dict[str, Any]:
    """Direct Redis HSET operation."""
    r = get_redis_client()
    r.hset(key, field, value)
    return {"success": True, "message": f"Set {field} on {key}"}

async def hgetall(key: str) -> Dict[str, Any]:
    """Direct Redis HGETALL operation."""
    r = get_redis_client()
    if not r.exists(key):
        return {"success": False, "error": f"Key '{key}' not found"}
    
    data = r.hgetall(key)
    return {"success": True, "data": data}

async def keys(pattern: str) -> Dict[str, Any]:
    """Direct Redis KEYS operation."""
    r = get_redis_client()
    matching_keys = r.keys(pattern)
    return {"success": True, "data": matching_keys}

# Tool Definitions

@server.list_tools()
async def list_tools() -> List[Tool]:
    """List available tools."""
    if not REDIS_AVAILABLE:
        logger.warning("Redis not available - tools will not work")
        return []
    
    return [
        # High-level operations
        Tool(
            name="create_person",
            description="Create a new person record in the dating database",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Person's name (required)"},
                    "start_date": {"type": "string", "description": "Start date in ISO format YYYY-MM-DD (optional)"},
                    "end_date": {"type": "string", "description": "End date in ISO format YYYY-MM-DD (optional)"},
                    "how_we_met": {"type": "string", "description": "How/where you met (optional)"},
                    "details": {"type": "string", "description": "Details, preferences, hobbies, etc. (optional)"},
                    "status": {"type": "string", "description": "Status: active, paused, exploring, not_pursuing (optional, default: active)"},
                    "memory_tags": {"type": "string", "description": "Comma-separated tags for linking to memories (optional)"},
                    "next_date": {"type": "string", "description": "Next scheduled date in ISO format YYYY-MM-DD (optional)"},
                    "photo_url": {"type": "string", "description": "URL or path to person's photo (optional)"},
                    "dates": {
                        "description": "List of past dates with location, date, and notes",
                        "oneOf": [
                            {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "when": {"type": "string", "description": "Date in ISO format YYYY-MM-DD"},
                                        "where": {"type": "string", "description": "Where the date happened"},
                                        "notes": {"type": "string", "description": "Notes about the date"}
                                    }
                                }
                            },
                            {
                                "type": "string",
                                "description": "JSON string array of date objects"
                            }
                        ]
                    }
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="update_person",
            description="Update an existing person record (partial updates supported)",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Person's name (required)"},
                    "start_date": {"type": "string", "description": "Start date in ISO format YYYY-MM-DD (optional)"},
                    "end_date": {"type": "string", "description": "End date in ISO format YYYY-MM-DD (optional)"},
                    "how_we_met": {"type": "string", "description": "How/where you met (optional)"},
                    "details": {"type": "string", "description": "Details, preferences, hobbies, etc. (optional)"},
                    "status": {"type": "string", "description": "Status: active, paused, exploring, not_pursuing (optional)"},
                    "memory_tags": {"type": "string", "description": "Comma-separated tags for linking to memories (optional)"},
                    "next_date": {"type": "string", "description": "Next scheduled date in ISO format YYYY-MM-DD (optional)"},
                    "photo_url": {"type": "string", "description": "URL or path to person's photo (optional)"},
                    "dates": {
                        "description": "List of past dates with location, date, and notes",
                        "oneOf": [
                            {
                                "type": "array",
                                "items": {
                                    "type": "object",
                                    "properties": {
                                        "when": {"type": "string", "description": "Date in ISO format YYYY-MM-DD"},
                                        "where": {"type": "string", "description": "Where the date happened"},
                                        "notes": {"type": "string", "description": "Notes about the date"}
                                    }
                                }
                            },
                            {
                                "type": "string",
                                "description": "JSON string array of date objects"
                            }
                        ]
                    }
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="get_person",
            description="Get a person's record by name",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Person's name (required)"}
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="list_people",
            description="List all people with optional filtering",
            inputSchema={
                "type": "object",
                "properties": {
                    "status": {"type": "string", "description": "Filter by status: active, paused, exploring, not_pursuing (optional)"},
                    "active_only": {"type": "boolean", "description": "If true, only return active people (optional, default: false)"},
                    "include_details": {"type": "boolean", "description": "Include full details in response (optional, default: true)"}
                }
            }
        ),
        Tool(
            name="delete_person",
            description="Delete a person record",
            inputSchema={
                "type": "object",
                "properties": {
                    "name": {"type": "string", "description": "Person's name (required)"}
                },
                "required": ["name"]
            }
        ),
        Tool(
            name="search_people",
            description="Search people by name (fuzzy matching)",
            inputSchema={
                "type": "object",
                "properties": {
                    "query": {"type": "string", "description": "Search query (required)"},
                    "status": {"type": "string", "description": "Filter by status (optional)"}
                },
                "required": ["query"]
            }
        ),
        Tool(
            name="get_statistics",
            description="Get statistics about dating history",
            inputSchema={
                "type": "object",
                "properties": {}
            }
        ),
        # Low-level operations
        Tool(
            name="HSET",
            description="Direct Redis HSET operation (for advanced use cases)",
            inputSchema={
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Full Redis key (e.g., 'dating:person:alice')"},
                    "field": {"type": "string", "description": "Hash field name"},
                    "value": {"type": "string", "description": "Field value"}
                },
                "required": ["key", "field", "value"]
            }
        ),
        Tool(
            name="HGETALL",
            description="Direct Redis HGETALL operation",
            inputSchema={
                "type": "object",
                "properties": {
                    "key": {"type": "string", "description": "Full Redis key"}
                },
                "required": ["key"]
            }
        ),
        Tool(
            name="KEYS",
            description="Direct Redis KEYS operation (use with caution on large datasets)",
            inputSchema={
                "type": "object",
                "properties": {
                    "pattern": {"type": "string", "description": "Key pattern (e.g., 'dating:person:*')"}
                },
                "required": ["pattern"]
            }
        )
    ]

@server.call_tool()
async def call_tool(name: str, arguments: Dict[str, Any]) -> List[TextContent]:
    """Handle tool calls."""
    logger.info(f"Tool called: {name} with arguments: {arguments}")
    
    if not REDIS_AVAILABLE:
        error_msg = json.dumps({"success": False, "error": "Redis not available. Install redis package."})
        return [TextContent(type="text", text=error_msg)]
    
    try:
        result = None
        
        # High-level operations
        if name == "create_person":
            result = await create_person(
                name=arguments.get("name"),
                start_date=arguments.get("start_date"),
                end_date=arguments.get("end_date"),
                meeting_place=arguments.get("meeting_place"),
                how_we_met=arguments.get("how_we_met"),
                details=arguments.get("details"),
                status=arguments.get("status"),
                memory_tags=arguments.get("memory_tags"),
                next_date=arguments.get("next_date"),
                dates=arguments.get("dates"),
                photo_url=arguments.get("photo_url")
            )
        elif name == "update_person":
            result = await update_person(
                name=arguments.get("name"),
                start_date=arguments.get("start_date"),
                end_date=arguments.get("end_date"),
                meeting_place=arguments.get("meeting_place"),
                how_we_met=arguments.get("how_we_met"),
                details=arguments.get("details"),
                status=arguments.get("status"),
                memory_tags=arguments.get("memory_tags"),
                next_date=arguments.get("next_date"),
                dates=arguments.get("dates"),
                photo_url=arguments.get("photo_url")
            )
        elif name == "get_person":
            result = await get_person(name=arguments.get("name"))
        elif name == "list_people":
            result = await list_people(
                status=arguments.get("status"),
                active_only=arguments.get("active_only", False),
                include_details=arguments.get("include_details", True)
            )
        elif name == "delete_person":
            result = await delete_person(name=arguments.get("name"))
        elif name == "search_people":
            result = await search_people(
                query=arguments.get("query"),
                status=arguments.get("status")
            )
        elif name == "get_statistics":
            result = await get_statistics()
        # Low-level operations
        elif name == "HSET":
            result = await hset(
                key=arguments.get("key"),
                field=arguments.get("field"),
                value=arguments.get("value")
            )
        elif name == "HGETALL":
            result = await hgetall(key=arguments.get("key"))
        elif name == "KEYS":
            result = await keys(pattern=arguments.get("pattern"))
        else:
            result = {"success": False, "error": f"Unknown tool: {name}"}
        
        # Convert result to JSON string
        result_text = json.dumps(result, indent=2)
        logger.info(f"Tool result: {result_text}")
        return [TextContent(type="text", text=result_text)]
        
    except Exception as e:
        error_msg = json.dumps({"success": False, "error": f"Error executing tool {name}: {str(e)}"})
        logger.error(error_msg)
        return [TextContent(type="text", text=error_msg)]

async def main():
    """Run the MCP server."""
    logger.info("Starting Redis Dating MCP Server...")
    
    # Test Redis connection
    try:
        r = get_redis_client()
        r.ping()
        logger.info("✅ Redis connection successful")
    except Exception as e:
        logger.error(f"❌ Redis connection failed: {e}")
        logger.error("Make sure Redis is running and REDIS_HOST, REDIS_PORT, REDIS_DB are set correctly")
    
    # Run the server with stdio transport
    async with stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options()
        )

if __name__ == "__main__":
    asyncio.run(main())



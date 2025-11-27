# Redis Dating MCP Server

## Overview

This MCP server provides a **single source of truth** for structured dating information stored in Redis. It works alongside the agent-memory-server, which stores unstructured memories about each person.

## Architecture

### Two-Tier Storage System

1. **Structured Data (This Server)**: Redis hashes storing:
   - Person's name, how you met, upcoming dates, individual date history, status
   - Basic details and metadata
   - Memory tags for linking to unstructured memories

2. **Unstructured Memories (agent-memory-server)**: 
   - Detailed conversations
   - Preferences, hobbies, anecdotes
   - Any free-form information about the person

### Data Model

**Person Record** (Redis Hash):
- Key: `dating:person:<normalized_name>` (normalized = lowercase)
- Fields: name, start_date, end_date, how_we_met, next_date, dates, details, status, memory_tags, last_updated, created_at

**Index**:
- Set: `dating:people:all` - Contains all normalized names for quick listing

## API Operations

### High-Level Operations (Preferred)

- `redis-dating_create_person` - Create new person record
- `redis-dating_update_person` - Update existing person (partial updates)
- `redis-dating_get_person` - Get person by name
- `redis-dating_list_people` - List all people (with filters)
- `redis-dating_search_people` - Fuzzy search by name
- `redis-dating_get_statistics` - Get dating statistics
- `redis-dating_delete_person` - Delete person record

### Low-Level Operations (Advanced)

- `redis-dating_HSET` - Direct Redis HSET
- `redis-dating_HGETALL` - Direct Redis HGETALL
- `redis-dating_KEYS` - Direct Redis KEYS

## Status Values

- `active` - Currently dating/seeing
- `paused` - On hold/taking a break
- `exploring` - Early stages, not exclusive
- `not_pursuing` - Decided not to pursue (replaces legacy `past`)

## Setup

1. **Redis must be running** (default: localhost:6379)

2. **Environment Variables** (optional, defaults shown):
   ```bash
   REDIS_HOST=localhost
   REDIS_PORT=6379
   REDIS_DB=0
   ```

3. **MCP Configuration**: The server is automatically configured in `mcp_servers.json`

## Usage Example

```python
# Create a person
redis-dating_create_person(
    name="Alice",
    start_date="2024-01-15",
    how_we_met="Coffee shop",
    next_date="2024-02-01",
    dates=[
        {"where": "Coffee shop", "when": "2024-01-15", "notes": "Great conversation"}
    ],
    status="active",
    memory_tags="alice,alice-smith,dating"
)

# Get person
redis-dating_get_person(name="Alice")

# List active people
redis-dating_list_people(status="active")

# Search
redis-dating_search_people(query="alice")

# Get statistics
redis-dating_get_statistics()
```

## Memory Integration

When storing unstructured memories in agent-memory-server, use the `memory_tags` from the person record to link memories:

```python
# Get person to retrieve memory_tags
person = redis-dating_get_person(name="Alice")
tags = person["data"]["memory_tags"]  # e.g., "alice,alice-smith,dating"

# Store memory with tags in agent-memory-server
agent-memory-server_store_memory(
    content="Alice loves hiking and prefers morning coffee",
    tags=tags
)
```

## Features

✅ Name normalization (lowercase keys, original case preserved)  
✅ Automatic indexing (`dating:people:all` set)  
✅ Status tracking (active, paused, exploring, not_pursuing)  
✅ Memory tag linking  
✅ Optional fields (minimal validation)  
✅ Search and filtering  
✅ Statistics and analytics  
✅ Hybrid API (high-level + low-level operations)



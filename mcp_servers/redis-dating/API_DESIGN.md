# Redis Dating API Design

## Overview
This MCP server provides tools for managing structured dating information in Redis. It serves as the single source of truth for people the user is dating, while unstructured memories are stored separately in the agent-memory-server.

## Data Model

### Person Record (Redis Hash)
**Key Pattern**: `dating:person:<normalized_name>` (normalized = lowercase)

**Fields**:
- `name` (string, required): Person's name in original case
- `start_date` (string, optional): ISO format YYYY-MM-DD
- `end_date` (string, optional): ISO format YYYY-MM-DD
- `how_we_met` (string, optional): How/where they met (legacy `meeting_place` is also read)
- `next_date` (string, optional): Next planned date in ISO format YYYY-MM-DD
- `dates` (array/string, optional): List of past dates with `where`, `when`, and optional `notes` (stored as JSON)
- `details` (string, optional, **READ-ONLY**): This field is computed automatically from agent-memory-server when displaying. Do not store data here - use agent-memory-server for all memories.
- `status` (string, optional): One of "active", "paused", "exploring", "not_pursuing" (legacy "past" values are still read)
- `memory_tags` (string, optional): Comma-separated tags for linking to agent-memory-server
- `last_updated` (string, auto): ISO timestamp of last update
- `created_at` (string, auto): ISO timestamp of creation

### Index
- **Set**: `dating:people:all` - Contains all normalized person names for quick listing

## API Operations

### High-Level Operations

#### `redis-dating_create_person`
Create a new person record.

**Parameters**:
- `name` (string, required): Person's name
- `start_date` (string, optional): ISO format YYYY-MM-DD
- `end_date` (string, optional): ISO format YYYY-MM-DD
- `how_we_met` (string, optional): How/where they met (legacy `meeting_place` is also accepted)
- `next_date` (string, optional): Next planned date in ISO format YYYY-MM-DD
- `dates` (array/string, optional): Date log entries with `where`, `when`, and optional `notes`
- `details` (string, optional): Details, preferences, etc.
- `status` (string, optional): "active", "paused", "exploring", "not_pursuing" (default: "active")
- `memory_tags` (string, optional): Comma-separated tags for memory linking

**Returns**: JSON with success status and person data

#### `redis-dating_update_person`
Update an existing person record (partial updates supported).

**Parameters**:
- `name` (string, required): Person's name (normalized automatically)
- `start_date` (string, optional): ISO format YYYY-MM-DD
- `end_date` (string, optional): ISO format YYYY-MM-DD
- `how_we_met` (string, optional): How/where they met (legacy `meeting_place` also accepted)
- `next_date` (string, optional): Next planned date in ISO format YYYY-MM-DD
- `dates` (array/string, optional): Date log entries with `where`, `when`, and optional `notes`
- `details` (string, optional): Details, preferences, etc.
- `status` (string, optional): "active", "paused", "exploring", "not_pursuing"
- `memory_tags` (string, optional): Comma-separated tags

**Returns**: JSON with success status and updated person data

#### `redis-dating_get_person`
Get a person's record by name.

**Parameters**:
- `name` (string, required): Person's name (normalized automatically)

**Returns**: JSON with person data or error if not found

#### `redis-dating_list_people`
List all people with optional filtering.

**Parameters**:
- `status` (string, optional): Filter by status ("active", "paused", "exploring", "not_pursuing")
- `active_only` (boolean, optional): If true, only return active people (default: false)
- `include_details` (boolean, optional): Include full details in response (default: true)

**Returns**: JSON array of person records

#### `redis-dating_delete_person`
Delete a person record.

**Parameters**:
- `name` (string, required): Person's name (normalized automatically)

**Returns**: JSON with success status

### Search & Analytics

#### `redis-dating_search_people`
Search people by name (fuzzy matching).

**Parameters**:
- `query` (string, required): Search query
- `status` (string, optional): Filter by status

**Returns**: JSON array of matching person records

#### `redis-dating_get_statistics`
Get statistics about dating history.

**Parameters**: None

**Returns**: JSON with:
- `total_people`: Total number of people
- `active_count`: Number of active relationships
- `not_pursuing_count`: Number of relationships that are not being pursued (legacy `past_count` is also returned for compatibility)
- `paused_count`: Number of paused relationships
- `exploring_count`: Number of exploring relationships
- `common_how_we_met`: Dict of "how we met" entries and counts (legacy `common_meeting_places` is also returned)
- `status_distribution`: Dict of status counts

### Low-Level Operations (for flexibility)

#### `redis-dating_HSET`
Direct Redis HSET operation (for advanced use cases).

**Parameters**:
- `key` (string, required): Full Redis key (e.g., "dating:person:alice")
- `field` (string, required): Hash field name
- `value` (string, required): Field value

**Returns**: JSON with success status

#### `redis-dating_HGETALL`
Direct Redis HGETALL operation.

**Parameters**:
- `key` (string, required): Full Redis key

**Returns**: JSON object with all hash fields

#### `redis-dating_KEYS`
Direct Redis KEYS operation (use with caution on large datasets).

**Parameters**:
- `pattern` (string, required): Key pattern (e.g., "dating:person:*")

**Returns**: JSON array of matching keys

## Status Values
- `active`: Currently dating/seeing
- `paused`: On hold/taking a break
- `exploring`: Early stages, not exclusive
- `not_pursuing`: Decided not to pursue (replaces legacy `past`)

## Name Normalization
- All keys use lowercase normalized names
- Original case preserved in `name` field
- Example: "Alice Smith" → key: `dating:person:alice smith`, field: `name: "Alice Smith"`

## Memory Linking
- `memory_tags` field stores comma-separated tags
- Agent should use these tags when storing memories in agent-memory-server
- Example: `memory_tags: "alice,alice-smith,dating"`

## Error Handling
All operations return JSON with:
- `success` (boolean): Operation success
- `data` (object/array): Result data (if successful)
- `error` (string): Error message (if failed)


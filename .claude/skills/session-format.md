# Claude Code Session Format

## Overview
Claude Code stores conversation logs as `.jsonl` files in `~/.claude/projects/`. Each project has its own directory with encoded path names.

## Directory Structure
```
~/.claude/projects/
├── -home-user-project-name/           # Encoded project path
│   ├── abc12345-uuid-here.jsonl       # Main session files
│   ├── agent-a1b2c3d.jsonl            # Sub-agent sessions
│   └── ...
```

### Path Encoding
Project directories use encoded paths:
- `-home-brett-crane-code-storycrafter` → `/home/brett-crane/code/storycrafter`
- Leading `-` represents `/`
- Internal `-` represents `/`

## JSONL Format
Each line is a JSON object. Key fields:

### Common Fields
| Field | Description |
|-------|-------------|
| `type` | Event type (see below) |
| `timestamp` | ISO 8601 timestamp with Z suffix |
| `session_id` | UUID identifying the session |

### Event Types

#### `init`
Session initialization with metadata:
```json
{
  "type": "init",
  "cwd": "/home/user/project",
  "git": {
    "branch": "main",
    "repo": "git@github.com:user/repo.git"
  }
}
```

#### `user`
User message:
```json
{
  "type": "user",
  "message": {
    "role": "user",
    "content": "Help me fix this bug"
  }
}
```

#### `assistant`
Claude's response (may contain multiple content blocks):
```json
{
  "type": "assistant",
  "message": {
    "role": "assistant",
    "content": [
      {"type": "thinking", "thinking": "..."},
      {"type": "text", "text": "I'll help you..."},
      {"type": "tool_use", "id": "...", "name": "Read", "input": {...}}
    ]
  }
}
```

#### `tool_use`
Tool invocation (also embedded in assistant messages):
```json
{
  "type": "tool_use",
  "name": "Read",
  "input": {
    "file_path": "/path/to/file.py"
  }
}
```

#### `tool_result`
Tool execution result:
```json
{
  "type": "tool_result",
  "tool_use_id": "...",
  "content": "file contents here..."
}
```

### Common Tool Names
| Tool | Purpose |
|------|---------|
| `Read` | Read file contents |
| `Write` | Create/overwrite file |
| `Edit` | Edit existing file |
| `Bash` | Execute shell command |
| `Glob` | Find files by pattern |
| `Grep` | Search file contents |
| `Task` | Launch sub-agent |
| `WebFetch` | Fetch URL content |
| `TodoWrite` | Update todo list |

## How This App Processes Sessions

### Session Discovery (`session_indexer.py`)
1. Scans `~/.claude/projects/` for all `.jsonl` files
2. Extracts metadata from `init` event (cwd, git branch)
3. Counts messages, tools, file modifications
4. Caches results for 5 minutes (TTL cache)

### Full-Text Search
1. First checks metadata (project name, cwd, git branch)
2. If no match, reads entire `.jsonl` file and searches raw content
3. Case-insensitive matching

### Timeline Events (`log_parser.py`)
Converts raw JSONL entries into structured `TimelineEvent` objects:
- Extracts text content from nested structures
- Identifies file paths from tool inputs
- Tracks files read vs. modified
- Optionally includes/excludes thinking blocks

### File Tracking
Files are categorized as:
- **Modified**: `Write`, `Edit` tool targets
- **Read**: `Read` tool targets

## Session Metadata Model
```python
class SessionSummary:
    session_id: str
    project_path: str
    project_name: str
    file_path: str          # Path to .jsonl file
    start_time: datetime
    end_time: datetime
    duration_seconds: int
    git_branch: str | None
    cwd: str | None
    message_count: int
    tool_count: int
    files_modified_count: int
    file_size_bytes: int
```

## Handling Edge Cases
- **Timezone mixing**: Some timestamps are timezone-naive, others UTC. Use `_get_sort_time()` to normalize.
- **Large sessions**: Virtual scrolling handles 500+ events efficiently.
- **Corrupted lines**: Skip unparseable JSON lines gracefully.
- **Agent sessions**: `agent-*.jsonl` files are sub-sessions spawned by main session.

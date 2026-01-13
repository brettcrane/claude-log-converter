# Sample Data

Example Claude Code session logs for testing and demonstration.

## Usage

To load sample data:

```bash
./load-samples.sh
```

This copies the demo sessions to your Claude projects directory.

## JSONL Format

Each session file is a `.jsonl` (JSON Lines) file where each line is a JSON object representing an event.

### Event Types

- `user` - User message
- `assistant` - Claude's response
- `tool_use` - Tool invocation (Read, Write, Bash, etc.)
- `tool_result` - Result from a tool execution
- `summary` - Session summary event

### Example Event

```json
{"type": "user", "message": {"content": "Help me fix the bug in auth.py"}, "timestamp": "2026-01-10T10:30:00Z"}
```

## Demo Sessions

- **session-bugfix.jsonl** - Simple bug fix workflow
- **session-feature.jsonl** - Feature implementation
- **session-debug.jsonl** - Debugging session with tool usage

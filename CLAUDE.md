# Claude Log Converter - Claude Code Instructions

## Overview
Web application for browsing and analyzing Claude Code session logs. Converts `.jsonl` session files into an interactive, searchable interface.

**For pending work items, see [TODO.md](TODO.md)**

## Tech Stack
- **Backend**: Python 3.12, FastAPI, Pydantic
- **Frontend**: React 18, TypeScript, Vite, Tailwind CSS
- **State Management**: Zustand
- **Key Dependencies**: @tanstack/react-query, @tanstack/react-virtual, lucide-react

## Architecture
**Single-server design** - FastAPI serves both API and static frontend. No separate servers needed.

**Hybrid data approach** - JSONL files remain source of truth, SQLite provides fast indexing and FTS5 search.

```
claude-log-converter/
├── app/                  # FastAPI backend
│   ├── api/routes/       # API endpoints
│   ├── services/         # Business logic (log_parser, session_indexer, session_db)
│   ├── models/           # Pydantic models
│   └── mcp_server.py     # MCP server for Claude Code integration
├── frontend/             # React source code (KEEP THIS - needed for changes)
├── static/               # Built frontend (gitignored, regenerated)
├── archive/              # Legacy/unmaintained code
├── .claude/              # Claude Code config
│   ├── commands/         # Custom slash commands
│   └── skills/           # Domain knowledge documentation
├── run.py                # Single entry point (web app)
└── requirements.txt
```

### SQLite Backend
- **Fast search**: 100-500x faster than file scanning using FTS5 full-text search
- **Hybrid approach**: JSONL files remain immutable source of truth, SQLite is expendable cache
- **Auto-sync**: Detects new/modified sessions on startup via file mtime tracking
- **Zero risk**: Can rebuild index from JSONL at any time (safe to delete `sessions.db`)
- **Feature flag**: Set `CLAUDE_LOG_USE_SQLITE_INDEX=false` to disable (falls back to file scanning)
- **Database location**: `~/.claude-log-converter/sessions.db`

### MCP Server (Session Memory)
The MCP server allows Claude Code to query its own past sessions, providing "memory" of previous work.

**Tools exposed:**
| Tool | Description |
|------|-------------|
| `search_sessions` | Full-text search with matching snippets |
| `get_session` | Get full session details with timeline |
| `get_session_summary` | Quick overview (metadata only, no conversation) |
| `search_in_session` | Search within a session for specific content |
| `list_sessions` | List recent sessions with filters |
| `list_projects` | List all indexed projects |
| `list_bookmarks` | View saved bookmarks |
| `create_bookmark` | Bookmark important events |
| `delete_bookmark` | Remove bookmarks |

**Setup:**
```bash
# Add to Claude Code (user-wide)
claude mcp add session-memory --scope user -- python -m app.mcp_server

# Or add to ~/.claude.json manually
```

**Configuration example (`~/.claude.json`):**
```json
{
  "mcpServers": {
    "session-memory": {
      "type": "stdio",
      "command": "python",
      "args": ["-m", "app.mcp_server"],
      "cwd": "/path/to/claude-log-converter"
    }
  }
}
```

**Example use cases:**
- "What did I work on yesterday?"
- "Find the session where I fixed the authentication bug"
- "How did I implement caching before?"

## CRITICAL: TODO.md Workflow
**Update TODO.md IMMEDIATELY after completing any task from the list.**

1. When you finish implementing a TODO item → Update TODO.md right away
2. Move completed items to the "Completed" section with date and brief summary
3. If you verify something is already done → Mark it complete with a note

This prevents wasted context in future sessions re-investigating completed work.

## Development

### Running the App
```bash
# From project root
source .venv/bin/activate
python run.py
# Opens at http://localhost:8000
```

### Frontend Development (with hot reload)
```bash
cd frontend
npm run dev          # Runs on http://localhost:5173, proxies API to :8000
```

### Building Frontend
```bash
cd frontend
npm run build        # Outputs to ../static/
```

### Key Commands
| Command | Description |
|---------|-------------|
| `python run.py` | Start web server (serves built frontend) |
| `python -m app.mcp_server` | Start MCP server (for Claude Code integration) |
| `cd frontend && npm run dev` | Frontend dev with hot reload |
| `cd frontend && npm run build` | Build frontend to static/ |
| `ruff check app/` | Lint Python code |
| `ruff check app/ --fix` | Auto-fix linting issues |

## Pre-Commit Checklist
Before any commit, verify:
1. `cd frontend && npm run build` passes
2. `ruff check app/` passes (no linting errors)
3. App runs without errors: `python run.py`

## API Endpoints
| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects |
| `/api/sessions` | GET | List sessions (filters: project, date, search) |
| `/api/sessions/{id}` | GET | Full session details |
| `/api/sessions/cache/clear` | POST | Clear cache & sync new/stale sessions |
| `/api/sessions/index/rebuild` | POST | Rebuild entire SQLite index from JSONL |
| `/api/sessions/index/stats` | GET | Get index statistics (enabled, session count) |
| `/api/export/{id}/markdown` | GET | Export as markdown |
| `/api/export/{id}/json` | GET | Export as JSON |
| `/api/upload` | POST | Upload JSONL file |

## Key Features
- **Lightning-fast search** - SQLite FTS5 full-text search (100-500x faster than file scanning)
- **Session list** with full-text search (searches conversation content, not just metadata)
- **Interactive timeline** with virtual scrolling for large sessions
- **Collapsible sidebar** (toggle via header button)
- **Refresh button** to find new sessions (auto-syncs index incrementally)
- **Export** to Markdown/JSON
- **File upload** for external .jsonl logs
- **Persistent cache** - Index survives restarts, no re-parsing needed

## Best Practices

### Code Changes
- NEVER propose changes to code you haven't read first
- Avoid over-engineering—only make directly requested changes
- Don't add features or "improvements" beyond what was asked

### Frontend Changes
- Edit files in `frontend/src/`
- Run `npm run build` after changes to update `static/`
- The `static/` directory is gitignored (regenerated from source)

### Git Workflow
- Run build checks before committing (use `/commit` command)
- Use conventional commit messages
- Never force push to main

## Session Data
Sessions are read from `~/.claude/projects/` (configurable via `CLAUDE_LOG_CLAUDE_PROJECTS_DIR`).

### JSONL Format
Each line is a JSON object with `type` field: `user`, `assistant`, `tool_use`, `tool_result`, etc.

## SQLite Index Management

### Configuration
Environment variables (prefix: `CLAUDE_LOG_`):
- `CLAUDE_LOG_DB_PATH` - Database path (default: `~/.claude-log-converter/sessions.db`)
- `CLAUDE_LOG_USE_SQLITE_INDEX` - Enable SQLite backend (default: `true`)
- `CLAUDE_LOG_CLAUDE_PROJECTS_DIR` - Source directory for JSONL files

### Rebuild Index
If the index gets corrupted or out of sync:
```bash
# Via API (while app is running)
curl -X POST http://localhost:8000/api/sessions/index/rebuild

# Or delete database file and restart (auto-rebuilds)
rm ~/.claude-log-converter/sessions.db
python run.py
```

### Check Index Status
```bash
# Get index statistics
curl http://localhost:8000/api/sessions/index/stats
```

### Disable SQLite (Fallback Mode)
If SQLite causes issues, disable it temporarily:
```bash
export CLAUDE_LOG_USE_SQLITE_INDEX=false
python run.py
```
The app will fall back to the original file-scanning approach (slower search, but works without SQLite).

### How It Works
1. **On startup**: Checks for new/modified JSONL files via mtime tracking
2. **Incremental sync**: Only indexes changed files (fast)
3. **On search**: Uses FTS5 full-text index for instant results
4. **On detail view**: Reconstructs session from indexed events (falls back to JSONL if stale)
5. **On refresh**: Clears cache and re-syncs (picks up new sessions immediately)

### Troubleshooting
- **Slow startup**: Large number of new sessions detected. Check logs for sync progress.
- **Missing sessions**: Click "Refresh" button to trigger incremental sync.
- **Corrupted database**: Delete `sessions.db` file, restart app to rebuild from JSONL.
- **Search not working**: Check `/api/sessions/index/stats` to verify SQLite is enabled.

For detailed analysis, see:
- `SQLITE_RECOMMENDATION.md` - Implementation plan and decision rationale
- `SQLITE_ANALYSIS.md` - Comprehensive technical analysis
- `PERFORMANCE_COMPARISON.md` - Benchmarks and performance data

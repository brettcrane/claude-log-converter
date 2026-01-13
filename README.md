# Claude Code Log Converter

> Web application for browsing and analyzing Claude Code session logs.
> Converts `.jsonl` session files into an interactive, searchable interface.

## Features

- **Lightning-fast search** - SQLite FTS5 indexes all conversation content (100-500x faster than file scanning)
- **Interactive timeline** - Virtual scrolling handles sessions with 500+ events smoothly
- **Bookmark important moments** - Mark and navigate to key decisions or code changes
- **Export** - Download sessions as Markdown or JSON for sharing or archival
- **MCP Integration** - Let Claude Code query its own past sessions for "memory" (optional)

## Quick Start

### Option 1: Automated Setup (Recommended)

```bash
git clone https://github.com/YOUR_USERNAME/claude-log-converter.git
cd claude-log-converter
./setup.sh
python run.py
```

Open http://localhost:8000

### Option 2: Manual Setup

```bash
# Prerequisites: Python 3.12+, Node.js 18+

# Backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..

# Run
python run.py
```

### Option 3: Docker

```bash
docker-compose up
```

Open http://localhost:8000

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_LOG_CLAUDE_PROJECTS_DIR` | `~/.claude/projects` | Where to find session logs |
| `CLAUDE_LOG_DB_PATH` | `~/.claude-log-converter/sessions.db` | SQLite database location |
| `CLAUDE_LOG_USE_SQLITE_INDEX` | `true` | Set `false` to disable SQLite indexing |

Copy `.env.example` to `.env` to customize these settings.

## Sample Data

New to Claude Code? Load sample sessions to explore the interface:

```bash
./sample-data/load-samples.sh
```

This copies demo sessions to your projects directory so you can see how the interface works.

## Documentation

- [Contributing](CONTRIBUTING.md) - How to set up a development environment and submit changes
- [MCP Server Setup](docs/MCP_SETUP.md) - Enable Claude Code to query its own past sessions

## Architecture

```
+-----------------------------------------------------------+
|                    Claude Log Converter                    |
+-----------------------------------------------------------+
|  Frontend (React + TypeScript + Tailwind)                  |
|  |-- Session List with full-text search                    |
|  |-- Timeline viewer with virtual scrolling                |
|  |-- Bookmark system                                       |
|  +-- Export (Markdown/JSON)                                |
+-----------------------------------------------------------+
|  Backend (FastAPI + Python)                                |
|  |-- REST API                                              |
|  |-- SQLite FTS5 for fast search                           |
|  +-- JSONL file parsing                                    |
+-----------------------------------------------------------+
|  Data Layer                                                |
|  |-- Source: ~/.claude/projects/*.jsonl (immutable)        |
|  |-- Index: SQLite database (expendable cache)             |
|  +-- Bookmarks: Separate SQLite database                   |
+-----------------------------------------------------------+
|  Optional: MCP Server                                      |
|  +-- Exposes session data to Claude Code                   |
+-----------------------------------------------------------+
```

### How It Works

1. **Single-server design** - FastAPI serves both the REST API and the built frontend. No separate servers needed.

2. **Hybrid data approach** - JSONL files remain the immutable source of truth. SQLite provides fast indexing and FTS5 full-text search. The database is an expendable cache - delete it anytime and it rebuilds automatically.

3. **Incremental sync** - On startup, only new or modified session files are indexed. Subsequent searches hit the SQLite index for instant results.

## Why the Complexity?

This project makes deliberate architectural choices that might seem over-engineered at first glance. Here's the reasoning:

### Why SQLite instead of just reading files?

Searching 500+ session files with grep takes 10-30 seconds. SQLite FTS5 does it in 50ms. The SQLite database is an expendable cache - delete it anytime and it rebuilds from the source JSONL files. Zero risk, massive speedup.

### Why virtual scrolling?

Sessions can have 500+ events. Without virtualization, rendering all those DOM nodes makes the page unusable. `@tanstack/react-virtual` renders only visible items, keeping the UI responsive regardless of session size.

### Why Zustand instead of just React state?

Session filters, pagination, and bookmark lookups are used across many components. Prop drilling would be painful. Zustand is only 2.5KB and provides clean global state without the boilerplate of Redux.

### Why is the MCP server separate?

It's an optional power-user feature for Claude Code integration. Regular users don't need it. Keeping it separate means the web app works standalone without any extra configuration.

## API Reference

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/projects` | GET | List all projects |
| `/api/sessions` | GET | List sessions with filters (project, date, search) |
| `/api/sessions/{id}` | GET | Full session details with timeline |
| `/api/sessions/cache/clear` | POST | Clear cache and sync new/stale sessions |
| `/api/sessions/index/rebuild` | POST | Rebuild entire SQLite index from JSONL |
| `/api/sessions/index/stats` | GET | Get index statistics |
| `/api/export/{id}/markdown` | GET | Export session as Markdown |
| `/api/export/{id}/json` | GET | Export session as JSON |
| `/api/upload` | POST | Upload JSONL file |

## Troubleshooting

### Missing sessions after adding new files

Click the "Refresh" button in the UI, or call:
```bash
curl -X POST http://localhost:8000/api/sessions/cache/clear
```

### Search seems slow or not working

Check if SQLite indexing is enabled:
```bash
curl http://localhost:8000/api/sessions/index/stats
```

If `enabled` is `false`, set `CLAUDE_LOG_USE_SQLITE_INDEX=true` and restart.

### Corrupted database

Delete the database file and restart - it will rebuild automatically:
```bash
rm ~/.claude-log-converter/sessions.db
python run.py
```

### Port 8000 already in use

Either stop the other process or set a different port:
```bash
uvicorn app.main:app --port 8001
```

## Development

### Frontend development with hot reload

```bash
# Terminal 1: Start backend
source .venv/bin/activate
python run.py

# Terminal 2: Start frontend dev server
cd frontend
npm run dev
```

The frontend dev server runs on http://localhost:5173 with hot reload, proxying API requests to the backend on port 8000.

### Code quality

```bash
# Python linting
ruff check app/
ruff check app/ --fix  # Auto-fix issues

# Build frontend
cd frontend && npm run build
```

## License

MIT License - see [LICENSE](LICENSE)

---

Built for exploring and learning from Claude Code session history.

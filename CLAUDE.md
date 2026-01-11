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

```
claude-log-converter/
├── app/                  # FastAPI backend
│   ├── api/routes/       # API endpoints
│   ├── services/         # Business logic (log_parser, session_indexer)
│   └── models/           # Pydantic models
├── frontend/             # React source code (KEEP THIS - needed for changes)
├── static/               # Built frontend (gitignored, regenerated)
├── archive/              # Legacy/unmaintained code
├── .claude/              # Claude Code config
│   ├── commands/         # Custom slash commands
│   └── skills/           # Domain knowledge documentation
├── run.py                # Single entry point
└── requirements.txt
```

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
| `python run.py` | Start production server (serves built frontend) |
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
| `/api/sessions/cache/clear` | POST | Clear session cache (for refresh) |
| `/api/export/{id}/markdown` | GET | Export as markdown |
| `/api/export/{id}/json` | GET | Export as JSON |
| `/api/upload` | POST | Upload JSONL file |

## Key Features
- **Session list** with full-text search (searches conversation content, not just metadata)
- **Interactive timeline** with virtual scrolling for large sessions
- **Collapsible sidebar** (toggle via header button)
- **Refresh button** to find new sessions (clears 5-minute cache)
- **Export** to Markdown/JSON
- **File upload** for external .jsonl logs

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

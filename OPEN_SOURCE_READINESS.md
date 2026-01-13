# Open Source Readiness Plan

A comprehensive plan for preparing Claude Log Converter for public release on GitHub.

**Created:** January 2026
**Status:** Pre-release assessment
**Estimated effort:** 2-3 days of focused work

---

## Executive Summary

### Current State
The codebase architecture is **solid and appropriate** for its scope. The complexity is justified by real requirements (fast search, virtual scrolling, bookmark navigation). Dependencies are lean compared to typical projects.

However, the project has **critical gaps in documentation and onboarding** that would prevent external users from successfully running the application.

### Key Findings

| Aspect | Score | Verdict |
|--------|-------|---------|
| Architecture | 8/10 | Clean separation, appropriate patterns |
| Dependencies | 9/10 | Lean - 7 Python, 13 JS runtime |
| Code Quality | 7/10 | Some large components, but readable |
| Documentation | 2/10 | README is empty, setup undocumented |
| Setup Experience | 3/10 | 10+ manual steps, no automation |
| Open-Source Readiness | 4/10 | Needs significant prep work |

### Bottom Line
The code won't scare contributors away - but the empty README and lack of setup automation will. Fix documentation and onboarding, clean up dead code, and this is ready for public release.

---

## Priority 1: Critical (Must-Have Before Release)

These items are blocking. Without them, users cannot successfully use the project.

### 1.1 Write a Complete README

**Current state:** 2 lines (title only)
**Effort:** 1-2 hours

Create a comprehensive README.md with:

```markdown
# Claude Code Log Converter

> Web application for browsing and analyzing Claude Code session logs.
> Converts `.jsonl` session files into an interactive, searchable interface.

![Screenshot](docs/images/screenshot.png)

## Features

- **Lightning-fast search** - SQLite FTS5 indexes all conversation content
- **Interactive timeline** - Virtual scrolling handles sessions with 500+ events
- **Bookmark important moments** - Mark and navigate to key decisions
- **Export** - Download sessions as Markdown or JSON
- **MCP Integration** - Let Claude Code query its own past sessions (optional)

## Quick Start

### Option 1: Automated Setup (Recommended)

\`\`\`bash
git clone https://github.com/YOUR_USERNAME/claude-log-converter.git
cd claude-log-converter
./setup.sh
python run.py
\`\`\`

Open http://localhost:8000

### Option 2: Manual Setup

\`\`\`bash
# Prerequisites: Python 3.12+, Node.js 18+

# Backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt

# Frontend
cd frontend && npm install && npm run build && cd ..

# Run
python run.py
\`\`\`

### Option 3: Docker

\`\`\`bash
docker-compose up
\`\`\`

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `CLAUDE_LOG_CLAUDE_PROJECTS_DIR` | `~/.claude/projects` | Where to find session logs |
| `CLAUDE_LOG_DB_PATH` | `~/.claude-log-converter/sessions.db` | SQLite database location |
| `CLAUDE_LOG_USE_SQLITE_INDEX` | `true` | Set `false` to disable SQLite |

## Sample Data

New to Claude Code? Load sample sessions to explore the interface:

\`\`\`bash
./scripts/load-sample-data.sh
\`\`\`

## Documentation

- [Installation Guide](docs/INSTALL.md)
- [User Guide](docs/USER_GUIDE.md)
- [MCP Server Setup](docs/MCP_SETUP.md) (for Claude Code integration)
- [API Reference](docs/API.md)
- [Contributing](CONTRIBUTING.md)

## License

MIT License - see [LICENSE](LICENSE)
```

### 1.2 Create Setup Automation

**Current state:** No automation
**Effort:** 30 minutes

Create `setup.sh`:

```bash
#!/bin/bash
set -e

echo "=== Claude Log Converter Setup ==="
echo ""

# Check Python
if ! command -v python3 &> /dev/null; then
    echo "Error: Python 3 is required but not installed."
    exit 1
fi

PYTHON_VERSION=$(python3 -c 'import sys; print(f"{sys.version_info.major}.{sys.version_info.minor}")')
echo "Found Python $PYTHON_VERSION"

# Check Node
if ! command -v node &> /dev/null; then
    echo "Error: Node.js is required but not installed."
    exit 1
fi

NODE_VERSION=$(node --version)
echo "Found Node.js $NODE_VERSION"

# Create virtual environment
echo ""
echo "Creating Python virtual environment..."
python3 -m venv .venv
source .venv/bin/activate

# Install Python dependencies
echo "Installing Python dependencies..."
pip install -q -r requirements.txt

# Install and build frontend
echo "Installing frontend dependencies..."
cd frontend
npm install --silent
echo "Building frontend..."
npm run build
cd ..

echo ""
echo "============================================"
echo "Setup complete!"
echo ""
echo "To start the application:"
echo "  source .venv/bin/activate"
echo "  python run.py"
echo ""
echo "Then open http://localhost:8000"
echo "============================================"
```

Make executable: `chmod +x setup.sh`

### 1.3 Add Sample Data

**Current state:** None - users see empty UI
**Effort:** 1 hour

Create `sample-data/` directory with 5-10 example session files:

```
sample-data/
├── README.md              # Explains the JSONL format
├── demo-project/
│   ├── session-1.jsonl    # Simple bug fix session
│   ├── session-2.jsonl    # Feature implementation
│   ├── session-3.jsonl    # Code review session
│   └── session-4.jsonl    # Debugging session
└── load-samples.sh        # Copies to expected location
```

Create `sample-data/load-samples.sh`:

```bash
#!/bin/bash
DEST="${CLAUDE_LOG_CLAUDE_PROJECTS_DIR:-$HOME/.claude/projects}/demo-project"
mkdir -p "$DEST"
cp -r "$(dirname "$0")/demo-project/"* "$DEST/"
echo "Sample data loaded to $DEST"
echo "Restart the app and refresh to see sample sessions."
```

### 1.4 Add LICENSE File

**Current state:** Missing
**Effort:** 5 minutes

Create `LICENSE` with MIT License (or your preferred license):

```
MIT License

Copyright (c) 2026 [Your Name]

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

### 1.5 Add .env.example

**Current state:** Environment variables undocumented
**Effort:** 10 minutes

Create `.env.example`:

```bash
# Claude Log Converter Configuration
# Copy this file to .env and modify as needed

# ============================================
# Data Source
# ============================================

# Directory containing Claude Code session logs
# Default: ~/.claude/projects
CLAUDE_LOG_CLAUDE_PROJECTS_DIR=~/.claude/projects

# ============================================
# Database Settings
# ============================================

# SQLite database location (created automatically)
# Default: ~/.claude-log-converter/sessions.db
CLAUDE_LOG_DB_PATH=~/.claude-log-converter/sessions.db

# Enable SQLite indexing for fast search
# Set to 'false' to fall back to file scanning (slower but simpler)
# Default: true
CLAUDE_LOG_USE_SQLITE_INDEX=true

# ============================================
# Cache Settings (when SQLite disabled)
# ============================================

# Cache TTL in seconds
CLAUDE_LOG_CACHE_TTL_SECONDS=300

# Maximum cached sessions
CLAUDE_LOG_CACHE_MAX_SIZE=100
```

---

## Priority 2: Important (Should-Have)

These significantly improve the user experience and contributor onboarding.

### 2.1 Add Docker Support

**Effort:** 30-45 minutes

Create `Dockerfile`:

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install Node.js for frontend build
RUN apt-get update && apt-get install -y nodejs npm && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Install and build frontend
COPY frontend/package*.json frontend/
RUN cd frontend && npm install

COPY frontend/ frontend/
RUN cd frontend && npm run build

# Copy application
COPY app/ app/
COPY run.py .

EXPOSE 8000

CMD ["python", "run.py"]
```

Create `docker-compose.yml`:

```yaml
version: '3.8'

services:
  app:
    build: .
    ports:
      - "8000:8000"
    volumes:
      # Mount your Claude projects directory (read-only)
      - ~/.claude/projects:/data/projects:ro
      # Persist database
      - claude-log-data:/data/db
    environment:
      - CLAUDE_LOG_CLAUDE_PROJECTS_DIR=/data/projects
      - CLAUDE_LOG_DB_PATH=/data/db/sessions.db

volumes:
  claude-log-data:
```

Add `.dockerignore`:

```
.venv/
.git/
__pycache__/
*.pyc
node_modules/
.env
*.db
archive/
```

### 2.2 Add CONTRIBUTING.md

**Effort:** 30 minutes

Create `CONTRIBUTING.md`:

```markdown
# Contributing to Claude Log Converter

Thank you for your interest in contributing!

## Development Setup

1. Fork and clone the repository
2. Run `./setup.sh` to install dependencies
3. Start the backend: `python run.py`
4. Start frontend dev server: `cd frontend && npm run dev`

The frontend dev server runs on http://localhost:5173 with hot reload,
proxying API requests to the backend on port 8000.

## Code Style

### Python
- We use [ruff](https://github.com/astral-sh/ruff) for linting
- Run `ruff check app/` before committing
- Run `ruff check app/ --fix` to auto-fix issues

### TypeScript/React
- Use TypeScript strict mode
- Follow existing component patterns
- Prefer functional components with hooks

## Pull Request Process

1. Create a feature branch from `main`
2. Make your changes
3. Ensure all checks pass:
   - `ruff check app/`
   - `cd frontend && npm run build`
   - `python run.py` starts without errors
4. Submit a PR with a clear description

## Project Structure

\`\`\`
app/                  # FastAPI backend
├── api/routes/       # API endpoints
├── services/         # Business logic
└── models/           # Pydantic schemas

frontend/             # React frontend
├── src/components/   # UI components
├── src/pages/        # Route pages
├── src/stores/       # Zustand state
└── src/services/     # API client
\`\`\`

## Questions?

Open an issue or start a discussion.
```

### 2.3 Delete Dead Code

**Effort:** 15 minutes

Files to delete:

| File | Reason |
|------|--------|
| `archive/claude-log-converter.py` | Superseded by app/services/ |
| `sqlite_implementation_example.py` | Was proof of concept |
| `app/models/event.py` | Only 6 lines, models are in session.py |

Commands:
```bash
rm archive/claude-log-converter.py
rm sqlite_implementation_example.py
rm app/models/event.py
```

Update `app/models/__init__.py` to remove event import if present.

### 2.4 Archive Historical Documentation

**Effort:** 10 minutes

Move planning documents to archive:

```bash
mkdir -p docs/archive

# Move historical planning docs
mv SQLITE_ANALYSIS.md docs/archive/
mv SQLITE_IMPLEMENTATION_SUMMARY.md docs/archive/
mv SQLITE_RECOMMENDATION.md docs/archive/
mv IMPLEMENTATION_PLAN_BOOKMARKS.md docs/archive/
mv PERFORMANCE_COMPARISON.md docs/archive/
mv docs/NAVIGATION_IMPLEMENTATION_PLAN.md docs/archive/
mv docs/NAVIGATION_REDESIGN_PROPOSAL.md docs/archive/
```

Add `docs/archive/README.md`:
```markdown
# Archived Documentation

Historical planning and analysis documents from development.
These are preserved for reference but are no longer actively maintained.
```

### 2.5 Extract Duplicated Utilities

**Effort:** 20 minutes

Create `app/utils/text.py`:

```python
"""Text utility functions."""


def truncate_text(text: str, max_length: int = 200) -> str:
    """Truncate text to max_length, adding ellipsis if needed."""
    if len(text) <= max_length:
        return text
    return text[: max_length - 3] + "..."
```

Create `app/utils/paths.py`:

```python
"""Path utility functions."""

import base64
from pathlib import Path


def decode_project_path(encoded_dir_name: str) -> str:
    """
    Decode a Claude project directory name to get the original path.

    Claude encodes project paths as: -{base64_encoded_path}
    Example: -L2hvbWUvdXNlci9jb2Rl -> /home/user/code
    """
    if not encoded_dir_name.startswith("-"):
        return encoded_dir_name

    encoded_part = encoded_dir_name[1:]  # Remove leading dash

    # Add padding if needed
    padding_needed = 4 - (len(encoded_part) % 4)
    if padding_needed != 4:
        encoded_part += "=" * padding_needed

    try:
        decoded_bytes = base64.b64decode(encoded_part)
        return decoded_bytes.decode("utf-8")
    except Exception:
        return encoded_dir_name
```

Update imports in `session_db.py` and `session_indexer.py` to use shared utilities.

---

## Priority 3: Nice-to-Have (Polish)

These items improve polish but aren't blocking release.

### 3.1 Add First-Run Experience

Modify `app/main.py` startup to detect empty state:

```python
@app.on_event("startup")
async def startup_event():
    init_database()

    # Check for data directory
    if not settings.claude_projects_dir.exists():
        logger.warning(
            f"Data directory not found: {settings.claude_projects_dir}\n"
            "Set CLAUDE_LOG_CLAUDE_PROJECTS_DIR or use the upload feature.\n"
            "See README.md for setup instructions."
        )
```

Add a "Getting Started" banner in the frontend when no sessions exist.

### 3.2 Add Startup Validation

Create `app/startup.py`:

```python
"""Startup validation and health checks."""

import sys
from pathlib import Path

def validate_environment():
    """Check prerequisites and print helpful messages."""

    # Check frontend build
    static_dir = Path(__file__).parent.parent / "static"
    if not (static_dir / "index.html").exists():
        print("Warning: Frontend not built. Run: cd frontend && npm run build")

    # Check Python version
    if sys.version_info < (3, 10):
        print(f"Warning: Python 3.10+ recommended (found {sys.version})")
```

### 3.3 Add Screenshot to README

**Effort:** 15 minutes

1. Take a screenshot of the app with sample data loaded
2. Save to `docs/images/screenshot.png`
3. Reference in README: `![Screenshot](docs/images/screenshot.png)`

### 3.4 Split Large Components

The following components exceed 400 lines and could be split:

| Component | Lines | Suggestion |
|-----------|-------|------------|
| `Timeline.tsx` | 442 | Extract scroll logic to `useScrollToEvent.ts` hook |
| `TimelineEvent.tsx` | 396 | Extract tool renderers to `timeline/renderers/` |
| `SessionDetailPage.tsx` | 445 | Extract tab content to separate components |

This is optional - the components work fine, they're just harder to navigate.

### 3.5 Add CI/CD

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.12'
      - run: pip install ruff
      - run: ruff check app/

  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: cd frontend && npm install && npm run build
```

---

## Cleanup Checklist

### Files to Delete
- [ ] `archive/claude-log-converter.py`
- [ ] `sqlite_implementation_example.py`
- [ ] `app/models/event.py` (if empty/minimal)

### Files to Archive (move to docs/archive/)
- [ ] `SQLITE_ANALYSIS.md`
- [ ] `SQLITE_IMPLEMENTATION_SUMMARY.md`
- [ ] `SQLITE_RECOMMENDATION.md`
- [ ] `IMPLEMENTATION_PLAN_BOOKMARKS.md`
- [ ] `PERFORMANCE_COMPARISON.md`
- [ ] `docs/NAVIGATION_IMPLEMENTATION_PLAN.md`
- [ ] `docs/NAVIGATION_REDESIGN_PROPOSAL.md`

### Files to Create
- [ ] `README.md` (rewrite)
- [ ] `LICENSE`
- [ ] `CONTRIBUTING.md`
- [ ] `.env.example`
- [ ] `setup.sh`
- [ ] `Dockerfile`
- [ ] `docker-compose.yml`
- [ ] `.dockerignore`
- [ ] `sample-data/` directory with demo sessions
- [ ] `docs/images/screenshot.png`
- [ ] `app/utils/text.py`
- [ ] `app/utils/paths.py`

### Files to Update
- [ ] `app/models/__init__.py` - remove event import
- [ ] `app/services/session_db.py` - use shared utilities
- [ ] `app/services/session_indexer.py` - use shared utilities
- [ ] `app/services/log_parser.py` - use shared truncate_text
- [ ] `app/services/export_service.py` - use shared truncate_text

---

## Implementation Order

### Day 1: Critical Documentation (3-4 hours)
1. Write complete README.md
2. Create LICENSE file
3. Create .env.example
4. Create setup.sh and test it

### Day 2: Sample Data & Docker (2-3 hours)
1. Create sample session files
2. Create sample data loader script
3. Create Dockerfile and docker-compose.yml
4. Test Docker setup

### Day 3: Cleanup & Polish (2-3 hours)
1. Delete dead code files
2. Archive historical documentation
3. Extract shared utilities
4. Create CONTRIBUTING.md
5. Add screenshot to docs
6. Final testing of full setup flow

---

## Success Criteria

The project is ready for open-source release when:

1. **5-Minute Test**: A developer can clone, run `./setup.sh`, and see the app with sample data in under 5 minutes
2. **Docker Test**: `docker-compose up` works with zero configuration
3. **Empty Repo Test**: README clearly explains what the project does and how to use it
4. **Contributor Test**: CONTRIBUTING.md explains how to set up a dev environment
5. **License Test**: LICENSE file exists with clear terms

---

## Appendix: Architecture Summary (for README)

```
┌─────────────────────────────────────────────────────────┐
│                    Claude Log Converter                  │
├─────────────────────────────────────────────────────────┤
│  Frontend (React + TypeScript + Tailwind)               │
│  ├── Session List with search                           │
│  ├── Timeline viewer with virtual scrolling             │
│  ├── Bookmark system                                    │
│  └── Export (Markdown/JSON)                             │
├─────────────────────────────────────────────────────────┤
│  Backend (FastAPI + Python)                             │
│  ├── REST API                                           │
│  ├── SQLite FTS5 for fast search                        │
│  └── JSONL file parsing                                 │
├─────────────────────────────────────────────────────────┤
│  Data Layer                                             │
│  ├── Source: ~/.claude/projects/*.jsonl (immutable)     │
│  ├── Index: SQLite database (expendable cache)          │
│  └── Bookmarks: Separate SQLite database                │
├─────────────────────────────────────────────────────────┤
│  Optional: MCP Server                                   │
│  └── Exposes session data to Claude Code                │
└─────────────────────────────────────────────────────────┘
```

---

## Appendix: Why the Complexity?

Include this in documentation to preempt "over-engineering" concerns:

### Why SQLite instead of just reading files?
Searching 500+ session files with grep takes 10-30 seconds. SQLite FTS5 does it in 50ms. The SQLite database is an expendable cache - delete it anytime and it rebuilds from the source JSONL files.

### Why virtual scrolling?
Sessions can have 500+ events. Without virtualization, rendering all those DOM nodes makes the page unusable. @tanstack/react-virtual renders only visible items.

### Why Zustand instead of just React state?
Session filters, pagination, and bookmark lookups are used across many components. Prop drilling would be painful. Zustand is only 2.5KB and provides clean global state.

### Why is the MCP server separate?
It's an optional power-user feature for Claude Code integration. Regular users don't need it. Keeping it separate means the web app works standalone.

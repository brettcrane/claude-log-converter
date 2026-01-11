# TODO - Claude Log Converter

## High Priority
- [ ] Add syntax highlighting to code blocks in timeline
- [ ] Improve diff viewer for file changes (side-by-side view)

## Medium Priority
- [ ] Add PDF export option
- [ ] Add keyboard shortcuts for navigation
- [ ] Show token/cost estimates per session (if data available)
- [ ] Add dark mode toggle (currently follows system preference)

## Low Priority / Nice to Have
- [ ] Add session comparison feature
- [ ] Add timeline bookmarks/annotations
- [ ] Add session statistics dashboard
- [ ] Export filtered session list

## Backlog / Ideas
- [ ] Add Python linting (ruff)
- [ ] Add Python tests (pytest)
- [ ] Add frontend tests

---

## Completed

### 2026-01-11
- [x] **Initial web app implementation** - Converted CLI tool to single-server web app with FastAPI backend and React frontend
- [x] **Session list with search** - Full-text search across conversation content (not just metadata)
- [x] **Interactive timeline** - Virtual scrolling, collapsible tool outputs, event filtering
- [x] **File tracking** - Shows files read and modified per session
- [x] **Export functionality** - Markdown and JSON export with optional thinking blocks
- [x] **File upload** - Upload external .jsonl logs for viewing
- [x] **Single-server architecture** - FastAPI serves both API and static frontend, run with `python run.py`
- [x] **Collapsible sidebar** - Toggle via header button
- [x] **Refresh button** - Clears cache to find new sessions immediately
- [x] **Proper source/build separation** - Frontend source in `frontend/`, builds to `static/` (gitignored)
- [x] **Archived legacy CLI** - Moved `claude-log-converter.py` to `archive/`

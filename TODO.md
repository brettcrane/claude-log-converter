# TODO - Claude Log Converter

## High Priority

### UX & Timeline Improvements
- [x] ~~Add syntax highlighting to code blocks in timeline~~ (completed - using prism-react-renderer)
- [x] ~~In-session search (Ctrl+F)~~ (completed - floating search bar with match highlighting, prev/next, Enter/Shift+Enter)
- [x] ~~Collapsible event groups~~ (completed - groups consecutive tool calls, collapsed by default)
- [ ] Sticky event headers - keep "Assistant • 2:34 PM" pinned while scrolling through long responses
- [ ] Copy event to clipboard - button to copy individual event (formatted) for sharing

### Session List
- [ ] Event type icons in session cards - small icons showing activity types (edits, bash, etc.)

### Architecture
- [ ] SQLite backend - replace file-based caching for faster FTS5 search, persistent metadata, tags storage

## Low Priority / Future Consideration

### UX
- [ ] Improved diff viewer (side-by-side view with synchronized scrolling)
- [ ] Keyboard shortcuts (j/k navigation, Enter expand/collapse, / to search, Esc close, [/] switch tabs)
- [ ] Session bookmarks/annotations - mark important moments with persistent anchors

### Search & Discovery
- [ ] Advanced search filters - filter chips: `tool:Edit`, `file:*.tsx`, `has:error`, `duration:>30m`
- [ ] Recent sessions quick access - dropdown in header showing last 5 viewed sessions
- [ ] Session tags/labels - user-defined tags for organization

### Analytics
- [ ] Session statistics dashboard - sessions/day, tool usage, most active projects
- [ ] Token/cost estimation breakdown per event
- [ ] Activity heatmap - GitHub-style contribution graph

### Visualization
- [ ] Mini-map timeline - vertical strip showing event density, click to jump
- [ ] File tree view - interactive tree of touched files in Files tab

### Export & Sharing
- [ ] HTML export - self-contained viewable file
- [ ] Share link (read-only) - generate shareable URL
- [ ] PDF export

### Technical
- [ ] WebSocket for live updates - push notification when new sessions appear
- [ ] Background indexing service - pre-index for instant search

### Quality of Life
- [ ] Dark mode toggle (currently follows system preference)
- [ ] Session deduplication - detect similar sessions
- [ ] Export format selector dropdown
- [ ] Loading skeleton - content-shaped loading for smoother perceived performance

## Backlog / Ideas
- [ ] Add Python tests (pytest)
- [ ] Add frontend tests

---

## Completed

### 2026-01-11
- [x] **Collapsible event groups** - Groups consecutive tool calls (e.g., "5 file reads") collapsed by default, with expand/collapse, tool-specific icons, and file path previews
- [x] **In-session search (Ctrl+F)** - Floating search bar with match highlighting, prev/next navigation (Enter/Shift+Enter), auto-scroll to matches, yellow highlight for matching events
- [x] **Project filtering fix** - Sidebar project clicks now filter sessions correctly, shows loading spinner, displays project badge with clear button
- [x] **Syntax highlighting for code blocks** - Added prism-react-renderer with oneDark theme; highlights code in messages, Write/Edit tools, and tool results; auto-detects language from file extensions
- [x] **Sidebar toggle moved to sidebar** - Collapse button now in sidebar header next to "Projects", shows narrow bar when collapsed
- [x] **Project navigation fix** - Clicking projects in sidebar now navigates back to home page with filter applied
- [x] **Initial web app implementation** - Converted CLI tool to single-server web app with FastAPI backend and React frontend
- [x] **Session list with search** - Full-text search across conversation content (not just metadata)
- [x] **Interactive timeline** - Virtual scrolling, collapsible tool outputs, event filtering
- [x] **File tracking** - Shows files read and modified per session
- [x] **Export functionality** - Markdown and JSON export with optional thinking blocks
- [x] **File upload** - Upload external .jsonl logs for viewing
- [x] **Single-server architecture** - FastAPI serves both API and static frontend, run with `python run.py`
- [x] **Collapsible sidebar** - Toggle via sidebar header button
- [x] **Refresh button** - Clears cache to find new sessions immediately
- [x] **Proper source/build separation** - Frontend source in `frontend/`, builds to `static/` (gitignored)
- [x] **Archived legacy CLI** - Moved `claude-log-converter.py` to `archive/`
- [x] **Claude Code workflow files** - Added CLAUDE.md, TODO.md, .claude/commands/commit.md
- [x] **Python linting with ruff** - Added ruff.toml config, fixed all linting issues
- [x] **Session format documentation** - Added .claude/skills/session-format.md with JSONL format details
- [x] **Gotchas documentation** - Added .claude/skills/gotchas.md for common issues (venv paths, port conflicts, etc.)

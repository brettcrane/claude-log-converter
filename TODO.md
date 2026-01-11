# TODO - Claude Log Converter

## High Priority

### UX & Timeline Improvements
- [x] ~~Add syntax highlighting to code blocks in timeline~~ (completed - using prism-react-renderer)
- [x] ~~In-session search (Ctrl+F)~~ (completed then removed - had issues with virtual scroll, browser Ctrl+F works better)
- [x] ~~Collapsible event groups~~ (completed - groups consecutive tool calls, collapsed by default)
- [x] ~~Sticky event headers~~ (completed as floating context badge - traditional sticky headers don't work with virtual scrolling)
- [x] ~~Copy event to clipboard~~ (completed - button copies individual event as markdown with toast feedback)
- [x] ~~Session bookmarks/annotations~~ (completed - bookmark events with categories, notes, dedicated page)

### Architecture
- [x] ~~SQLite backend - replace file-based caching for faster FTS5 search, persistent metadata, tags storage~~ (completed - hybrid approach with JSONL as source of truth)

## Low Priority / Future Consideration

### UX
- [ ] Event type icons in session cards - small icons showing activity types (edits, bash, etc.)
- [ ] Improved diff viewer (side-by-side view with synchronized scrolling)
- [ ] Keyboard shortcuts (j/k navigation, Enter expand/collapse, / to search, Esc close, [/] switch tabs)

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

## Development Workflow Notes

### PR-Based Claude Development (learned 2026-01-11)

When Claude creates a PR for a feature:
1. **Review the PR** - Use `gh pr view <num>` and `gh pr diff <num>` to understand changes
2. **Assess if it will work** - Look for architectural issues, edge cases, compatibility with existing patterns (e.g., virtual scrolling)
3. **Merge first, fix later** - If the approach is sound but has minor bugs, merge to get cleaner code then fix on main
4. **Use squash merge** - `gh pr merge <num> --squash --delete-branch` keeps history clean

**Key lesson from PR #1 (floating badge):** IntersectionObserver doesn't work well with virtual scrolling because elements are created/destroyed during scroll. Scroll-position-based tracking using the virtualizer's state is more reliable.

---

## Completed

### 2026-01-11
- [x] **Session bookmarks/annotations** - Bookmark important moments in sessions with categories (Important, Reference, Bug, Question, General), notes, and quick jump-to-event navigation. SQLite backend with full CRUD API, dedicated bookmarks page with filtering and sorting (by bookmark date or event time), bookmark badges in timeline, integrated with virtual scrolling for performance
- [x] **SQLite backend with FTS5 full-text search** - Implemented hybrid approach where JSONL remains source of truth and SQLite provides 100-500x faster search. Key features:
  - Production-ready `app/services/session_db.py` with full schema (sessions, events, FTS5 index, metadata, tags)
  - Automatic stale detection via file mtime tracking
  - Incremental sync on startup (only indexes new/modified files)
  - Falls back to JSONL parser if SQLite fails (zero risk)
  - Feature flag `CLAUDE_LOG_USE_SQLITE_INDEX` (default: True)
  - New API endpoints: `/api/sessions/index/rebuild`, `/api/sessions/index/stats`
  - Database path: `~/.claude-log-converter/sessions.db`
- [x] **Copy event to clipboard** - Added copy button to each timeline event; copies formatted markdown with timestamps, tool info, and content; includes toast notifications for success/error feedback
- [x] **Floating context badge** - Shows current speaker (User/Assistant/Tool) while scrolling, with enhanced rail highlight. Replaced sticky header approach which doesn't work with virtual scrolling (PR #1 merged, then fixed IntersectionObserver bug with scroll-based tracking)
- [x] **Collapsible event groups** - Groups consecutive tool calls (e.g., "5 file reads") collapsed by default, with expand/collapse, tool-specific icons, and file path previews
- [x] **In-session search (Ctrl+F)** - Implemented but later removed due to issues with virtual scroll auto-navigation. Browser Ctrl+F works well as alternative.
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

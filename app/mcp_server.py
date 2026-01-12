#!/usr/bin/env python3
"""MCP Server for Claude Log Converter.

This server exposes Claude Code session logs to Claude via the Model Context Protocol,
enabling Claude to search and analyze its own past sessions.

Usage:
    python -m app.mcp_server

Configure in Claude Code:
    claude mcp add session-memory -- python -m app.mcp_server
"""

import asyncio
import logging
import re
import sqlite3
import sys
from datetime import datetime

from mcp.server import Server
from mcp.server.stdio import stdio_server
from mcp.types import TextContent, Tool

from app.config import settings
from app.models.bookmark import Bookmark, BookmarkCreate
from app.services import bookmark_service
from app.services.database import get_db_connection, init_database
from app.services.export_service import format_date, generate_markdown
from app.services.session_indexer import session_indexer

# Configure logging to stderr (stdout reserved for MCP protocol)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
    stream=sys.stderr,
)
logger = logging.getLogger("mcp_server")

# Quiet noisy loggers
logging.getLogger("uvicorn").setLevel(logging.WARNING)
logging.getLogger("asyncio").setLevel(logging.WARNING)

# Initialize MCP server
server = Server("claude-log-converter")


# =============================================================================
# Tool Definitions
# =============================================================================

TOOLS = [
    Tool(
        name="search_sessions",
        description=(
            "Search Claude Code sessions using full-text search. "
            "By default, searches only the CURRENT PROJECT (detected from cwd). "
            "Use scope='all' to search across all projects. "
            "Returns session summaries with metadata and matching snippets."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "query": {
                    "type": "string",
                    "description": "Search term to find in session content",
                },
                "cwd": {
                    "type": "string",
                    "description": (
                        "Current working directory - used to auto-detect project scope. "
                        "Pass your current working directory to search within that project."
                    ),
                },
                "scope": {
                    "type": "string",
                    "enum": ["project", "all"],
                    "description": (
                        "Search scope: 'project' (default) searches only current project, "
                        "'all' searches across all projects"
                    ),
                    "default": "project",
                },
                "project": {
                    "type": "string",
                    "description": "Explicit project name filter (overrides cwd detection)",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results to return (default: 10, max: 50)",
                    "default": 10,
                    "maximum": 50,
                },
            },
            "required": ["query"],
        },
    ),
    Tool(
        name="get_session",
        description=(
            "Get full details of a specific session including the complete "
            "conversation timeline. Returns markdown-formatted session with "
            "metadata, files modified, tools used, and all messages."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "Session ID (from search results)",
                },
                "include_thinking": {
                    "type": "boolean",
                    "description": "Include Claude's thinking blocks (default: false)",
                    "default": False,
                },
            },
            "required": ["session_id"],
        },
    ),
    Tool(
        name="list_projects",
        description=(
            "List all available projects with session counts. "
            "Returns a list of projects that have Claude Code sessions."
        ),
        inputSchema={
            "type": "object",
            "properties": {},
        },
    ),
    Tool(
        name="list_sessions",
        description=(
            "List recent sessions. By default, lists only CURRENT PROJECT sessions. "
            "Use scope='all' to list across all projects. "
            "Returns session summaries sorted by most recent first."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "cwd": {
                    "type": "string",
                    "description": "Current working directory - used to auto-detect project scope",
                },
                "scope": {
                    "type": "string",
                    "enum": ["project", "all"],
                    "description": "Search scope: 'project' (default) or 'all'",
                    "default": "project",
                },
                "project": {
                    "type": "string",
                    "description": "Explicit project name filter (overrides cwd detection)",
                },
                "date_from": {
                    "type": "string",
                    "format": "date",
                    "description": "Start date (YYYY-MM-DD)",
                },
                "date_to": {
                    "type": "string",
                    "format": "date",
                    "description": "End date (YYYY-MM-DD)",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results (default: 10, max: 50)",
                    "default": 10,
                    "maximum": 50,
                },
            },
        },
    ),
    Tool(
        name="list_bookmarks",
        description=(
            "List bookmarks (saved annotations on session events). "
            "Bookmarks help you find important moments in past sessions."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "Filter by session ID",
                },
                "project": {
                    "type": "string",
                    "description": "Filter by project name",
                },
                "category": {
                    "type": "string",
                    "description": "Filter by category (general, important, error, decision, code)",
                },
                "search": {
                    "type": "string",
                    "description": "Search in bookmark notes",
                },
                "limit": {
                    "type": "integer",
                    "description": "Maximum results (default: 20, max: 100)",
                    "default": 20,
                    "maximum": 100,
                },
            },
        },
    ),
    Tool(
        name="create_bookmark",
        description=(
            "Create a bookmark on a specific event in a session. "
            "Use this to mark important moments for later reference."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "Session ID containing the event",
                },
                "event_id": {
                    "type": "string",
                    "description": "Event ID to bookmark",
                },
                "event_index": {
                    "type": "integer",
                    "description": "Event index in the timeline",
                },
                "category": {
                    "type": "string",
                    "description": "Category: general, important, error, decision, code",
                    "default": "general",
                },
                "note": {
                    "type": "string",
                    "description": "Optional note about why this is bookmarked",
                },
            },
            "required": ["session_id", "event_id", "event_index"],
        },
    ),
    Tool(
        name="delete_bookmark",
        description="Delete a bookmark by its ID.",
        inputSchema={
            "type": "object",
            "properties": {
                "bookmark_id": {
                    "type": "integer",
                    "description": "Bookmark ID to delete",
                },
            },
            "required": ["bookmark_id"],
        },
    ),
    Tool(
        name="get_session_summary",
        description=(
            "Get a quick summary of a session WITHOUT the full conversation. "
            "Returns metadata, files modified, tools used, phases, and key decisions. "
            "Use this to validate you have the right session before loading full details."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "Session ID to summarize",
                },
            },
            "required": ["session_id"],
        },
    ),
    Tool(
        name="search_in_session",
        description=(
            "Search within a specific session for relevant content. "
            "Returns matching events with surrounding context. "
            "Use this to find specific parts of large sessions without loading everything."
        ),
        inputSchema={
            "type": "object",
            "properties": {
                "session_id": {
                    "type": "string",
                    "description": "Session ID to search within",
                },
                "query": {
                    "type": "string",
                    "description": "Search term to find in the session",
                },
                "context_events": {
                    "type": "integer",
                    "description": "Number of events to include before/after each match (default: 2)",
                    "default": 2,
                    "maximum": 5,
                },
                "max_matches": {
                    "type": "integer",
                    "description": "Maximum matches to return (default: 10)",
                    "default": 10,
                    "maximum": 25,
                },
            },
            "required": ["session_id", "query"],
        },
    ),
]


# =============================================================================
# MCP Protocol Handlers
# =============================================================================


@server.list_tools()
async def list_tools():
    """Return list of available tools."""
    return TOOLS


@server.call_tool()
async def call_tool(name: str, arguments: dict) -> list[TextContent]:
    """Handle tool calls."""
    logger.info(f"Tool called: {name} with args: {arguments}")

    try:
        if name == "search_sessions":
            result = await handle_search_sessions(arguments)
        elif name == "get_session":
            result = await handle_get_session(arguments)
        elif name == "list_projects":
            result = await handle_list_projects(arguments)
        elif name == "list_sessions":
            result = await handle_list_sessions(arguments)
        elif name == "list_bookmarks":
            result = await handle_list_bookmarks(arguments)
        elif name == "create_bookmark":
            result = await handle_create_bookmark(arguments)
        elif name == "delete_bookmark":
            result = await handle_delete_bookmark(arguments)
        elif name == "get_session_summary":
            result = await handle_get_session_summary(arguments)
        elif name == "search_in_session":
            result = await handle_search_in_session(arguments)
        else:
            result = f"Unknown tool: {name}"

        return [TextContent(type="text", text=result)]

    except Exception as e:
        logger.error(f"Tool {name} failed: {e}", exc_info=True)
        return [TextContent(type="text", text=f"Error: {str(e)}")]


# =============================================================================
# Tool Handlers
# =============================================================================


async def handle_search_sessions(args: dict) -> str:
    """Search sessions using FTS5 full-text search."""
    query = args["query"]
    cwd = args.get("cwd")
    scope = args.get("scope", "project")
    explicit_project = args.get("project")
    limit = min(args.get("limit", 10), 50)

    # Resolve project filter from cwd/scope/explicit
    project, scope_desc = resolve_project_filter(cwd, scope, explicit_project)

    sessions, total = session_indexer.get_sessions(
        search=query,
        project=project,
        limit=limit,
    )

    # Get snippets for each session
    snippets = {}
    if query and sessions:
        snippets = get_search_snippets(query, [s.session_id for s in sessions])

    return format_session_list(
        sessions, total, query=query, snippets=snippets, scope_desc=scope_desc
    )


async def handle_get_session(args: dict) -> str:
    """Get full session details."""
    session_id = args["session_id"]
    include_thinking = args.get("include_thinking", False)

    session = session_indexer.get_session_by_id(session_id, include_thinking)

    if not session:
        return f"Session not found: {session_id}"

    return generate_markdown(session, include_thinking=include_thinking)


async def handle_list_projects(args: dict) -> str:
    """List all projects."""
    projects = session_indexer.get_projects()

    if not projects:
        return "No projects found."

    lines = ["# Projects", "", f"Found {len(projects)} projects with Claude Code sessions:", ""]

    for p in projects:
        lines.append(f"- **{p['name']}** - {p['session_count']} sessions")
        lines.append(f"  - Path: `{p['decoded_path']}`")

    return "\n".join(lines)


async def handle_list_sessions(args: dict) -> str:
    """List recent sessions with optional filters."""
    cwd = args.get("cwd")
    scope = args.get("scope", "project")
    explicit_project = args.get("project")
    limit = min(args.get("limit", 10), 50)

    # Resolve project filter from cwd/scope/explicit
    project, scope_desc = resolve_project_filter(cwd, scope, explicit_project)

    # Parse dates if provided
    date_from = None
    date_to = None

    if "date_from" in args and args["date_from"]:
        try:
            date_from = datetime.fromisoformat(args["date_from"])
        except ValueError:
            pass

    if "date_to" in args and args["date_to"]:
        try:
            date_to = datetime.fromisoformat(args["date_to"])
        except ValueError:
            pass

    sessions, total = session_indexer.get_sessions(
        project=project,
        date_from=date_from,
        date_to=date_to,
        limit=limit,
    )

    return format_session_list(sessions, total, scope_desc=scope_desc)


async def handle_list_bookmarks(args: dict) -> str:
    """List bookmarks with optional filters."""
    session_id = args.get("session_id")
    project = args.get("project")
    category = args.get("category")
    search = args.get("search")
    limit = min(args.get("limit", 20), 100)

    with get_db_connection() as conn:
        bookmarks, total = bookmark_service.list_bookmarks(
            conn,
            session_id=session_id,
            project=project,
            category=category,
            search=search,
            limit=limit,
        )

    return format_bookmark_list(bookmarks, total)


async def handle_create_bookmark(args: dict) -> str:
    """Create a new bookmark."""
    # Get session info to populate denormalized fields
    session = session_indexer.get_session_by_id(args["session_id"])

    if not session:
        return f"Session not found: {args['session_id']}"

    # Find the event to get metadata
    event = None
    for e in session.events:
        if e.id == args["event_id"]:
            event = e
            break

    if not event:
        return f"Event not found: {args['event_id']} in session {args['session_id']}"

    data = BookmarkCreate(
        session_id=args["session_id"],
        event_id=args["event_id"],
        event_index=args["event_index"],
        project_name=session.project_name,
        git_branch=session.git_branch,
        event_timestamp=event.timestamp,
        event_type=event.type,
        category=args.get("category", "general"),
        note=args.get("note"),
    )

    try:
        with get_db_connection() as conn:
            bookmark = bookmark_service.create_bookmark(conn, data)
        return f"Bookmark created successfully (ID: {bookmark.id})"
    except bookmark_service.DuplicateBookmarkError:
        return "A bookmark already exists for this event."


async def handle_delete_bookmark(args: dict) -> str:
    """Delete a bookmark."""
    bookmark_id = args["bookmark_id"]

    with get_db_connection() as conn:
        deleted = bookmark_service.delete_bookmark(conn, bookmark_id)

    if deleted:
        return f"Bookmark {bookmark_id} deleted."
    else:
        return f"Bookmark not found: {bookmark_id}"


async def handle_get_session_summary(args: dict) -> str:
    """Get session summary without full conversation."""
    session_id = args["session_id"]

    session = session_indexer.get_session_by_id(session_id, include_thinking=False)

    if not session:
        return f"Session not found: {session_id}"

    return format_session_summary(session)


async def handle_search_in_session(args: dict) -> str:
    """Search within a specific session."""
    session_id = args["session_id"]
    query = args["query"]
    context_events = min(args.get("context_events", 2), 5)
    max_matches = min(args.get("max_matches", 10), 25)

    session = session_indexer.get_session_by_id(session_id, include_thinking=False)

    if not session:
        return f"Session not found: {session_id}"

    # Find matching events
    matches = []
    query_lower = query.lower()

    for i, event in enumerate(session.events):
        content = event.content or ""
        if query_lower in content.lower():
            matches.append((i, event, content))

    if not matches:
        return f"No matches found for '{query}' in session {session_id[:8]}"

    # Limit matches
    matches = matches[:max_matches]

    return format_session_search_results(
        session, matches, query, context_events, len(session.events)
    )


# =============================================================================
# Project Detection Helpers
# =============================================================================


def detect_project_from_cwd(cwd: str | None) -> str | None:
    """Detect project name from current working directory.

    Matches cwd against known project paths to find the best match.
    Returns project name if found, None otherwise.
    """
    if not cwd:
        return None

    projects = session_indexer.get_projects()
    if not projects:
        return None

    # Normalize cwd path
    cwd = cwd.rstrip("/")

    # Try exact match first
    for p in projects:
        if p["decoded_path"].rstrip("/") == cwd:
            return p["name"]

    # Try matching cwd as subdirectory of project (cwd is inside project)
    for p in projects:
        project_path = p["decoded_path"].rstrip("/")
        if cwd.startswith(project_path + "/") or cwd == project_path:
            return p["name"]

    # Try matching project as subdirectory of cwd (project is inside cwd)
    # This handles monorepo scenarios
    for p in projects:
        project_path = p["decoded_path"].rstrip("/")
        if project_path.startswith(cwd + "/"):
            return p["name"]

    return None


def resolve_project_filter(
    cwd: str | None,
    scope: str | None,
    explicit_project: str | None
) -> tuple[str | None, str]:
    """Resolve the project filter based on cwd, scope, and explicit project.

    Returns:
        Tuple of (project_name_or_none, scope_description)
    """
    # Explicit project overrides everything
    if explicit_project:
        return explicit_project, f"project '{explicit_project}'"

    # If scope is 'all', no project filter
    if scope == "all":
        return None, "all projects"

    # Default scope is 'project' - try to detect from cwd
    detected = detect_project_from_cwd(cwd)
    if detected:
        return detected, f"project '{detected}' (auto-detected from cwd)"

    # Couldn't detect project, search all with a note
    return None, "all projects (could not detect project from cwd)"


# =============================================================================
# Search Helpers
# =============================================================================


def get_search_snippets(query: str, session_ids: list[str]) -> dict[str, str]:
    """Get matching content snippets for search results.

    Uses FTS5 snippet function to extract relevant context around matches.
    """
    if not session_ids:
        return {}

    snippets = {}

    try:
        # Auto-repair FTS5 if corrupted
        session_indexer.repair_fts5_if_needed()

        db_path = settings.db_path
        conn = sqlite3.connect(db_path)
        conn.row_factory = sqlite3.Row

        # Escape query for FTS5
        query_escaped = '"' + query.replace('"', '""') + '"'

        # Get snippets using FTS5 snippet function
        placeholders = ",".join("?" * len(session_ids))
        sql = f"""
            SELECT
                session_id,
                snippet(events_fts, 2, '**', '**', '...', 32) as snippet
            FROM events_fts
            WHERE events_fts MATCH ?
            AND session_id IN ({placeholders})
            GROUP BY session_id
            LIMIT 50
        """

        params = [query_escaped] + session_ids
        cursor = conn.execute(sql, params)

        for row in cursor:
            # Clean up snippet - remove excessive whitespace
            snippet = row["snippet"]
            if snippet:
                snippet = re.sub(r"\s+", " ", snippet).strip()
                # Limit length
                if len(snippet) > 200:
                    snippet = snippet[:200] + "..."
                snippets[row["session_id"]] = snippet

        conn.close()

    except Exception as e:
        logger.warning(f"Failed to get search snippets: {e}")

    return snippets


# =============================================================================
# Markdown Formatters
# =============================================================================


def format_session_list(
    sessions: list,
    total: int,
    query: str | None = None,
    snippets: dict[str, str] | None = None,
    scope_desc: str | None = None,
) -> str:
    """Format session list as markdown with optional search snippets."""
    lines = ["# Session Search Results", ""]

    if query:
        lines.append(f"**Search query:** {query}")
    if scope_desc:
        lines.append(f"**Scope:** {scope_desc}")
    lines.append(f"**Found:** {total} sessions")
    lines.append("")

    if not sessions:
        lines.append("_No sessions found._")
        return "\n".join(lines)

    snippets = snippets or {}

    for s in sessions:
        short_id = s.session_id[:8]
        lines.append(f"## {s.project_name} - {short_id}")
        lines.append("")

        if s.start_time:
            lines.append(f"- **Date:** {format_date(s.start_time)}")
        if s.duration_seconds:
            minutes = s.duration_seconds // 60
            if minutes > 0:
                lines.append(f"- **Duration:** {minutes}m")
        if s.git_branch:
            lines.append(f"- **Branch:** `{s.git_branch}`")
        lines.append(f"- **Messages:** {s.message_count} | **Tools:** {s.tool_count} | **Files modified:** {s.files_modified_count}")
        lines.append(f"- **Session ID:** `{s.session_id}`")

        # Add search snippet if available
        if s.session_id in snippets:
            lines.append(f"- **Match:** _{snippets[s.session_id]}_")

        lines.append("")

    return "\n".join(lines)


def format_session_summary(session) -> str:
    """Format session summary without conversation (metadata only)."""
    lines = []

    short_id = session.session_id[:8] if session.session_id else "unknown"
    lines.append(f"# Session Summary: {short_id}")
    lines.append("")

    # Metadata
    lines.append("## Metadata")
    lines.append("")
    lines.append(f"- **Project:** {session.project_name}")
    if session.start_time:
        lines.append(f"- **Date:** {format_date(session.start_time)}")
    if session.cwd:
        lines.append(f"- **Working Directory:** `{session.cwd}`")
    if session.git_branch:
        lines.append(f"- **Git Branch:** `{session.git_branch}`")
    if session.duration_seconds:
        minutes = session.duration_seconds // 60
        seconds = session.duration_seconds % 60
        lines.append(f"- **Duration:** {minutes}m {seconds}s")
    lines.append(f"- **Total Events:** {len(session.events)}")
    lines.append(f"- **Session ID:** `{session.session_id}`")
    lines.append("")

    # Tools used
    if session.tools_used:
        lines.append("## Tools Used")
        lines.append("")
        lines.append(", ".join(session.tools_used))
        lines.append("")

    # Files modified
    if session.files_modified:
        lines.append(f"## Files Modified ({len(session.files_modified)})")
        lines.append("")
        for f in session.files_modified[:20]:
            lines.append(f"- `{f}`")
        if len(session.files_modified) > 20:
            lines.append(f"- _...and {len(session.files_modified) - 20} more_")
        lines.append("")

    # Files read
    if session.files_read:
        lines.append(f"## Files Read ({len(session.files_read)})")
        lines.append("")
        for f in session.files_read[:15]:
            lines.append(f"- `{f}`")
        if len(session.files_read) > 15:
            lines.append(f"- _...and {len(session.files_read) - 15} more_")
        lines.append("")

    # Phases detected
    if session.phases:
        lines.append("## Phases/Plans Detected")
        lines.append("")
        for phase in session.phases[:15]:
            lines.append(f"- {phase}")
        if len(session.phases) > 15:
            lines.append(f"- _...and {len(session.phases) - 15} more_")
        lines.append("")

    # Decisions
    if session.decisions:
        lines.append("## Key Decisions")
        lines.append("")
        for decision in session.decisions[:15]:
            lines.append(f"- {decision}")
        if len(session.decisions) > 15:
            lines.append(f"- _...and {len(session.decisions) - 15} more_")
        lines.append("")

    return "\n".join(lines)


def format_session_search_results(
    session,
    matches: list[tuple],
    query: str,
    context_events: int,
    total_events: int,
) -> str:
    """Format search results within a session."""
    lines = []

    short_id = session.session_id[:8]
    lines.append(f"# Search Results in Session {short_id}")
    lines.append("")
    lines.append(f"**Query:** {query}")
    lines.append(f"**Matches:** {len(matches)} events (out of {total_events} total)")
    lines.append(f"**Project:** {session.project_name}")
    if session.start_time:
        lines.append(f"**Date:** {format_date(session.start_time)}")
    lines.append("")
    lines.append("---")
    lines.append("")

    events = session.events

    # Track which events we've already shown to avoid duplicates
    shown_events = set()

    for match_idx, (event_idx, _event, _content) in enumerate(matches):
        lines.append(f"## Match {match_idx + 1} (Event {event_idx})")
        lines.append("")

        # Calculate context range
        start_idx = max(0, event_idx - context_events)
        end_idx = min(len(events), event_idx + context_events + 1)

        # Show context events
        for i in range(start_idx, end_idx):
            if i in shown_events and i != event_idx:
                continue
            shown_events.add(i)

            ctx_event = events[i]
            is_match = i == event_idx

            # Format event header
            prefix = ">>> " if is_match else "    "
            event_type = ctx_event.type.upper()

            if is_match:
                lines.append(f"**[{event_type}] (Event {i}) - MATCH:**")
            else:
                lines.append(f"_{prefix}[{event_type}] (Event {i}):_")

            # Format content with highlighting for matches
            event_content = ctx_event.content or ""
            if event_content:
                # Truncate long content
                if len(event_content) > 500:
                    # Try to show the matching part
                    query_lower = query.lower()
                    content_lower = event_content.lower()
                    match_pos = content_lower.find(query_lower)
                    if match_pos >= 0:
                        start = max(0, match_pos - 200)
                        end = min(len(event_content), match_pos + len(query) + 200)
                        event_content = "..." + event_content[start:end] + "..."
                    else:
                        event_content = event_content[:500] + "..."

                lines.append("")
                lines.append(event_content)

            lines.append("")

        lines.append("---")
        lines.append("")

    return "\n".join(lines)


def format_bookmark_list(bookmarks: list[Bookmark], total: int) -> str:
    """Format bookmark list as markdown."""
    lines = ["# Bookmarks", ""]
    lines.append(f"**Total:** {total} bookmarks")
    lines.append("")

    if not bookmarks:
        lines.append("_No bookmarks found._")
        return "\n".join(lines)

    for b in bookmarks:
        short_session = b.session_id[:8]
        lines.append(f"## Bookmark #{b.id}")
        lines.append("")
        lines.append(f"- **Session:** `{short_session}` ({b.project_name or 'unknown'})")
        lines.append(f"- **Event:** `{b.event_id}` (index {b.event_index})")
        if b.category:
            lines.append(f"- **Category:** {b.category}")
        if b.note:
            lines.append(f"- **Note:** {b.note}")
        if b.created_at:
            lines.append(f"- **Created:** {format_date(b.created_at)}")
        lines.append("")

    return "\n".join(lines)


# =============================================================================
# Entry Point
# =============================================================================


async def main():
    """Run the MCP server."""
    logger.info("Starting Claude Log Converter MCP server...")

    # Initialize bookmark database
    init_database()
    logger.info(f"Database initialized at {settings.bookmark_db_path}")

    # Log index status
    stats = session_indexer.get_index_stats()
    logger.info(f"Session index: {stats.get('session_count', 0)} sessions indexed")

    # Run stdio server
    async with stdio_server() as (read_stream, write_stream):
        logger.info("MCP server ready")
        await server.run(
            read_stream,
            write_stream,
            server.create_initialization_options(),
        )


if __name__ == "__main__":
    asyncio.run(main())

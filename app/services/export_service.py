"""Export service - generates various output formats."""

from app.models.session import SessionDetail


def truncate_text(text: str, max_length: int = 500) -> str:
    """Truncate text with ellipsis if too long."""
    if len(text) <= max_length:
        return text
    return text[:max_length] + "... [truncated]"


def format_time(dt) -> str:
    """Format datetime for display."""
    if not dt:
        return ""
    return dt.strftime("%H:%M:%S")


def format_date(dt) -> str:
    """Format datetime as date."""
    if not dt:
        return ""
    return dt.strftime("%Y-%m-%d")


def format_tool_use(tool_name: str, tool_input: dict) -> str:
    """Format tool use for markdown output."""
    lines = [f"**Tool: {tool_name}**"]

    if tool_name == "Bash":
        cmd = tool_input.get("command", "")
        desc = tool_input.get("description", "")
        if desc:
            lines.append(f"_{desc}_")
        lines.append("```bash")
        lines.append(truncate_text(cmd, 300))
        lines.append("```")
    elif tool_name == "Read":
        path = tool_input.get("file_path", "")
        lines.append(f"Reading: `{path}`")
    elif tool_name == "Write":
        path = tool_input.get("file_path", "")
        content = tool_input.get("content", "")
        lines.append(f"Writing: `{path}`")
        if content:
            preview = truncate_text(content, 200)
            lines.append(f"```\n{preview}\n```")
    elif tool_name == "Edit":
        path = tool_input.get("file_path", "")
        old = truncate_text(tool_input.get("old_string", ""), 100)
        new = truncate_text(tool_input.get("new_string", ""), 100)
        lines.append(f"Editing: `{path}`")
        lines.append(f"```diff\n- {old}\n+ {new}\n```")
    elif tool_name == "Glob":
        pattern = tool_input.get("pattern", "")
        path = tool_input.get("path", ".")
        lines.append(f"Searching for: `{pattern}` in `{path}`")
    elif tool_name == "Grep":
        pattern = tool_input.get("pattern", "")
        path = tool_input.get("path", ".")
        lines.append(f"Searching for: `{pattern}` in `{path}`")
    elif tool_name == "TodoWrite":
        todos = tool_input.get("todos", [])
        lines.append("Todo List Update:")
        for todo in todos[:10]:
            status = todo.get("status", "pending")
            content = todo.get("content", "")
            icon = {"pending": "[ ]", "in_progress": "[~]", "completed": "[x]"}.get(status, "[ ]")
            lines.append(f"  {icon} {content}")
    elif tool_name == "Task":
        desc = tool_input.get("description", "")
        agent = tool_input.get("subagent_type", "")
        lines.append(f"Spawning agent: {agent}")
        if desc:
            lines.append(f"Task: {desc}")
    else:
        for key, value in list(tool_input.items())[:5]:
            if isinstance(value, str):
                lines.append(f"  {key}: {truncate_text(str(value), 100)}")

    return "\n".join(lines)


def generate_markdown(
    session: SessionDetail,
    include_thinking: bool = False,
    verbose: bool = False
) -> str:
    """Generate markdown output from session data."""
    lines = []

    # Header
    short_id = session.session_id[:8] if session.session_id else "unknown"
    lines.append(f"# Claude Code Session: {short_id}")
    lines.append("")

    # Metadata
    if session.start_time:
        lines.append(f"**Date:** {format_date(session.start_time)}")
    if session.cwd:
        lines.append(f"**Working Directory:** `{session.cwd}`")
    if session.git_branch:
        lines.append(f"**Git Branch:** `{session.git_branch}`")
    if session.duration_seconds:
        minutes = session.duration_seconds // 60
        seconds = session.duration_seconds % 60
        lines.append(f"**Duration:** {minutes}m {seconds}s")
    lines.append("")

    # Summary section
    lines.append("---")
    lines.append("## Summary")
    lines.append("")

    if session.tools_used:
        lines.append(f"**Tools Used:** {', '.join(session.tools_used)}")

    if session.files_modified:
        lines.append(f"**Files Modified:** {len(session.files_modified)} files")
        for f in session.files_modified[:10]:
            lines.append(f"  - `{f}`")
        if len(session.files_modified) > 10:
            lines.append(f"  - _...and {len(session.files_modified) - 10} more_")

    if verbose and session.files_read:
        lines.append(f"**Files Read:** {len(session.files_read)} files")

    if session.phases:
        lines.append("")
        lines.append("**Phases/Plans Detected:**")
        for phase in session.phases[:10]:
            lines.append(f"  - {phase}")

    if session.decisions:
        lines.append("")
        lines.append("**Key Decisions:**")
        for decision in session.decisions[:10]:
            lines.append(f"  - {decision}")

    lines.append("")
    lines.append("---")
    lines.append("## Conversation")
    lines.append("")

    # Messages
    for event in session.events:
        time_str = format_time(event.timestamp) if event.timestamp else ""

        if event.type == "user":
            lines.append(f"### User [{time_str}]")
            lines.append("")
            content = event.content or ""
            if len(content) > 1000:
                lines.append("<details>")
                lines.append("<summary>Long message (click to expand)</summary>")
                lines.append("")
                lines.append(content)
                lines.append("")
                lines.append("</details>")
            else:
                lines.append(content)
            lines.append("")

        elif event.type == "assistant":
            lines.append(f"### Assistant [{time_str}]")
            lines.append("")
            lines.append(event.content or "")
            lines.append("")

        elif event.type == "thinking" and include_thinking:
            lines.append("<details>")
            lines.append(f"<summary>Thinking [{time_str}]</summary>")
            lines.append("")
            lines.append(truncate_text(event.content or "", 2000))
            lines.append("")
            lines.append("</details>")
            lines.append("")

        elif event.type == "tool_use":
            lines.append("<details>")
            lines.append(f"<summary>Tool: {event.tool_name} [{time_str}]</summary>")
            lines.append("")
            if event.tool_input:
                lines.append(format_tool_use(event.tool_name or "", event.tool_input))
            lines.append("")
            lines.append("</details>")
            lines.append("")

    return "\n".join(lines)

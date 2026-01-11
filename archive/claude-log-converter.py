#!/usr/bin/env python3
"""
Claude Code Log Converter

Converts Claude Code conversation logs (.jsonl) into readable markdown.
Designed for context recovery after unexpected session ends.

Usage:
    python claude-log-converter.py ~/.claude/projects/-home-user-project/
    python claude-log-converter.py session.jsonl
    python claude-log-converter.py ~/.claude/projects/-home-user-project/ -o output.md
    python claude-log-converter.py ~/.claude/projects/-home-user-project/ --date 2026-01-11
"""

import argparse
import json
import os
import re
import sys
from datetime import datetime
from pathlib import Path
from typing import Optional


def parse_timestamp(ts: str) -> Optional[datetime]:
    """Parse ISO timestamp from log entry."""
    if not ts:
        return None
    try:
        # Handle ISO format with Z suffix
        ts = ts.replace('Z', '+00:00')
        return datetime.fromisoformat(ts)
    except (ValueError, TypeError):
        return None


def format_time(dt: Optional[datetime]) -> str:
    """Format datetime for display."""
    if not dt:
        return ""
    return dt.strftime("%H:%M:%S")


def format_date(dt: Optional[datetime]) -> str:
    """Format datetime as date."""
    if not dt:
        return ""
    return dt.strftime("%Y-%m-%d")


def truncate_text(text: str, max_length: int = 500) -> str:
    """Truncate text with ellipsis if too long."""
    if len(text) <= max_length:
        return text
    return text[:max_length] + "... [truncated]"


def extract_files_from_tool_use(name: str, input_data: dict) -> list[str]:
    """Extract file paths from tool use inputs."""
    files = []

    if name in ("Read", "Write", "Edit"):
        if "file_path" in input_data:
            files.append(input_data["file_path"])
    elif name == "Bash":
        cmd = input_data.get("command", "")
        # Simple heuristic: look for file-like paths in commands
        path_patterns = re.findall(r'[/\w.-]+\.[a-zA-Z]{1,10}', cmd)
        files.extend(path_patterns)
    elif name == "Glob":
        if "pattern" in input_data:
            files.append(f"[pattern: {input_data['pattern']}]")
    elif name == "Grep":
        if "pattern" in input_data:
            files.append(f"[search: {input_data['pattern']}]")

    return files


def detect_phases_and_plans(text: str) -> list[str]:
    """Detect phase lists, todo items, and plans in text."""
    phases = []

    # Look for numbered lists that might be phases/plans
    numbered_pattern = re.compile(r'^\s*(\d+[\.\)]\s*.+)$', re.MULTILINE)
    matches = numbered_pattern.findall(text)
    if len(matches) >= 2:  # At least 2 items to be a list
        phases.extend(matches[:10])  # Cap at 10 items

    # Look for checkbox items
    checkbox_pattern = re.compile(r'^\s*[-*]\s*\[[ x]\]\s*(.+)$', re.MULTILINE)
    matches = checkbox_pattern.findall(text)
    phases.extend(matches[:10])

    return phases


def detect_decisions(text: str) -> list[str]:
    """Detect key decisions mentioned in text."""
    decisions = []

    # Common decision phrases
    decision_patterns = [
        r"(?:I'll|Let's|We should|Going to|I will|We'll)\s+([^.!?\n]+[.!?]?)",
        r"(?:decided to|choosing to|opting for)\s+([^.!?\n]+[.!?]?)",
    ]

    for pattern in decision_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches[:5]:  # Cap at 5 per pattern
            if len(match) > 20:  # Filter out short matches
                decisions.append(match.strip())

    return decisions[:10]  # Cap total


def format_tool_use(name: str, input_data: dict) -> str:
    """Format tool use for markdown output."""
    lines = [f"**Tool: {name}**"]

    if name == "Bash":
        cmd = input_data.get("command", "")
        desc = input_data.get("description", "")
        if desc:
            lines.append(f"_{desc}_")
        lines.append("```bash")
        lines.append(truncate_text(cmd, 300))
        lines.append("```")
    elif name == "Read":
        path = input_data.get("file_path", "")
        lines.append(f"Reading: `{path}`")
    elif name == "Write":
        path = input_data.get("file_path", "")
        content = input_data.get("content", "")
        lines.append(f"Writing: `{path}`")
        if content:
            preview = truncate_text(content, 200)
            lines.append(f"```\n{preview}\n```")
    elif name == "Edit":
        path = input_data.get("file_path", "")
        old = truncate_text(input_data.get("old_string", ""), 100)
        new = truncate_text(input_data.get("new_string", ""), 100)
        lines.append(f"Editing: `{path}`")
        lines.append(f"```diff\n- {old}\n+ {new}\n```")
    elif name == "Glob":
        pattern = input_data.get("pattern", "")
        path = input_data.get("path", ".")
        lines.append(f"Searching for: `{pattern}` in `{path}`")
    elif name == "Grep":
        pattern = input_data.get("pattern", "")
        path = input_data.get("path", ".")
        lines.append(f"Searching for: `{pattern}` in `{path}`")
    elif name == "TodoWrite":
        todos = input_data.get("todos", [])
        lines.append("Todo List Update:")
        for todo in todos[:10]:
            status = todo.get("status", "pending")
            content = todo.get("content", "")
            icon = {"pending": "⬜", "in_progress": "🔄", "completed": "✅"}.get(status, "•")
            lines.append(f"  {icon} {content}")
    elif name == "Task":
        desc = input_data.get("description", "")
        agent = input_data.get("subagent_type", "")
        lines.append(f"Spawning agent: {agent}")
        if desc:
            lines.append(f"Task: {desc}")
    elif name == "WebFetch":
        url = input_data.get("url", "")
        prompt = input_data.get("prompt", "")
        lines.append(f"Fetching: {url}")
        if prompt:
            lines.append(f"Prompt: {truncate_text(prompt, 100)}")
    else:
        # Generic fallback
        for key, value in list(input_data.items())[:5]:
            if isinstance(value, str):
                lines.append(f"  {key}: {truncate_text(str(value), 100)}")

    return "\n".join(lines)


def format_tool_result(content: str) -> str:
    """Format tool result for markdown output."""
    if not content:
        return "_No output_"

    # Try to parse as JSON for better formatting
    try:
        if content.startswith("{") or content.startswith("["):
            parsed = json.loads(content)
            content = json.dumps(parsed, indent=2)
    except (json.JSONDecodeError, TypeError):
        pass

    return f"```\n{truncate_text(content, 500)}\n```"


def parse_jsonl_file(filepath: Path) -> list[dict]:
    """Parse a JSONL file into a list of entries."""
    entries = []
    with open(filepath, 'r', encoding='utf-8') as f:
        for line_num, line in enumerate(f, 1):
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                entries.append(entry)
            except json.JSONDecodeError as e:
                print(f"Warning: Could not parse line {line_num}: {e}", file=sys.stderr)
    return entries


def process_entries(entries: list[dict], include_thinking: bool = False) -> dict:
    """Process entries and extract structured data."""
    result = {
        "session_id": None,
        "cwd": None,
        "git_branch": None,
        "start_time": None,
        "end_time": None,
        "files_modified": set(),
        "files_read": set(),
        "tools_used": set(),
        "phases": [],
        "decisions": [],
        "messages": [],
    }

    for entry in entries:
        entry_type = entry.get("type")
        timestamp = parse_timestamp(entry.get("timestamp", ""))

        # Track session metadata
        if not result["session_id"]:
            result["session_id"] = entry.get("sessionId")
        if not result["cwd"]:
            result["cwd"] = entry.get("cwd")
        if not result["git_branch"]:
            result["git_branch"] = entry.get("gitBranch")

        # Track time range
        if timestamp:
            if not result["start_time"] or timestamp < result["start_time"]:
                result["start_time"] = timestamp
            if not result["end_time"] or timestamp > result["end_time"]:
                result["end_time"] = timestamp

        # Skip queue operations
        if entry_type == "queue-operation":
            continue

        message = entry.get("message", {})
        role = message.get("role", "")
        content = message.get("content")

        if not content:
            continue

        # Handle user messages
        if role == "user":
            if isinstance(content, str):
                # Regular user message
                result["messages"].append({
                    "type": "user",
                    "timestamp": timestamp,
                    "content": content,
                })
                # Check for phases/plans in user message
                phases = detect_phases_and_plans(content)
                result["phases"].extend(phases)
            elif isinstance(content, list):
                # Tool results
                for item in content:
                    if item.get("type") == "tool_result":
                        tool_id = item.get("tool_use_id", "")
                        tool_content = item.get("content", "")
                        result["messages"].append({
                            "type": "tool_result",
                            "timestamp": timestamp,
                            "tool_id": tool_id,
                            "content": tool_content,
                        })

        # Handle assistant messages
        elif role == "assistant":
            if isinstance(content, list):
                for item in content:
                    item_type = item.get("type")

                    if item_type == "thinking":
                        if include_thinking:
                            thinking_text = item.get("thinking", "")
                            result["messages"].append({
                                "type": "thinking",
                                "timestamp": timestamp,
                                "content": thinking_text,
                            })

                    elif item_type == "text":
                        text = item.get("text", "")
                        result["messages"].append({
                            "type": "assistant",
                            "timestamp": timestamp,
                            "content": text,
                        })
                        # Check for phases/plans and decisions
                        phases = detect_phases_and_plans(text)
                        result["phases"].extend(phases)
                        decisions = detect_decisions(text)
                        result["decisions"].extend(decisions)

                    elif item_type == "tool_use":
                        tool_name = item.get("name", "")
                        tool_input = item.get("input", {})
                        tool_id = item.get("id", "")

                        result["tools_used"].add(tool_name)

                        # Track files
                        files = extract_files_from_tool_use(tool_name, tool_input)
                        if tool_name in ("Write", "Edit"):
                            result["files_modified"].update(files)
                        elif tool_name == "Read":
                            result["files_read"].update(files)

                        result["messages"].append({
                            "type": "tool_use",
                            "timestamp": timestamp,
                            "tool_name": tool_name,
                            "tool_input": tool_input,
                            "tool_id": tool_id,
                        })

    # Deduplicate phases and decisions
    result["phases"] = list(dict.fromkeys(result["phases"]))[:15]
    result["decisions"] = list(dict.fromkeys(result["decisions"]))[:15]

    return result


def generate_markdown(data: dict, include_thinking: bool = False, verbose: bool = False) -> str:
    """Generate markdown output from processed data."""
    lines = []

    # Header
    session_id = data.get("session_id", "unknown")
    short_id = session_id[:8] if session_id else "unknown"
    lines.append(f"# Claude Code Session: {short_id}")
    lines.append("")

    # Metadata
    if data.get("start_time"):
        lines.append(f"**Date:** {format_date(data['start_time'])}")
    if data.get("cwd"):
        lines.append(f"**Working Directory:** `{data['cwd']}`")
    if data.get("git_branch"):
        lines.append(f"**Git Branch:** `{data['git_branch']}`")
    if data.get("start_time") and data.get("end_time"):
        duration = (data["end_time"] - data["start_time"]).total_seconds()
        minutes = int(duration // 60)
        seconds = int(duration % 60)
        lines.append(f"**Duration:** {minutes}m {seconds}s")
    lines.append("")

    # Summary section
    lines.append("---")
    lines.append("## Summary")
    lines.append("")

    # Tools used
    if data.get("tools_used"):
        tools = sorted(data["tools_used"])
        lines.append(f"**Tools Used:** {', '.join(tools)}")

    # Files modified
    if data.get("files_modified"):
        files = sorted([f for f in data["files_modified"] if not f.startswith("[")])
        if files:
            lines.append(f"**Files Modified:** {len(files)} files")
            for f in files[:10]:
                lines.append(f"  - `{f}`")
            if len(files) > 10:
                lines.append(f"  - _...and {len(files) - 10} more_")

    # Files read
    if verbose and data.get("files_read"):
        files = sorted([f for f in data["files_read"] if not f.startswith("[")])
        if files:
            lines.append(f"**Files Read:** {len(files)} files")

    # Phases/plans detected
    if data.get("phases"):
        lines.append("")
        lines.append("**Phases/Plans Detected:**")
        for phase in data["phases"][:10]:
            lines.append(f"  - {phase}")

    # Key decisions
    if data.get("decisions"):
        lines.append("")
        lines.append("**Key Decisions:**")
        for decision in data["decisions"][:10]:
            lines.append(f"  - {decision}")

    lines.append("")
    lines.append("---")
    lines.append("## Conversation")
    lines.append("")

    # Messages
    last_tool_results = {}  # Map tool_id to result for matching

    for msg in data.get("messages", []):
        msg_type = msg.get("type")
        timestamp = msg.get("timestamp")
        time_str = format_time(timestamp) if timestamp else ""

        if msg_type == "user":
            lines.append(f"### 🧑 User [{time_str}]")
            lines.append("")
            content = msg.get("content", "")
            # Collapse long user messages
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

        elif msg_type == "assistant":
            lines.append(f"### 🤖 Assistant [{time_str}]")
            lines.append("")
            content = msg.get("content", "")
            lines.append(content)
            lines.append("")

        elif msg_type == "thinking" and include_thinking:
            lines.append("<details>")
            lines.append(f"<summary>💭 Thinking [{time_str}]</summary>")
            lines.append("")
            content = msg.get("content", "")
            lines.append(truncate_text(content, 2000))
            lines.append("")
            lines.append("</details>")
            lines.append("")

        elif msg_type == "tool_use":
            tool_name = msg.get("tool_name", "")
            tool_input = msg.get("tool_input", {})
            tool_id = msg.get("tool_id", "")

            lines.append("<details>")
            lines.append(f"<summary>🔧 {tool_name} [{time_str}]</summary>")
            lines.append("")
            lines.append(format_tool_use(tool_name, tool_input))

            # Look for matching result
            if tool_id in last_tool_results:
                lines.append("")
                lines.append("**Result:**")
                lines.append(format_tool_result(last_tool_results[tool_id]))

            lines.append("")
            lines.append("</details>")
            lines.append("")

        elif msg_type == "tool_result":
            # Store for matching with tool_use
            tool_id = msg.get("tool_id", "")
            content = msg.get("content", "")
            if tool_id:
                last_tool_results[tool_id] = content

    return "\n".join(lines)


def find_jsonl_files(path: Path, date_filter: Optional[str] = None) -> list[Path]:
    """Find JSONL files in a directory, optionally filtered by date."""
    if path.is_file() and path.suffix == ".jsonl":
        return [path]

    if not path.is_dir():
        return []

    files = list(path.glob("*.jsonl"))

    # Sort by modification time (newest first)
    files.sort(key=lambda f: f.stat().st_mtime, reverse=True)

    # Filter by date if specified
    if date_filter:
        try:
            filter_date = datetime.strptime(date_filter, "%Y-%m-%d").date()
            filtered = []
            for f in files:
                # Check file modification date
                mtime = datetime.fromtimestamp(f.stat().st_mtime).date()
                if mtime == filter_date:
                    filtered.append(f)
            files = filtered
        except ValueError:
            print(f"Warning: Invalid date format '{date_filter}', expected YYYY-MM-DD", file=sys.stderr)

    return files


def main():
    parser = argparse.ArgumentParser(
        description="Convert Claude Code logs to readable markdown",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  %(prog)s ~/.claude/projects/-home-user-project/
  %(prog)s session.jsonl -o session.md
  %(prog)s ~/.claude/projects/ --date 2026-01-11
  %(prog)s ~/.claude/projects/ --thinking --verbose
        """
    )
    parser.add_argument(
        "path",
        type=Path,
        help="Path to JSONL file or directory containing JSONL files"
    )
    parser.add_argument(
        "-o", "--output",
        type=Path,
        help="Output file (default: stdout)"
    )
    parser.add_argument(
        "--date",
        type=str,
        help="Filter sessions by date (YYYY-MM-DD)"
    )
    parser.add_argument(
        "--thinking",
        action="store_true",
        help="Include thinking blocks in output"
    )
    parser.add_argument(
        "--verbose",
        action="store_true",
        help="Include additional details (files read, etc.)"
    )
    parser.add_argument(
        "--list",
        action="store_true",
        help="List available sessions without converting"
    )

    args = parser.parse_args()

    # Expand ~ in path
    path = args.path.expanduser()

    if not path.exists():
        print(f"Error: Path does not exist: {path}", file=sys.stderr)
        sys.exit(1)

    # Find JSONL files
    files = find_jsonl_files(path, args.date)

    if not files:
        print(f"No JSONL files found in: {path}", file=sys.stderr)
        sys.exit(1)

    # List mode
    if args.list:
        print("Available sessions:")
        for f in files:
            mtime = datetime.fromtimestamp(f.stat().st_mtime)
            size = f.stat().st_size / 1024  # KB
            print(f"  {f.name}  ({mtime.strftime('%Y-%m-%d %H:%M')}, {size:.1f}KB)")
        sys.exit(0)

    # Process files
    all_output = []
    for filepath in files:
        entries = parse_jsonl_file(filepath)
        if not entries:
            continue

        data = process_entries(entries, include_thinking=args.thinking)
        markdown = generate_markdown(data, include_thinking=args.thinking, verbose=args.verbose)
        all_output.append(markdown)

        # Add separator between multiple files
        if len(files) > 1:
            all_output.append("\n---\n---\n")

    output_text = "\n".join(all_output)

    # Output
    if args.output:
        args.output.write_text(output_text)
        print(f"Output written to: {args.output}", file=sys.stderr)
    else:
        print(output_text)


if __name__ == "__main__":
    main()

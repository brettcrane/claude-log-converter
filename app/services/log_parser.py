"""Log parsing service - refactored from CLI tool."""

import json
import re
from datetime import datetime
from pathlib import Path

from app.models.session import FileChange, SessionDetail, SessionSummary, TimelineEvent


def parse_timestamp(ts: str) -> datetime | None:
    """Parse ISO timestamp from log entry."""
    if not ts:
        return None
    try:
        ts = ts.replace("Z", "+00:00")
        return datetime.fromisoformat(ts)
    except (ValueError, TypeError):
        return None


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
        path_patterns = re.findall(r"[/\w.-]+\.[a-zA-Z]{1,10}", cmd)
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

    numbered_pattern = re.compile(r"^\s*(\d+[\.\)]\s*.+)$", re.MULTILINE)
    matches = numbered_pattern.findall(text)
    if len(matches) >= 2:
        phases.extend(matches[:10])

    checkbox_pattern = re.compile(r"^\s*[-*]\s*\[[ x]\]\s*(.+)$", re.MULTILINE)
    matches = checkbox_pattern.findall(text)
    phases.extend(matches[:10])

    return phases


def detect_decisions(text: str) -> list[str]:
    """Detect key decisions mentioned in text."""
    decisions = []

    decision_patterns = [
        r"(?:I'll|Let's|We should|Going to|I will|We'll)\s+([^.!?\n]+[.!?]?)",
        r"(?:decided to|choosing to|opting for)\s+([^.!?\n]+[.!?]?)",
    ]

    for pattern in decision_patterns:
        matches = re.findall(pattern, text, re.IGNORECASE)
        for match in matches[:5]:
            if len(match) > 20:
                decisions.append(match.strip())

    return decisions[:10]


def parse_jsonl_file(filepath: Path) -> list[dict]:
    """Parse a JSONL file into a list of entries."""
    entries = []
    with open(filepath, encoding="utf-8") as f:
        for line in f:
            line = line.strip()
            if not line:
                continue
            try:
                entry = json.loads(line)
                entries.append(entry)
            except json.JSONDecodeError:
                continue
    return entries


def process_entries(
    entries: list[dict], include_thinking: bool = False
) -> dict:
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
        "events": [],
    }

    event_counter = 0

    for entry in entries:
        entry_type = entry.get("type")
        timestamp = parse_timestamp(entry.get("timestamp", ""))

        if not result["session_id"]:
            result["session_id"] = entry.get("sessionId")
        if not result["cwd"]:
            result["cwd"] = entry.get("cwd")
        if not result["git_branch"]:
            result["git_branch"] = entry.get("gitBranch")

        if timestamp:
            if not result["start_time"] or timestamp < result["start_time"]:
                result["start_time"] = timestamp
            if not result["end_time"] or timestamp > result["end_time"]:
                result["end_time"] = timestamp

        if entry_type == "queue-operation":
            continue

        message = entry.get("message", {})
        role = message.get("role", "")
        content = message.get("content")

        if not content:
            continue

        if role == "user":
            if isinstance(content, str):
                event_counter += 1
                result["events"].append({
                    "id": f"evt-{event_counter}",
                    "type": "user",
                    "timestamp": timestamp,
                    "content": content,
                    "tool_name": None,
                    "tool_input": None,
                    "tool_id": None,
                    "files_affected": [],
                })
                phases = detect_phases_and_plans(content)
                result["phases"].extend(phases)
            elif isinstance(content, list):
                for item in content:
                    if item.get("type") == "tool_result":
                        event_counter += 1
                        tool_id = item.get("tool_use_id", "")
                        tool_content = item.get("content", "")
                        result["events"].append({
                            "id": f"evt-{event_counter}",
                            "type": "tool_result",
                            "timestamp": timestamp,
                            "content": tool_content if isinstance(tool_content, str) else str(tool_content),
                            "tool_name": None,
                            "tool_input": None,
                            "tool_id": tool_id,
                            "files_affected": [],
                        })

        elif role == "assistant":
            if isinstance(content, list):
                for item in content:
                    item_type = item.get("type")

                    if item_type == "thinking":
                        if include_thinking:
                            event_counter += 1
                            thinking_text = item.get("thinking", "")
                            result["events"].append({
                                "id": f"evt-{event_counter}",
                                "type": "thinking",
                                "timestamp": timestamp,
                                "content": thinking_text,
                                "tool_name": None,
                                "tool_input": None,
                                "tool_id": None,
                                "files_affected": [],
                            })

                    elif item_type == "text":
                        event_counter += 1
                        text = item.get("text", "")
                        result["events"].append({
                            "id": f"evt-{event_counter}",
                            "type": "assistant",
                            "timestamp": timestamp,
                            "content": text,
                            "tool_name": None,
                            "tool_input": None,
                            "tool_id": None,
                            "files_affected": [],
                        })
                        phases = detect_phases_and_plans(text)
                        result["phases"].extend(phases)
                        decisions = detect_decisions(text)
                        result["decisions"].extend(decisions)

                    elif item_type == "tool_use":
                        event_counter += 1
                        tool_name = item.get("name", "")
                        tool_input = item.get("input", {})
                        tool_id = item.get("id", "")

                        result["tools_used"].add(tool_name)

                        files = extract_files_from_tool_use(tool_name, tool_input)
                        if tool_name in ("Write", "Edit"):
                            result["files_modified"].update(files)
                        elif tool_name == "Read":
                            result["files_read"].update(files)

                        result["events"].append({
                            "id": f"evt-{event_counter}",
                            "type": "tool_use",
                            "timestamp": timestamp,
                            "content": None,
                            "tool_name": tool_name,
                            "tool_input": tool_input,
                            "tool_id": tool_id,
                            "files_affected": files,
                        })

    result["phases"] = list(dict.fromkeys(result["phases"]))[:15]
    result["decisions"] = list(dict.fromkeys(result["decisions"]))[:15]

    return result


def get_session_summary(
    filepath: Path, project_path: str, project_name: str
) -> SessionSummary:
    """Get lightweight session summary without full parsing."""
    entries = parse_jsonl_file(filepath)
    if not entries:
        return SessionSummary(
            session_id="unknown",
            project_path=project_path,
            project_name=project_name,
            file_path=str(filepath),
            file_size_bytes=filepath.stat().st_size,
        )

    data = process_entries(entries, include_thinking=False)

    duration = None
    if data["start_time"] and data["end_time"]:
        duration = int((data["end_time"] - data["start_time"]).total_seconds())

    return SessionSummary(
        session_id=data["session_id"] or filepath.stem,
        project_path=project_path,
        project_name=project_name,
        file_path=str(filepath),
        start_time=data["start_time"],
        end_time=data["end_time"],
        duration_seconds=duration,
        git_branch=data["git_branch"],
        cwd=data["cwd"],
        message_count=len([e for e in data["events"] if e["type"] in ("user", "assistant")]),
        tool_count=len([e for e in data["events"] if e["type"] == "tool_use"]),
        files_modified_count=len(data["files_modified"]),
        file_size_bytes=filepath.stat().st_size,
    )


def get_session_detail(
    filepath: Path, project_path: str, project_name: str, include_thinking: bool = False
) -> SessionDetail:
    """Get full session details with all events."""
    entries = parse_jsonl_file(filepath)
    data = process_entries(entries, include_thinking=include_thinking)

    duration = None
    if data["start_time"] and data["end_time"]:
        duration = int((data["end_time"] - data["start_time"]).total_seconds())

    events = [TimelineEvent(**e) for e in data["events"]]

    return SessionDetail(
        session_id=data["session_id"] or filepath.stem,
        project_path=project_path,
        project_name=project_name,
        file_path=str(filepath),
        cwd=data["cwd"],
        git_branch=data["git_branch"],
        start_time=data["start_time"],
        end_time=data["end_time"],
        duration_seconds=duration,
        files_modified=sorted([f for f in data["files_modified"] if not f.startswith("[")]),
        files_read=sorted([f for f in data["files_read"] if not f.startswith("[")]),
        tools_used=sorted(data["tools_used"]),
        phases=data["phases"],
        decisions=data["decisions"],
        events=events,
    )


def extract_file_changes(session_detail: SessionDetail) -> list[FileChange]:
    """Extract file changes from session events for diff viewer."""
    changes = []

    for event in session_detail.events:
        if event.type != "tool_use" or not event.tool_input:
            continue

        if event.tool_name == "Write":
            changes.append(FileChange(
                file_path=event.tool_input.get("file_path", ""),
                operation="write",
                timestamp=event.timestamp,
                old_content=None,
                new_content=event.tool_input.get("content"),
            ))
        elif event.tool_name == "Edit":
            changes.append(FileChange(
                file_path=event.tool_input.get("file_path", ""),
                operation="edit",
                timestamp=event.timestamp,
                old_content=event.tool_input.get("old_string"),
                new_content=event.tool_input.get("new_string"),
            ))
        elif event.tool_name == "Read":
            changes.append(FileChange(
                file_path=event.tool_input.get("file_path", ""),
                operation="read",
                timestamp=event.timestamp,
            ))

    return changes

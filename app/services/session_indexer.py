"""Session indexer service - discovers and caches session metadata."""

from datetime import datetime, timezone
from pathlib import Path
from typing import Optional
from cachetools import TTLCache

from app.config import settings
from app.models.session import SessionSummary, SessionDetail
from app.services.log_parser import get_session_summary, get_session_detail


def _get_sort_time(dt: Optional[datetime]) -> datetime:
    """Get a sortable datetime, handling None and timezone-naive/aware mixing."""
    if dt is None:
        return datetime.min.replace(tzinfo=timezone.utc)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=timezone.utc)
    return dt


def _search_in_file(file_path: Path, search_term: str) -> bool:
    """Search for a term in a session file's content."""
    try:
        content = file_path.read_text(encoding="utf-8").lower()
        return search_term in content
    except Exception:
        return False


class SessionIndexer:
    """Discovers and indexes Claude Code sessions from the projects directory."""

    def __init__(self):
        self._cache = TTLCache(
            maxsize=settings.cache_max_size,
            ttl=settings.cache_ttl_seconds
        )

    def _decode_project_path(self, encoded_name: str) -> str:
        """Decode project directory name to original path.

        Example: '-home-brett-crane-code-storycrafter' -> '/home/brett-crane/code/storycrafter'
        """
        if encoded_name.startswith("-"):
            return "/" + encoded_name[1:].replace("-", "/")
        return encoded_name.replace("-", "/")

    def _get_project_name(self, encoded_name: str) -> str:
        """Extract just the project name from encoded path."""
        decoded = self._decode_project_path(encoded_name)
        return Path(decoded).name

    def get_projects(self) -> list[dict]:
        """List all projects in the Claude projects directory."""
        cache_key = "projects"
        if cache_key in self._cache:
            return self._cache[cache_key]

        projects = []
        projects_dir = settings.claude_projects_dir

        if not projects_dir.exists():
            return projects

        for project_dir in sorted(projects_dir.iterdir()):
            if not project_dir.is_dir():
                continue
            if project_dir.name.startswith("."):
                continue

            jsonl_files = list(project_dir.glob("*.jsonl"))
            if not jsonl_files:
                continue

            projects.append({
                "encoded_name": project_dir.name,
                "decoded_path": self._decode_project_path(project_dir.name),
                "name": self._get_project_name(project_dir.name),
                "session_count": len(jsonl_files),
                "path": str(project_dir),
            })

        self._cache[cache_key] = projects
        return projects

    def get_sessions(
        self,
        project: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        search: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[SessionSummary], int]:
        """Get sessions with optional filtering."""
        cache_key = f"sessions:{project}:{date_from}:{date_to}:{search}"

        # Get all sessions (possibly from cache)
        if cache_key in self._cache:
            all_sessions = self._cache[cache_key]
        else:
            all_sessions = self._scan_sessions(project)

            # Apply date filters
            if date_from:
                all_sessions = [
                    s for s in all_sessions
                    if s.start_time and s.start_time >= date_from
                ]
            if date_to:
                all_sessions = [
                    s for s in all_sessions
                    if s.start_time and s.start_time <= date_to
                ]

            # Apply search filter (searches metadata AND conversation content)
            if search:
                search_lower = search.lower()
                filtered_sessions = []
                for s in all_sessions:
                    # Check metadata first (fast)
                    if (search_lower in s.project_name.lower() or
                        search_lower in (s.cwd or "").lower() or
                        search_lower in (s.git_branch or "").lower()):
                        filtered_sessions.append(s)
                    # Check file content (slower, but searches conversation)
                    elif _search_in_file(Path(s.file_path), search_lower):
                        filtered_sessions.append(s)
                all_sessions = filtered_sessions

            self._cache[cache_key] = all_sessions

        # Sort by start time descending (newest first)
        all_sessions.sort(
            key=lambda s: _get_sort_time(s.start_time),
            reverse=True
        )

        total = len(all_sessions)
        paginated = all_sessions[offset:offset + limit]

        return paginated, total

    def _scan_sessions(self, project: Optional[str] = None) -> list[SessionSummary]:
        """Scan projects directory for sessions."""
        sessions = []
        projects_dir = settings.claude_projects_dir

        if not projects_dir.exists():
            return sessions

        if project:
            # Scan single project
            project_dirs = [projects_dir / project]
        else:
            # Scan all projects
            project_dirs = [
                d for d in projects_dir.iterdir()
                if d.is_dir() and not d.name.startswith(".")
            ]

        for project_dir in project_dirs:
            if not project_dir.exists():
                continue

            project_path = self._decode_project_path(project_dir.name)
            project_name = self._get_project_name(project_dir.name)

            for jsonl_file in project_dir.glob("*.jsonl"):
                try:
                    summary = get_session_summary(
                        jsonl_file,
                        project_path=project_path,
                        project_name=project_name,
                    )
                    sessions.append(summary)
                except Exception:
                    # Skip files that can't be parsed
                    continue

        return sessions

    def get_session_by_id(
        self,
        session_id: str,
        include_thinking: bool = False
    ) -> Optional[SessionDetail]:
        """Get full session details by session ID."""
        # Session ID is typically the JSONL filename (without extension)
        # We need to search for it across projects

        projects_dir = settings.claude_projects_dir
        if not projects_dir.exists():
            return None

        for project_dir in projects_dir.iterdir():
            if not project_dir.is_dir() or project_dir.name.startswith("."):
                continue

            # Check for exact match
            jsonl_file = project_dir / f"{session_id}.jsonl"
            if jsonl_file.exists():
                project_path = self._decode_project_path(project_dir.name)
                project_name = self._get_project_name(project_dir.name)
                return get_session_detail(
                    jsonl_file,
                    project_path=project_path,
                    project_name=project_name,
                    include_thinking=include_thinking,
                )

            # Also check files where the session_id is embedded
            for jsonl_file in project_dir.glob("*.jsonl"):
                if session_id in jsonl_file.stem:
                    project_path = self._decode_project_path(project_dir.name)
                    project_name = self._get_project_name(project_dir.name)
                    return get_session_detail(
                        jsonl_file,
                        project_path=project_path,
                        project_name=project_name,
                        include_thinking=include_thinking,
                    )

        return None

    def clear_cache(self):
        """Clear the session cache."""
        self._cache.clear()


# Global instance
session_indexer = SessionIndexer()

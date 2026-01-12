"""Session indexer service - discovers and caches session metadata."""

import logging
from datetime import UTC, datetime
from pathlib import Path

from cachetools import TTLCache

from app.config import settings
from app.models.session import SessionDetail, SessionSummary
from app.services.log_parser import get_session_detail, get_session_summary

# Import SQLite backend if enabled
if settings.use_sqlite_index:
    from app.services.session_db import SessionDatabase

logger = logging.getLogger(__name__)


def _get_sort_time(dt: datetime | None) -> datetime:
    """Get a sortable datetime, handling None and timezone-naive/aware mixing."""
    if dt is None:
        return datetime.min.replace(tzinfo=UTC)
    if dt.tzinfo is None:
        return dt.replace(tzinfo=UTC)
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

        # Initialize SQLite backend if enabled
        self.db: SessionDatabase | None = None
        if settings.use_sqlite_index:
            try:
                self.db = SessionDatabase(settings.db_path)
                logger.info("SQLite indexer initialized")
                # Perform incremental sync on startup
                self._sync_index()
            except Exception as e:
                logger.error(f"Failed to initialize SQLite backend: {e}", exc_info=True)
                logger.warning("Falling back to TTLCache-only mode")
                self.db = None

    def _decode_project_path(self, encoded_name: str) -> str:
        """Decode project directory name to original path.

        Example: '-home-brett-crane-code-storycrafter' -> '/home/brett-crane/code/storycrafter'

        Uses filesystem validation to handle dashes in directory names.
        """
        if not encoded_name.startswith("-"):
            return encoded_name.replace("-", "/")

        # Split into segments (skip leading empty string from split)
        segments = encoded_name[1:].split("-")
        if not segments:
            return "/"

        # Greedily reconstruct path by checking filesystem
        decoded_parts = []
        current_segment = ""

        for i, segment in enumerate(segments):
            if current_segment:
                current_segment += "-" + segment
            else:
                current_segment = segment

            # Build potential path so far
            test_path = "/" + "/".join(decoded_parts + [current_segment])

            # Check if this path exists OR if we're at the last segment
            if Path(test_path).exists() or i == len(segments) - 1:
                decoded_parts.append(current_segment)
                current_segment = ""

        # Handle any remaining segment
        if current_segment:
            decoded_parts.append(current_segment)

        return "/" + "/".join(decoded_parts)

    def _get_project_name(self, encoded_name: str) -> str:
        """Extract just the project name from encoded path."""
        decoded = self._decode_project_path(encoded_name)
        return Path(decoded).name

    def _sync_index(self):
        """Incrementally sync new/stale sessions to SQLite index.

        This is called on startup to ensure index is up-to-date.
        """
        if not self.db:
            return

        try:
            stale_files = self.db.check_stale_sessions(settings.claude_projects_dir)
            if stale_files:
                logger.info(f"Syncing {len(stale_files)} new/stale session(s) to index...")
                for file_path in stale_files:
                    try:
                        # Decode project info from file path
                        project_dir = file_path.parent
                        project_path = self._decode_project_path(project_dir.name)
                        project_name = self._get_project_name(project_dir.name)

                        self.db.index_session(file_path, project_path, project_name)
                    except Exception as e:
                        logger.error(f"Failed to sync {file_path}: {e}")
                        continue
                logger.info("Index sync complete")
        except Exception as e:
            logger.error(f"Failed to sync index: {e}", exc_info=True)

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
        project: str | None = None,
        date_from: datetime | None = None,
        date_to: datetime | None = None,
        search: str | None = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[SessionSummary], int]:
        """Get sessions with optional filtering.

        Uses SQLite backend if enabled for 100x faster search.
        Falls back to TTLCache + file scanning if SQLite unavailable.
        """
        # Use SQLite backend if available
        if self.db:
            try:
                return self.db.get_sessions(
                    project=project,
                    date_from=date_from,
                    date_to=date_to,
                    search=search,
                    offset=offset,
                    limit=limit
                )
            except Exception as e:
                logger.error(f"SQLite query failed, falling back to file scan: {e}")
                # Fall through to TTLCache approach

        # Fallback: Original TTLCache approach
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

    def _scan_sessions(self, project: str | None = None) -> list[SessionSummary]:
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
    ) -> SessionDetail | None:
        """Get full session details by session ID.

        Uses SQLite backend if enabled for instant retrieval.
        Falls back to file scanning if SQLite unavailable.
        """
        # Use SQLite backend if available
        if self.db:
            try:
                result = self.db.get_session_by_id(session_id, include_thinking)
                if result:
                    return result
                # If not found in DB, fall through to file scan
                # (handles case where session isn't indexed yet)
            except Exception as e:
                logger.error(f"SQLite query failed, falling back to file scan: {e}")
                # Fall through to file scan approach

        # Fallback: Original file scanning approach
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
        """Clear the session cache and sync new/stale sessions.

        When SQLite is enabled, this also triggers an incremental sync
        to pick up new sessions and detect file modifications.
        """
        self._cache.clear()

        # Trigger incremental sync if SQLite is enabled
        if self.db:
            logger.info("Cache cleared, syncing index...")
            self._sync_index()

    def rebuild_index(self) -> int:
        """Rebuild entire SQLite index from JSONL files.

        This is a manual operation that clears and rebuilds the entire index.
        Safe to call at any time - uses JSONL as source of truth.

        Returns:
            Number of sessions indexed

        Raises:
            RuntimeError: If SQLite backend is not enabled
        """
        if not self.db:
            raise RuntimeError("SQLite backend is not enabled")

        return self.db.rebuild_index(settings.claude_projects_dir)

    def get_index_stats(self) -> dict:
        """Get statistics about the SQLite index.

        Returns:
            Dictionary with index stats (session_count, etc.)
        """
        if not self.db:
            return {
                "enabled": False,
                "session_count": 0,
            }

        return {
            "enabled": True,
            "session_count": self.db.get_indexed_session_count(),
            "db_path": str(settings.db_path),
        }

    def repair_fts5_if_needed(self) -> bool:
        """Check and repair FTS5 index if corrupted.

        Returns:
            True if repair was needed and successful, False if no repair needed
        """
        if not self.db:
            return False

        return self.db.repair_fts5_if_needed()


# Global instance
session_indexer = SessionIndexer()

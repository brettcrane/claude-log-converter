"""
Reference implementation of SQLite hybrid indexer for Claude Log Converter.

This is a PROOF OF CONCEPT showing how to implement the hybrid approach
recommended in SQLITE_ANALYSIS.md. Not production-ready, but demonstrates
the key concepts.

Key Features:
- JSONL remains source of truth (immutable)
- SQLite is expendable cache/index
- Same parser logic as current implementation
- FTS5 full-text search
- Automatic stale detection via file mtime
- Rebuild index from JSONL at any time
"""

import json
import sqlite3
from datetime import datetime
from pathlib import Path
from typing import Optional

from app.models.session import SessionSummary, SessionDetail
from app.services.log_parser import get_session_summary, get_session_detail


class SQLiteIndexer:
    """SQLite-based session indexer with hybrid JSONL approach."""

    def __init__(self, db_path: Path):
        self.db_path = db_path
        self._init_schema()

    def _init_schema(self):
        """Create tables if they don't exist."""
        with sqlite3.connect(self.db_path) as conn:
            conn.executescript("""
                -- Sessions metadata table
                CREATE TABLE IF NOT EXISTS sessions (
                    session_id TEXT PRIMARY KEY,
                    project_path TEXT NOT NULL,
                    project_name TEXT NOT NULL,
                    file_path TEXT NOT NULL UNIQUE,
                    start_time TEXT,
                    end_time TEXT,
                    duration_seconds INTEGER,
                    git_branch TEXT,
                    cwd TEXT,
                    message_count INTEGER DEFAULT 0,
                    tool_count INTEGER DEFAULT 0,
                    files_modified_count INTEGER DEFAULT 0,
                    file_size_bytes INTEGER DEFAULT 0,
                    indexed_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    file_mtime INTEGER  -- Track file modification time for stale detection
                );

                CREATE INDEX IF NOT EXISTS idx_sessions_project ON sessions(project_name);
                CREATE INDEX IF NOT EXISTS idx_sessions_start_time ON sessions(start_time);

                -- Timeline events table
                CREATE TABLE IF NOT EXISTS events (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    session_id TEXT NOT NULL,
                    event_id TEXT NOT NULL,
                    type TEXT NOT NULL,  -- user, assistant, tool_use, tool_result, thinking
                    timestamp TEXT,
                    content TEXT,
                    tool_name TEXT,
                    tool_input_json TEXT,  -- JSON string of tool input
                    FOREIGN KEY(session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
                );

                CREATE INDEX IF NOT EXISTS idx_events_session ON events(session_id);
                CREATE INDEX IF NOT EXISTS idx_events_type ON events(type);

                -- FTS5 full-text search index
                CREATE VIRTUAL TABLE IF NOT EXISTS events_fts USING fts5(
                    session_id UNINDEXED,
                    event_id UNINDEXED,
                    content,
                    content=events,
                    content_rowid=id
                );

                -- Triggers to keep FTS5 in sync with events table
                CREATE TRIGGER IF NOT EXISTS events_ai AFTER INSERT ON events BEGIN
                    INSERT INTO events_fts(rowid, session_id, event_id, content)
                    VALUES (new.id, new.session_id, new.event_id, new.content);
                END;

                CREATE TRIGGER IF NOT EXISTS events_ad AFTER DELETE ON events BEGIN
                    DELETE FROM events_fts WHERE rowid = old.id;
                END;

                CREATE TRIGGER IF NOT EXISTS events_au AFTER UPDATE ON events BEGIN
                    DELETE FROM events_fts WHERE rowid = old.id;
                    INSERT INTO events_fts(rowid, session_id, event_id, content)
                    VALUES (new.id, new.session_id, new.event_id, new.content);
                END;

                -- Future: Session tags
                CREATE TABLE IF NOT EXISTS session_tags (
                    session_id TEXT NOT NULL,
                    tag TEXT NOT NULL,
                    created_at TEXT DEFAULT CURRENT_TIMESTAMP,
                    PRIMARY KEY (session_id, tag),
                    FOREIGN KEY(session_id) REFERENCES sessions(session_id) ON DELETE CASCADE
                );
            """)

    def index_session(self, file_path: Path, project_path: str, project_name: str):
        """Index a single session file into SQLite.

        Uses existing parser logic from log_parser.py - no duplication!
        """
        # Use existing parser (same logic as current implementation)
        summary = get_session_summary(file_path, project_path, project_name)
        detail = get_session_detail(file_path, project_path, project_name, include_thinking=False)

        file_mtime = int(file_path.stat().st_mtime)

        with sqlite3.connect(self.db_path) as conn:
            # Insert/update session metadata
            conn.execute("""
                INSERT OR REPLACE INTO sessions (
                    session_id, project_path, project_name, file_path,
                    start_time, end_time, duration_seconds, git_branch, cwd,
                    message_count, tool_count, files_modified_count,
                    file_size_bytes, file_mtime, indexed_at
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
            """, (
                summary.session_id,
                summary.project_path,
                summary.project_name,
                str(file_path),
                summary.start_time.isoformat() if summary.start_time else None,
                summary.end_time.isoformat() if summary.end_time else None,
                summary.duration_seconds,
                summary.git_branch,
                summary.cwd,
                summary.message_count,
                summary.tool_count,
                summary.files_modified_count,
                summary.file_size_bytes,
                file_mtime,
            ))

            # Delete old events for this session (if re-indexing)
            conn.execute("DELETE FROM events WHERE session_id = ?", (summary.session_id,))

            # Insert timeline events
            for event in detail.events:
                tool_input_json = json.dumps(event.tool_input) if event.tool_input else None

                conn.execute("""
                    INSERT INTO events (
                        session_id, event_id, type, timestamp, content,
                        tool_name, tool_input_json
                    ) VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    summary.session_id,
                    event.id,
                    event.type,
                    event.timestamp.isoformat() if event.timestamp else None,
                    event.content,
                    event.tool_name,
                    tool_input_json,
                ))

            conn.commit()

    def get_sessions(
        self,
        project: Optional[str] = None,
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        search: Optional[str] = None,
        offset: int = 0,
        limit: int = 20,
    ) -> tuple[list[SessionSummary], int]:
        """Get sessions from SQLite with filtering."""
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            # Build query with filters
            where_clauses = []
            params = []

            if project:
                where_clauses.append("project_name = ?")
                params.append(project)

            if date_from:
                where_clauses.append("start_time >= ?")
                params.append(date_from.isoformat())

            if date_to:
                where_clauses.append("start_time <= ?")
                params.append(date_to.isoformat())

            if search:
                # Use FTS5 for full-text search on event content
                where_clauses.append("""
                    session_id IN (
                        SELECT DISTINCT session_id FROM events_fts
                        WHERE events_fts MATCH ?
                    )
                """)
                params.append(search)

            where_sql = " AND ".join(where_clauses) if where_clauses else "1=1"

            # Get total count
            count_query = f"SELECT COUNT(*) FROM sessions WHERE {where_sql}"
            total = conn.execute(count_query, params).fetchone()[0]

            # Get paginated results
            query = f"""
                SELECT * FROM sessions
                WHERE {where_sql}
                ORDER BY start_time DESC
                LIMIT ? OFFSET ?
            """
            params.extend([limit, offset])

            rows = conn.execute(query, params).fetchall()

            # Convert to SessionSummary objects
            sessions = []
            for row in rows:
                sessions.append(SessionSummary(
                    session_id=row["session_id"],
                    project_path=row["project_path"],
                    project_name=row["project_name"],
                    file_path=row["file_path"],
                    start_time=datetime.fromisoformat(row["start_time"]) if row["start_time"] else None,
                    end_time=datetime.fromisoformat(row["end_time"]) if row["end_time"] else None,
                    duration_seconds=row["duration_seconds"],
                    git_branch=row["git_branch"],
                    cwd=row["cwd"],
                    message_count=row["message_count"],
                    tool_count=row["tool_count"],
                    files_modified_count=row["files_modified_count"],
                    file_size_bytes=row["file_size_bytes"],
                ))

            return sessions, total

    def get_session_by_id(self, session_id: str) -> Optional[SessionDetail]:
        """Get full session details from SQLite.

        Falls back to JSONL if not in index (or stale).
        """
        with sqlite3.connect(self.db_path) as conn:
            conn.row_factory = sqlite3.Row

            # Check if session exists and get file path
            row = conn.execute(
                "SELECT file_path, file_mtime FROM sessions WHERE session_id = ?",
                (session_id,)
            ).fetchone()

            if not row:
                return None

            file_path = Path(row["file_path"])
            indexed_mtime = row["file_mtime"]

            # Check if file is newer than index (stale detection)
            if not file_path.exists():
                return None

            current_mtime = int(file_path.stat().st_mtime)
            if current_mtime > indexed_mtime:
                # File was modified, re-index
                # (In production, this would happen in background)
                # For now, fall back to JSONL
                return None

            # TODO: Reconstruct SessionDetail from events table
            # For now, return None (would use existing parser as fallback)
            return None

    def check_stale_sessions(self, projects_dir: Path) -> list[Path]:
        """Find JSONL files that are newer than their index."""
        stale_files = []

        with sqlite3.connect(self.db_path) as conn:
            rows = conn.execute(
                "SELECT file_path, file_mtime FROM sessions"
            ).fetchall()

            indexed_files = {}
            for row in rows:
                indexed_files[row[0]] = row[1]

        # Check if indexed files are stale
        for file_path_str, indexed_mtime in indexed_files.items():
            file_path = Path(file_path_str)
            if file_path.exists():
                current_mtime = int(file_path.stat().st_mtime)
                if current_mtime > indexed_mtime:
                    stale_files.append(file_path)

        # Find new files not in index
        for jsonl_file in projects_dir.rglob("*.jsonl"):
            if str(jsonl_file) not in indexed_files:
                stale_files.append(jsonl_file)

        return stale_files

    def rebuild_index(self, projects_dir: Path):
        """Rebuild entire index from JSONL files.

        Safe to call at any time - uses JSONL as source of truth.
        """
        with sqlite3.connect(self.db_path) as conn:
            # Clear all data
            conn.execute("DELETE FROM sessions")
            conn.commit()

        # Re-index all JSONL files
        for project_dir in projects_dir.iterdir():
            if not project_dir.is_dir() or project_dir.name.startswith("."):
                continue

            project_path = self._decode_project_path(project_dir.name)
            project_name = Path(project_path).name

            for jsonl_file in project_dir.glob("*.jsonl"):
                try:
                    self.index_session(jsonl_file, project_path, project_name)
                except Exception as e:
                    print(f"Failed to index {jsonl_file}: {e}")
                    continue

    def _decode_project_path(self, encoded_name: str) -> str:
        """Decode project directory name to original path."""
        if encoded_name.startswith("-"):
            return "/" + encoded_name[1:].replace("-", "/")
        return encoded_name.replace("-", "/")


# Example usage:
if __name__ == "__main__":
    from app.config import settings

    # Initialize indexer
    db_path = Path.home() / ".claude-log-converter" / "index.db"
    indexer = SQLiteIndexer(db_path)

    # Rebuild index from scratch
    print("Rebuilding index from JSONL files...")
    indexer.rebuild_index(settings.claude_projects_dir)

    # Search example
    print("\nSearching for 'SQLite'...")
    sessions, total = indexer.get_sessions(search="SQLite", limit=10)
    print(f"Found {total} sessions")
    for session in sessions:
        print(f"  - {session.session_id[:8]} ({session.project_name})")

    # Check for stale sessions
    print("\nChecking for stale sessions...")
    stale = indexer.check_stale_sessions(settings.claude_projects_dir)
    if stale:
        print(f"Found {len(stale)} stale session(s):")
        for file_path in stale:
            print(f"  - {file_path}")
    else:
        print("Index is up to date!")

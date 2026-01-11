"""Database connection management and initialization."""

import sqlite3
from contextlib import contextmanager

from app.config import settings


def init_database():
    """Initialize database and create tables."""
    # Ensure parent directory exists
    settings.bookmark_db_path.parent.mkdir(parents=True, exist_ok=True)

    with sqlite3.connect(settings.bookmark_db_path) as conn:
        # Enable WAL mode for better concurrency
        conn.execute("PRAGMA journal_mode=WAL")
        conn.execute("PRAGMA busy_timeout=5000")

        # Create bookmarks table
        conn.execute("""
            CREATE TABLE IF NOT EXISTS bookmarks (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                session_id TEXT NOT NULL,
                event_id TEXT NOT NULL,
                event_index INTEGER NOT NULL,

                -- Denormalized session/event metadata
                project_name TEXT,
                git_branch TEXT,
                event_timestamp TIMESTAMP,
                event_type TEXT,

                -- User data
                category TEXT DEFAULT 'general',
                note TEXT,

                -- Bookmark metadata
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

                UNIQUE(session_id, event_id)
            )
        """)

        # Create indexes for fast queries
        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookmarks_session_id
            ON bookmarks(session_id)
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookmarks_category
            ON bookmarks(category)
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookmarks_created_at
            ON bookmarks(created_at DESC)
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookmarks_event_timestamp
            ON bookmarks(event_timestamp DESC)
        """)

        conn.execute("""
            CREATE INDEX IF NOT EXISTS idx_bookmarks_project_name
            ON bookmarks(project_name)
        """)

        conn.commit()


@contextmanager
def get_db_connection():
    """Get database connection with automatic commit/rollback."""
    conn = sqlite3.connect(settings.bookmark_db_path, timeout=5.0)
    conn.row_factory = sqlite3.Row  # Dict-like access
    try:
        yield conn
        conn.commit()
    except Exception:
        conn.rollback()
        raise
    finally:
        conn.close()


def get_db():
    """FastAPI dependency for database connection."""
    with get_db_connection() as conn:
        yield conn

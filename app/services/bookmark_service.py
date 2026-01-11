"""Bookmark service - business logic for bookmarks."""

from sqlite3 import Connection, IntegrityError

from app.models.bookmark import Bookmark, BookmarkCreate, BookmarkUpdate


class BookmarkError(Exception):
    """Base exception for bookmark operations."""


class DuplicateBookmarkError(BookmarkError):
    """Raised when trying to create a duplicate bookmark."""


def create_bookmark(conn: Connection, data: BookmarkCreate) -> Bookmark:
    """Create a new bookmark."""
    try:
        cursor = conn.execute(
            """
            INSERT INTO bookmarks (
                session_id, event_id, event_index,
                project_name, git_branch, event_timestamp, event_type,
                category, note
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                data.session_id,
                data.event_id,
                data.event_index,
                data.project_name,
                data.git_branch,
                data.event_timestamp.isoformat() if data.event_timestamp else None,
                data.event_type,
                data.category,
                data.note,
            ),
        )
        bookmark_id = cursor.lastrowid
        result = get_bookmark(conn, bookmark_id)
        if not result:
            raise BookmarkError("Failed to retrieve created bookmark")
        return result
    except IntegrityError as e:
        if "UNIQUE constraint failed" in str(e):
            raise DuplicateBookmarkError("Bookmark already exists for this event") from e
        raise


def get_bookmark(conn: Connection, bookmark_id: int) -> Bookmark | None:
    """Get a bookmark by ID."""
    cursor = conn.execute("SELECT * FROM bookmarks WHERE id = ?", (bookmark_id,))
    row = cursor.fetchone()
    if row:
        return Bookmark(**dict(row))
    return None


def list_bookmarks(
    conn: Connection,
    session_id: str | None = None,
    project: str | None = None,
    category: str | None = None,
    search: str | None = None,
    offset: int = 0,
    limit: int = 50,
    order_by: str = "created_at",
    order: str = "desc",
) -> tuple[list[Bookmark], int]:
    """List bookmarks with optional filtering."""
    # Build WHERE clause
    where_clauses = []
    params = []

    if session_id:
        where_clauses.append("session_id = ?")
        params.append(session_id)

    if project:
        where_clauses.append("project_name = ?")
        params.append(project)

    if category:
        where_clauses.append("category = ?")
        params.append(category)

    if search:
        where_clauses.append("note LIKE ?")
        params.append(f"%{search}%")

    where_clause = " AND ".join(where_clauses) if where_clauses else "1=1"

    # Validate order_by and order
    allowed_order_by = ["created_at", "updated_at", "event_timestamp", "id"]
    allowed_order = ["asc", "desc"]
    if order_by not in allowed_order_by:
        order_by = "created_at"
    if order not in allowed_order:
        order = "desc"

    # Get total count
    cursor = conn.execute(
        f"SELECT COUNT(*) FROM bookmarks WHERE {where_clause}",
        params,
    )
    total = cursor.fetchone()[0]

    # Get paginated results
    cursor = conn.execute(
        f"""
        SELECT * FROM bookmarks
        WHERE {where_clause}
        ORDER BY {order_by} {order}
        LIMIT ? OFFSET ?
        """,
        params + [limit, offset],
    )
    bookmarks = [Bookmark(**dict(row)) for row in cursor.fetchall()]

    return bookmarks, total


def update_bookmark(
    conn: Connection, bookmark_id: int, data: BookmarkUpdate
) -> Bookmark | None:
    """Update a bookmark."""
    updates = []
    params = []

    if data.category is not None:
        updates.append("category = ?")
        params.append(data.category)

    if data.note is not None:
        updates.append("note = ?")
        params.append(data.note)

    if not updates:
        return get_bookmark(conn, bookmark_id)

    updates.append("updated_at = CURRENT_TIMESTAMP")
    params.append(bookmark_id)

    conn.execute(
        f"UPDATE bookmarks SET {', '.join(updates)} WHERE id = ?",
        params,
    )

    return get_bookmark(conn, bookmark_id)


def delete_bookmark(conn: Connection, bookmark_id: int) -> bool:
    """Delete a bookmark. Returns True if deleted, False if not found."""
    cursor = conn.execute("DELETE FROM bookmarks WHERE id = ?", (bookmark_id,))
    return cursor.rowcount > 0


def delete_session_bookmarks(conn: Connection, session_id: str) -> int:
    """Delete all bookmarks for a session. Returns number deleted."""
    cursor = conn.execute("DELETE FROM bookmarks WHERE session_id = ?", (session_id,))
    return cursor.rowcount


def get_session_bookmarks(conn: Connection, session_id: str) -> list[Bookmark]:
    """Get all bookmarks for a session."""
    bookmarks, _ = list_bookmarks(conn, session_id=session_id, limit=1000)
    return bookmarks

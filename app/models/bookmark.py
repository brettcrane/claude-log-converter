"""Bookmark-related Pydantic models."""

from datetime import datetime

from pydantic import BaseModel


class BookmarkCreate(BaseModel):
    """Request model for creating a bookmark."""

    session_id: str
    event_id: str
    event_index: int
    project_name: str | None = None
    git_branch: str | None = None
    event_timestamp: datetime | None = None
    event_type: str | None = None
    category: str = "general"
    note: str | None = None


class BookmarkUpdate(BaseModel):
    """Request model for updating a bookmark."""

    category: str | None = None
    note: str | None = None


class Bookmark(BaseModel):
    """Bookmark model."""

    id: int
    session_id: str
    event_id: str
    event_index: int
    project_name: str | None = None
    git_branch: str | None = None
    event_timestamp: datetime | None = None
    event_type: str | None = None
    category: str
    note: str | None = None
    created_at: datetime
    updated_at: datetime


class PaginatedBookmarksResponse(BaseModel):
    """Paginated bookmarks response."""

    data: list[Bookmark]
    total: int
    offset: int
    limit: int
    has_more: bool

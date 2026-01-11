"""Bookmarks API routes."""

from sqlite3 import Connection

from fastapi import APIRouter, Depends, HTTPException, Query

from app.models.bookmark import (
    Bookmark,
    BookmarkCreate,
    BookmarkUpdate,
    PaginatedBookmarksResponse,
)
from app.services import bookmark_service
from app.services.bookmark_service import DuplicateBookmarkError
from app.services.database import get_db

router = APIRouter()


@router.post("", response_model=Bookmark, status_code=201)
async def create_bookmark(
    data: BookmarkCreate,
    db: Connection = Depends(get_db),
):
    """Create a new bookmark."""
    try:
        return bookmark_service.create_bookmark(db, data)
    except DuplicateBookmarkError as e:
        raise HTTPException(status_code=409, detail=str(e)) from e


@router.get("", response_model=PaginatedBookmarksResponse)
async def list_bookmarks(
    session_id: str | None = Query(None),
    project: str | None = Query(None),
    category: str | None = Query(None),
    search: str | None = Query(None),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
    order_by: str = Query("created_at"),
    order: str = Query("desc"),
    db: Connection = Depends(get_db),
):
    """List bookmarks with optional filtering."""
    bookmarks, total = bookmark_service.list_bookmarks(
        db,
        session_id=session_id,
        project=project,
        category=category,
        search=search,
        offset=offset,
        limit=limit,
        order_by=order_by,
        order=order,
    )
    return PaginatedBookmarksResponse(
        data=bookmarks,
        total=total,
        offset=offset,
        limit=limit,
        has_more=(offset + limit) < total,
    )


@router.get("/{bookmark_id}", response_model=Bookmark)
async def get_bookmark(
    bookmark_id: int,
    db: Connection = Depends(get_db),
):
    """Get a specific bookmark."""
    bookmark = bookmark_service.get_bookmark(db, bookmark_id)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark


@router.put("/{bookmark_id}", response_model=Bookmark)
async def update_bookmark(
    bookmark_id: int,
    data: BookmarkUpdate,
    db: Connection = Depends(get_db),
):
    """Update a bookmark."""
    bookmark = bookmark_service.update_bookmark(db, bookmark_id, data)
    if not bookmark:
        raise HTTPException(status_code=404, detail="Bookmark not found")
    return bookmark


@router.delete("/{bookmark_id}", status_code=204)
async def delete_bookmark(
    bookmark_id: int,
    db: Connection = Depends(get_db),
):
    """Delete a bookmark."""
    deleted = bookmark_service.delete_bookmark(db, bookmark_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Bookmark not found")


@router.get("/session/{session_id}", response_model=list[Bookmark])
async def get_session_bookmarks(
    session_id: str,
    db: Connection = Depends(get_db),
):
    """Get all bookmarks for a session."""
    return bookmark_service.get_session_bookmarks(db, session_id)


@router.delete("/session/{session_id}")
async def delete_session_bookmarks(
    session_id: str,
    db: Connection = Depends(get_db),
):
    """Delete all bookmarks for a session."""
    count = bookmark_service.delete_session_bookmarks(db, session_id)
    return {"status": "ok", "deleted": count}

"""Sessions API routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, HTTPException, Query

from app.config import settings
from app.models.session import PaginatedResponse, SessionDetail, TimelineEvent, FileChange
from app.services.session_indexer import session_indexer
from app.services.log_parser import extract_file_changes

router = APIRouter()


@router.get("")
async def list_sessions(
    project: Optional[str] = Query(None, description="Filter by project encoded name"),
    date_from: Optional[datetime] = Query(None, description="Filter sessions from this date"),
    date_to: Optional[datetime] = Query(None, description="Filter sessions to this date"),
    search: Optional[str] = Query(None, description="Search in project name, cwd, branch"),
    offset: int = Query(0, ge=0, description="Pagination offset"),
    limit: int = Query(
        settings.default_page_size,
        ge=1,
        le=settings.max_page_size,
        description="Items per page"
    ),
):
    """List sessions with optional filtering and pagination."""
    sessions, total = session_indexer.get_sessions(
        project=project,
        date_from=date_from,
        date_to=date_to,
        search=search,
        offset=offset,
        limit=limit,
    )

    return PaginatedResponse(
        data=[s.model_dump() for s in sessions],
        total=total,
        offset=offset,
        limit=limit,
        has_more=(offset + limit) < total,
    )


@router.get("/{session_id}")
async def get_session(
    session_id: str,
    include_thinking: bool = Query(False, description="Include thinking blocks"),
):
    """Get full session details by ID."""
    session = session_indexer.get_session_by_id(
        session_id,
        include_thinking=include_thinking,
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return session


@router.get("/{session_id}/timeline")
async def get_session_timeline(
    session_id: str,
    include_thinking: bool = Query(False, description="Include thinking blocks"),
    event_types: Optional[list[str]] = Query(None, description="Filter by event types"),
    offset: int = Query(0, ge=0),
    limit: int = Query(50, ge=1, le=200),
):
    """Get paginated timeline events for a session."""
    session = session_indexer.get_session_by_id(
        session_id,
        include_thinking=include_thinking,
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    events = session.events

    # Filter by event types if specified
    if event_types:
        events = [e for e in events if e.type in event_types]

    total = len(events)
    paginated = events[offset:offset + limit]

    return PaginatedResponse(
        data=[e.model_dump() for e in paginated],
        total=total,
        offset=offset,
        limit=limit,
        has_more=(offset + limit) < total,
    )


@router.get("/{session_id}/files")
async def get_session_files(session_id: str):
    """Get files touched in a session."""
    session = session_indexer.get_session_by_id(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    file_changes = extract_file_changes(session)

    # Group by file path
    files_map: dict[str, dict] = {}
    for change in file_changes:
        if change.file_path not in files_map:
            files_map[change.file_path] = {
                "path": change.file_path,
                "operations": [],
            }
        files_map[change.file_path]["operations"].append({
            "type": change.operation,
            "timestamp": change.timestamp.isoformat() if change.timestamp else None,
        })

    return {
        "files_modified": session.files_modified,
        "files_read": session.files_read,
        "changes": list(files_map.values()),
    }


@router.get("/{session_id}/file-changes/{file_path:path}")
async def get_file_changes(session_id: str, file_path: str):
    """Get all changes to a specific file in a session."""
    session = session_indexer.get_session_by_id(session_id)

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    file_changes = extract_file_changes(session)
    changes = [c for c in file_changes if c.file_path == f"/{file_path}" or c.file_path == file_path]

    return {
        "file_path": file_path,
        "changes": [c.model_dump() for c in changes],
    }


@router.post("/cache/clear")
async def clear_cache():
    """Clear the session cache."""
    session_indexer.clear_cache()
    return {"status": "ok", "message": "Cache cleared"}

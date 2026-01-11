"""Export API routes."""

import json
from typing import Optional

from fastapi import APIRouter, HTTPException, Query
from fastapi.responses import PlainTextResponse, JSONResponse

from app.services.session_indexer import session_indexer
from app.services.export_service import generate_markdown

router = APIRouter()


@router.get("/{session_id}/markdown")
async def export_markdown(
    session_id: str,
    include_thinking: bool = Query(False),
    verbose: bool = Query(False),
):
    """Export session as markdown."""
    session = session_indexer.get_session_by_id(
        session_id,
        include_thinking=include_thinking,
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    markdown = generate_markdown(session, include_thinking=include_thinking, verbose=verbose)

    return PlainTextResponse(
        content=markdown,
        media_type="text/markdown",
        headers={
            "Content-Disposition": f'attachment; filename="{session_id}.md"'
        }
    )


@router.get("/{session_id}/json")
async def export_json(
    session_id: str,
    include_thinking: bool = Query(False),
):
    """Export session as JSON."""
    session = session_indexer.get_session_by_id(
        session_id,
        include_thinking=include_thinking,
    )

    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    return JSONResponse(
        content=session.model_dump(mode="json"),
        headers={
            "Content-Disposition": f'attachment; filename="{session_id}.json"'
        }
    )

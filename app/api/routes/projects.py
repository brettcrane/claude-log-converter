"""Projects API routes."""

from fastapi import APIRouter

from app.services.session_indexer import session_indexer

router = APIRouter()


@router.get("")
async def list_projects():
    """List all Claude Code projects."""
    projects = session_indexer.get_projects()
    return {"data": projects, "total": len(projects)}

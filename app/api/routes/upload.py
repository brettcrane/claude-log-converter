"""Upload API routes."""

import uuid
from pathlib import Path

from fastapi import APIRouter, UploadFile, File, HTTPException
import aiofiles

from app.config import settings
from app.services.log_parser import get_session_detail

router = APIRouter()


@router.post("")
async def upload_jsonl(file: UploadFile = File(...)):
    """Upload a JSONL file for analysis."""
    if not file.filename or not file.filename.endswith(".jsonl"):
        raise HTTPException(
            status_code=400,
            detail="File must be a .jsonl file"
        )

    # Generate unique filename
    unique_id = str(uuid.uuid4())[:8]
    safe_filename = f"{unique_id}_{file.filename}"
    file_path = settings.upload_dir / safe_filename

    # Save the file
    try:
        async with aiofiles.open(file_path, "wb") as f:
            content = await file.read()
            await f.write(content)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to save file: {str(e)}"
        )

    # Parse and return session details
    try:
        session = get_session_detail(
            file_path,
            project_path="uploaded",
            project_name="Uploaded File",
            include_thinking=False,
        )
        return {
            "status": "ok",
            "session_id": session.session_id,
            "file_path": str(file_path),
            "session": session.model_dump(),
        }
    except Exception as e:
        # Clean up the file if parsing fails
        file_path.unlink(missing_ok=True)
        raise HTTPException(
            status_code=400,
            detail=f"Failed to parse JSONL file: {str(e)}"
        )

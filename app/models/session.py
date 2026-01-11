"""Session-related Pydantic models."""

from datetime import datetime
from typing import Optional
from pydantic import BaseModel, Field


class SessionSummary(BaseModel):
    """Lightweight session info for listing."""

    session_id: str
    project_path: str
    project_name: str
    file_path: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    git_branch: Optional[str] = None
    cwd: Optional[str] = None
    message_count: int = 0
    tool_count: int = 0
    files_modified_count: int = 0
    file_size_bytes: int = 0


class SessionDetail(BaseModel):
    """Full session data with all events."""

    session_id: str
    project_path: str
    project_name: str
    file_path: str
    cwd: Optional[str] = None
    git_branch: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    files_modified: list[str] = Field(default_factory=list)
    files_read: list[str] = Field(default_factory=list)
    tools_used: list[str] = Field(default_factory=list)
    phases: list[str] = Field(default_factory=list)
    decisions: list[str] = Field(default_factory=list)
    events: list["TimelineEvent"] = Field(default_factory=list)


class TimelineEvent(BaseModel):
    """Single event in the timeline."""

    id: str
    type: str  # "user", "assistant", "tool_use", "tool_result", "thinking"
    timestamp: Optional[datetime] = None
    content: Optional[str] = None
    tool_name: Optional[str] = None
    tool_input: Optional[dict] = None
    tool_id: Optional[str] = None
    files_affected: list[str] = Field(default_factory=list)


class FileChange(BaseModel):
    """File modification info for diff viewer."""

    file_path: str
    operation: str  # "read", "write", "edit"
    timestamp: Optional[datetime] = None
    old_content: Optional[str] = None
    new_content: Optional[str] = None
    diff_preview: Optional[str] = None


class PaginatedResponse(BaseModel):
    """Paginated API response wrapper."""

    data: list
    total: int
    offset: int
    limit: int
    has_more: bool


# Rebuild models to resolve forward references
SessionDetail.model_rebuild()

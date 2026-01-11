"""Session-related Pydantic models."""

from datetime import datetime

from pydantic import BaseModel, Field


class SessionSummary(BaseModel):
    """Lightweight session info for listing."""

    session_id: str
    project_path: str
    project_name: str
    file_path: str
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_seconds: int | None = None
    git_branch: str | None = None
    cwd: str | None = None
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
    cwd: str | None = None
    git_branch: str | None = None
    start_time: datetime | None = None
    end_time: datetime | None = None
    duration_seconds: int | None = None
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
    timestamp: datetime | None = None
    content: str | None = None
    tool_name: str | None = None
    tool_input: dict | None = None
    tool_id: str | None = None
    files_affected: list[str] = Field(default_factory=list)


class FileChange(BaseModel):
    """File modification info for diff viewer."""

    file_path: str
    operation: str  # "read", "write", "edit"
    timestamp: datetime | None = None
    old_content: str | None = None
    new_content: str | None = None
    diff_preview: str | None = None


class PaginatedResponse(BaseModel):
    """Paginated API response wrapper."""

    data: list
    total: int
    offset: int
    limit: int
    has_more: bool


# Rebuild models to resolve forward references
SessionDetail.model_rebuild()

export interface SessionSummary {
  session_id: string;
  project_path: string;
  project_name: string;
  file_path: string;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
  git_branch: string | null;
  cwd: string | null;
  message_count: number;
  tool_count: number;
  files_modified_count: number;
  file_size_bytes: number;
}

export interface TimelineEvent {
  id: string;
  type: 'user' | 'assistant' | 'tool_use' | 'tool_result' | 'thinking';
  timestamp: string | null;
  content: string | null;
  tool_name: string | null;
  tool_input: Record<string, unknown> | null;
  tool_id: string | null;
  files_affected: string[];
}

export interface SessionDetail {
  session_id: string;
  project_path: string;
  project_name: string;
  file_path: string;
  cwd: string | null;
  git_branch: string | null;
  start_time: string | null;
  end_time: string | null;
  duration_seconds: number | null;
  files_modified: string[];
  files_read: string[];
  tools_used: string[];
  phases: string[];
  decisions: string[];
  events: TimelineEvent[];
}

export interface Project {
  encoded_name: string;
  decoded_path: string;
  name: string;
  session_count: number;
  path: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  offset: number;
  limit: number;
  has_more: boolean;
}

export interface SessionFilters {
  project?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  offset?: number;
  limit?: number;
}

export interface Bookmark {
  id: number;
  session_id: string;
  event_id: string;
  event_index: number;
  project_name: string | null;
  git_branch: string | null;
  event_timestamp: string | null;
  event_type: string | null;
  category: string;
  note: string | null;
  created_at: string;
  updated_at: string;
}

export interface BookmarkCreate {
  session_id: string;
  event_id: string;
  event_index: number;
  project_name?: string | null;
  git_branch?: string | null;
  event_timestamp?: string | null;
  event_type?: string | null;
  category?: string;
  note?: string | null;
}

export interface BookmarkUpdate {
  category?: string;
  note?: string | null;
}

export interface BookmarkFilters {
  session_id?: string;
  project?: string;
  category?: string;
  search?: string;
  offset?: number;
  limit?: number;
  order_by?: 'created_at' | 'event_timestamp' | 'updated_at';
  order?: 'asc' | 'desc';
}

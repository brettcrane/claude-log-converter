import type {
  SessionSummary,
  SessionDetail,
  Project,
  PaginatedResponse,
  SessionFilters,
  TimelineEvent,
  Bookmark,
  BookmarkCreate,
  BookmarkUpdate,
  BookmarkFilters,
} from './types';

const API_BASE = '/api';

async function fetchJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  if (!response.ok) {
    throw new Error(`API error: ${response.status} ${response.statusText}`);
  }
  return response.json();
}

export async function getProjects(): Promise<{ data: Project[]; total: number }> {
  return fetchJson(`${API_BASE}/projects`);
}

export async function getSessions(
  filters: SessionFilters = {}
): Promise<PaginatedResponse<SessionSummary>> {
  const params = new URLSearchParams();
  if (filters.project) params.set('project', filters.project);
  if (filters.date_from) params.set('date_from', filters.date_from);
  if (filters.date_to) params.set('date_to', filters.date_to);
  if (filters.search) params.set('search', filters.search);
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.order_by) params.set('order_by', filters.order_by);
  if (filters.order) params.set('order', filters.order);

  const query = params.toString();
  return fetchJson(`${API_BASE}/sessions${query ? `?${query}` : ''}`);
}

export async function getSession(
  sessionId: string,
  includeThinking = false
): Promise<SessionDetail> {
  const params = new URLSearchParams();
  if (includeThinking) params.set('include_thinking', 'true');
  const query = params.toString();
  return fetchJson(`${API_BASE}/sessions/${sessionId}${query ? `?${query}` : ''}`);
}

export async function getSessionTimeline(
  sessionId: string,
  options: {
    includeThinking?: boolean;
    eventTypes?: string[];
    offset?: number;
    limit?: number;
  } = {}
): Promise<PaginatedResponse<TimelineEvent>> {
  const params = new URLSearchParams();
  if (options.includeThinking) params.set('include_thinking', 'true');
  if (options.eventTypes?.length) {
    options.eventTypes.forEach((t) => params.append('event_types', t));
  }
  if (options.offset !== undefined) params.set('offset', String(options.offset));
  if (options.limit !== undefined) params.set('limit', String(options.limit));

  const query = params.toString();
  return fetchJson(`${API_BASE}/sessions/${sessionId}/timeline${query ? `?${query}` : ''}`);
}

export async function uploadSession(file: File): Promise<{
  status: string;
  session_id: string;
  file_path: string;
  session: SessionDetail;
}> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: 'POST',
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

export function getExportUrl(
  sessionId: string,
  format: 'markdown' | 'json',
  options: { includeThinking?: boolean; verbose?: boolean } = {}
): string {
  const params = new URLSearchParams();
  if (options.includeThinking) params.set('include_thinking', 'true');
  if (options.verbose) params.set('verbose', 'true');
  const query = params.toString();
  return `${API_BASE}/export/${sessionId}/${format}${query ? `?${query}` : ''}`;
}

export async function clearSessionCache(): Promise<void> {
  await fetchJson(`${API_BASE}/sessions/cache/clear`, { method: 'POST' });
}

// Bookmark API functions
export async function getBookmarks(
  filters: BookmarkFilters = {}
): Promise<PaginatedResponse<Bookmark>> {
  const params = new URLSearchParams();
  if (filters.session_id) params.set('session_id', filters.session_id);
  if (filters.project) params.set('project', filters.project);
  if (filters.category) params.set('category', filters.category);
  if (filters.search) params.set('search', filters.search);
  if (filters.offset !== undefined) params.set('offset', String(filters.offset));
  if (filters.limit !== undefined) params.set('limit', String(filters.limit));
  if (filters.order_by) params.set('order_by', filters.order_by);
  if (filters.order) params.set('order', filters.order);

  const query = params.toString();
  return fetchJson(`${API_BASE}/bookmarks${query ? `?${query}` : ''}`);
}

export async function createBookmark(data: BookmarkCreate): Promise<Bookmark> {
  return fetchJson(`${API_BASE}/bookmarks`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function updateBookmark(
  id: number,
  data: BookmarkUpdate
): Promise<Bookmark> {
  return fetchJson(`${API_BASE}/bookmarks/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
}

export async function deleteBookmark(id: number): Promise<void> {
  await fetch(`${API_BASE}/bookmarks/${id}`, { method: 'DELETE' });
}

export async function getSessionBookmarks(sessionId: string): Promise<Bookmark[]> {
  return fetchJson(`${API_BASE}/bookmarks/session/${sessionId}`);
}

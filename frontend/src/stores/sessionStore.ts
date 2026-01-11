import { create } from 'zustand';
import type { SessionSummary, SessionDetail, Project, SessionFilters } from '@/services/types';
import { getSessions, getSession, getProjects, clearSessionCache } from '@/services/api';

interface SessionState {
  sessions: SessionSummary[];
  currentSession: SessionDetail | null;
  projects: Project[];
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  filters: SessionFilters;
  sidebarCollapsed: boolean;

  setFilters: (filters: Partial<SessionFilters>) => void;
  resetFilters: () => void;
  fetchSessions: () => Promise<void>;
  fetchMoreSessions: () => Promise<void>;
  refreshSessions: () => Promise<void>;
  fetchSession: (sessionId: string, includeThinking?: boolean) => Promise<void>;
  fetchProjects: () => Promise<void>;
  clearSession: () => void;
  toggleSidebar: () => void;
}

const DEFAULT_FILTERS: SessionFilters = {
  offset: 0,
  limit: 20,
};

export const useSessionStore = create<SessionState>((set, get) => ({
  sessions: [],
  currentSession: null,
  projects: [],
  total: 0,
  hasMore: false,
  loading: false,
  error: null,
  filters: DEFAULT_FILTERS,
  sidebarCollapsed: false,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters, offset: 0 },
    }));
  },

  resetFilters: () => {
    set({ filters: DEFAULT_FILTERS });
  },

  fetchSessions: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const response = await getSessions(filters);
      set({
        sessions: response.data,
        total: response.total,
        hasMore: response.has_more,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch sessions',
        loading: false,
      });
    }
  },

  fetchMoreSessions: async () => {
    const { filters, sessions, hasMore, loading } = get();
    if (!hasMore || loading) return;

    set({ loading: true });
    try {
      const newOffset = (filters.offset || 0) + (filters.limit || 20);
      const response = await getSessions({ ...filters, offset: newOffset });
      set({
        sessions: [...sessions, ...response.data],
        hasMore: response.has_more,
        filters: { ...filters, offset: newOffset },
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch more sessions',
        loading: false,
      });
    }
  },

  refreshSessions: async () => {
    set({ loading: true, error: null });
    try {
      await clearSessionCache();
      const { filters } = get();
      const response = await getSessions({ ...filters, offset: 0 });
      set({
        sessions: response.data,
        total: response.total,
        hasMore: response.has_more,
        filters: { ...filters, offset: 0 },
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to refresh sessions',
        loading: false,
      });
    }
  },

  fetchSession: async (sessionId, includeThinking = false) => {
    set({ loading: true, error: null });
    try {
      const session = await getSession(sessionId, includeThinking);
      set({ currentSession: session, loading: false });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch session',
        loading: false,
      });
    }
  },

  fetchProjects: async () => {
    try {
      const response = await getProjects();
      set({ projects: response.data });
    } catch (err) {
      console.error('Failed to fetch projects:', err);
    }
  },

  clearSession: () => {
    set({ currentSession: null });
  },

  toggleSidebar: () => {
    set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed }));
  },
}));

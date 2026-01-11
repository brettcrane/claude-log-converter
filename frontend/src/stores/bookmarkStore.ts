import { create } from 'zustand';
import type {
  Bookmark,
  BookmarkCreate,
  BookmarkUpdate,
  BookmarkFilters,
  TimelineEvent,
  SessionDetail,
} from '@/services/types';
import {
  getBookmarks,
  createBookmark,
  updateBookmark,
  deleteBookmark,
  getSessionBookmarks,
} from '@/services/api';

interface BookmarkState {
  bookmarks: Bookmark[];
  sessionBookmarks: Map<string, Set<string>>; // session_id -> Set<event_id>
  bookmarksByEventId: Map<string, Bookmark>; // event_id -> Bookmark
  total: number;
  hasMore: boolean;
  loading: boolean;
  error: string | null;
  filters: BookmarkFilters;

  // Actions
  setFilters: (filters: Partial<BookmarkFilters>) => void;
  fetchBookmarks: () => Promise<void>;
  fetchSessionBookmarks: (sessionId: string) => Promise<void>;
  createBookmarkForEvent: (event: TimelineEvent, session: SessionDetail, note?: string, category?: string) => Promise<void>;
  updateBookmarkById: (id: number, data: BookmarkUpdate) => Promise<void>;
  deleteBookmarkById: (id: number) => Promise<void>;
  toggleBookmark: (event: TimelineEvent, session: SessionDetail) => Promise<void>;
  isBookmarked: (sessionId: string, eventId: string) => boolean;
  getBookmarkForEvent: (eventId: string) => Bookmark | undefined;
  clearError: () => void;
}

const DEFAULT_FILTERS: BookmarkFilters = {
  offset: 0,
  limit: 50,
  order_by: 'created_at',
  order: 'desc',
};

export const useBookmarkStore = create<BookmarkState>((set, get) => ({
  bookmarks: [],
  sessionBookmarks: new Map(),
  bookmarksByEventId: new Map(),
  total: 0,
  hasMore: false,
  loading: false,
  error: null,
  filters: DEFAULT_FILTERS,

  setFilters: (newFilters) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters, offset: 0 },
    }));
    // Fetch with new filters
    get().fetchBookmarks();
  },

  fetchBookmarks: async () => {
    set({ loading: true, error: null });
    try {
      const { filters } = get();
      const response = await getBookmarks(filters);

      // Build lookup maps
      const sessionBookmarksMap = new Map<string, Set<string>>();
      const bookmarksByEventIdMap = new Map<string, Bookmark>();

      response.data.forEach((bookmark) => {
        const key = `${bookmark.session_id}:${bookmark.event_id}`;
        bookmarksByEventIdMap.set(key, bookmark);

        if (!sessionBookmarksMap.has(bookmark.session_id)) {
          sessionBookmarksMap.set(bookmark.session_id, new Set());
        }
        sessionBookmarksMap.get(bookmark.session_id)!.add(bookmark.event_id);
      });

      set({
        bookmarks: response.data,
        sessionBookmarks: sessionBookmarksMap,
        bookmarksByEventId: bookmarksByEventIdMap,
        total: response.total,
        hasMore: response.has_more,
        loading: false,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch bookmarks',
        loading: false,
      });
    }
  },

  fetchSessionBookmarks: async (sessionId: string) => {
    try {
      const bookmarks = await getSessionBookmarks(sessionId);

      // Update maps
      const sessionBookmarksMap = new Map(get().sessionBookmarks);
      const bookmarksByEventIdMap = new Map(get().bookmarksByEventId);

      const eventIds = new Set<string>();
      bookmarks.forEach((bookmark) => {
        eventIds.add(bookmark.event_id);
        const key = `${bookmark.session_id}:${bookmark.event_id}`;
        bookmarksByEventIdMap.set(key, bookmark);
      });

      sessionBookmarksMap.set(sessionId, eventIds);

      set({
        sessionBookmarks: sessionBookmarksMap,
        bookmarksByEventId: bookmarksByEventIdMap,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to fetch session bookmarks',
      });
    }
  },

  createBookmarkForEvent: async (event, session, note = '', category = 'general') => {
    try {
      // Find event index
      const eventIndex = session.events.findIndex((e) => e.id === event.id);

      const data: BookmarkCreate = {
        session_id: session.session_id,
        event_id: event.id,
        event_index: eventIndex,
        project_name: session.project_name,
        git_branch: session.git_branch,
        event_timestamp: event.timestamp,
        event_type: event.type,
        category,
        note,
      };

      const bookmark = await createBookmark(data);

      // Update maps
      const sessionBookmarksMap = new Map(get().sessionBookmarks);
      const bookmarksByEventIdMap = new Map(get().bookmarksByEventId);

      if (!sessionBookmarksMap.has(session.session_id)) {
        sessionBookmarksMap.set(session.session_id, new Set());
      }
      sessionBookmarksMap.get(session.session_id)!.add(event.id);

      const key = `${session.session_id}:${event.id}`;
      bookmarksByEventIdMap.set(key, bookmark);

      set({
        sessionBookmarks: sessionBookmarksMap,
        bookmarksByEventId: bookmarksByEventIdMap,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to create bookmark',
      });
      throw err;
    }
  },

  updateBookmarkById: async (id, data) => {
    try {
      const updatedBookmark = await updateBookmark(id, data);

      // Update in bookmarksByEventId map
      const bookmarksByEventIdMap = new Map(get().bookmarksByEventId);
      const key = `${updatedBookmark.session_id}:${updatedBookmark.event_id}`;
      bookmarksByEventIdMap.set(key, updatedBookmark);

      // Update in bookmarks list if present
      const bookmarks = get().bookmarks.map((b) =>
        b.id === id ? updatedBookmark : b
      );

      set({
        bookmarks,
        bookmarksByEventId: bookmarksByEventIdMap,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to update bookmark',
      });
      throw err;
    }
  },

  deleteBookmarkById: async (id) => {
    try {
      // Find bookmark to remove
      const bookmark = get().bookmarks.find((b) => b.id === id);
      if (!bookmark) {
        // Try to find in bookmarksByEventId
        const entry = Array.from(get().bookmarksByEventId.entries()).find(
          ([_, b]) => b.id === id
        );
        if (entry) {
          const [_, foundBookmark] = entry;
          await deleteBookmark(id);

          // Remove from maps
          const sessionBookmarksMap = new Map(get().sessionBookmarks);
          const bookmarksByEventIdMap = new Map(get().bookmarksByEventId);

          const sessionSet = sessionBookmarksMap.get(foundBookmark.session_id);
          if (sessionSet) {
            sessionSet.delete(foundBookmark.event_id);
          }

          const key = `${foundBookmark.session_id}:${foundBookmark.event_id}`;
          bookmarksByEventIdMap.delete(key);

          set({
            sessionBookmarks: sessionBookmarksMap,
            bookmarksByEventId: bookmarksByEventIdMap,
            error: null,
          });
        }
        return;
      }

      await deleteBookmark(id);

      // Remove from maps
      const sessionBookmarksMap = new Map(get().sessionBookmarks);
      const bookmarksByEventIdMap = new Map(get().bookmarksByEventId);

      const sessionSet = sessionBookmarksMap.get(bookmark.session_id);
      if (sessionSet) {
        sessionSet.delete(bookmark.event_id);
      }

      const key = `${bookmark.session_id}:${bookmark.event_id}`;
      bookmarksByEventIdMap.delete(key);

      // Remove from bookmarks list
      const bookmarks = get().bookmarks.filter((b) => b.id !== id);

      set({
        bookmarks,
        sessionBookmarks: sessionBookmarksMap,
        bookmarksByEventId: bookmarksByEventIdMap,
        total: get().total - 1,
        error: null,
      });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : 'Failed to delete bookmark',
      });
      throw err;
    }
  },

  toggleBookmark: async (event, session) => {
    const isBookmarked = get().isBookmarked(session.session_id, event.id);

    if (isBookmarked) {
      // Find and delete existing bookmark
      const key = `${session.session_id}:${event.id}`;
      const bookmark = get().bookmarksByEventId.get(key);
      if (bookmark) {
        await get().deleteBookmarkById(bookmark.id);
      }
    } else {
      // Create new bookmark
      await get().createBookmarkForEvent(event, session);
    }
  },

  isBookmarked: (sessionId, eventId) => {
    const sessionSet = get().sessionBookmarks.get(sessionId);
    return sessionSet ? sessionSet.has(eventId) : false;
  },

  getBookmarkForEvent: (eventId) => {
    // Need to search through all bookmarks since we don't have sessionId
    for (const bookmark of get().bookmarksByEventId.values()) {
      if (bookmark.event_id === eventId) {
        return bookmark;
      }
    }
    return undefined;
  },

  clearError: () => {
    set({ error: null });
  },
}));

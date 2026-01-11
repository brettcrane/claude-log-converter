import { useEffect, useState } from 'react';
import { Loader2, Search, X, ChevronDown } from 'lucide-react';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { BookmarkList } from '@/components/bookmarks/BookmarkList';
import { BookmarkDialog } from '@/components/bookmarks/BookmarkDialog';
import type { Bookmark, SessionDetail, TimelineEvent } from '@/services/types';
import { useSessionStore } from '@/stores/sessionStore';

const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Bookmarked (newest)', order_by: 'created_at', order: 'desc' },
  { value: 'created_at-asc', label: 'Bookmarked (oldest)', order_by: 'created_at', order: 'asc' },
  { value: 'event_timestamp-desc', label: 'Event time (newest)', order_by: 'event_timestamp', order: 'desc' },
  { value: 'event_timestamp-asc', label: 'Event time (oldest)', order_by: 'event_timestamp', order: 'asc' },
] as const;

const CATEGORIES = [
  { value: 'all', label: 'All Categories' },
  { value: 'general', label: 'General' },
  { value: 'important', label: 'Important' },
  { value: 'reference', label: 'Reference' },
  { value: 'bug', label: 'Bug/Issue' },
  { value: 'question', label: 'Question' },
];

export function BookmarksPage() {
  const bookmarkStore = useBookmarkStore();
  const sessionStore = useSessionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('created_at-desc');
  const [sortDropdownOpen, setSortDropdownOpen] = useState(false);

  // For editing bookmarks
  const [editingBookmark, setEditingBookmark] = useState<{
    bookmark: Bookmark;
    event: TimelineEvent;
    session: SessionDetail;
  } | null>(null);

  // Load bookmarks on mount
  useEffect(() => {
    const sortOption = SORT_OPTIONS.find(o => o.value === selectedSort)!;
    bookmarkStore.setFilters({
      category: selectedCategory === 'all' ? undefined : selectedCategory,
      search: searchQuery || undefined,
      order_by: sortOption.order_by as any,
      order: sortOption.order as any,
    });
  }, [selectedCategory, searchQuery, selectedSort]);

  const handleEdit = async (bookmark: Bookmark) => {
    // Use cached session if already loaded, otherwise fetch it
    let session = sessionStore.currentSession?.session_id === bookmark.session_id
      ? sessionStore.currentSession
      : null;

    if (!session) {
      // Fetch session and use the returned value directly (avoids React state timing issues)
      session = await sessionStore.fetchSession(bookmark.session_id);
      if (!session) {
        alert('Failed to load session');
        return;
      }
    }

    const event = session.events.find(e => e.id === bookmark.event_id);
    if (!event) {
      alert('Event not found in session');
      return;
    }
    setEditingBookmark({ bookmark, event, session });
  };

  const handleDelete = async (bookmark: Bookmark) => {
    if (confirm('Delete this bookmark?')) {
      await bookmarkStore.deleteBookmarkById(bookmark.id);
    }
  };

  const handleSortChange = (value: string) => {
    setSelectedSort(value);
    setSortDropdownOpen(false);
  };

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Bookmarks
        </h1>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search notes..."
              className="w-full pl-10 pr-8 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-2 top-1/2 -translate-y-1/2"
              >
                <X className="w-4 h-4 text-gray-400 hover:text-gray-600" />
              </button>
            )}
          </div>

          {/* Category Filter */}
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.value} value={cat.value}>
                {cat.label}
              </option>
            ))}
          </select>

          {/* Sort Dropdown */}
          <div className="relative">
            <button
              onClick={() => setSortDropdownOpen(!sortDropdownOpen)}
              className="flex items-center gap-2 px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white text-sm hover:bg-gray-50 dark:hover:bg-gray-600"
            >
              Sort: {SORT_OPTIONS.find(o => o.value === selectedSort)?.label}
              <ChevronDown className="w-4 h-4" />
            </button>
            {sortDropdownOpen && (
              <div className="absolute top-full mt-1 right-0 bg-white dark:bg-gray-700 border dark:border-gray-600 rounded-md shadow-lg z-10 min-w-[200px]">
                {SORT_OPTIONS.map((option) => (
                  <button
                    key={option.value}
                    onClick={() => handleSortChange(option.value)}
                    className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 ${
                      selectedSort === option.value ? 'bg-gray-50 dark:bg-gray-600' : ''
                    }`}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Count */}
        <div className="mt-3 text-sm text-gray-600 dark:text-gray-400">
          {bookmarkStore.loading ? (
            <div className="flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Loading bookmarks...
            </div>
          ) : (
            <div>
              {bookmarkStore.total} {bookmarkStore.total === 1 ? 'bookmark' : 'bookmarks'}
            </div>
          )}
        </div>
      </div>

      {/* Bookmarks List */}
      <div className="flex-1 overflow-hidden">
        {bookmarkStore.error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-red-600 dark:text-red-400">
              Error: {bookmarkStore.error}
            </div>
          </div>
        ) : (
          <BookmarkList
            bookmarks={bookmarkStore.bookmarks}
            onEdit={handleEdit}
            onDelete={handleDelete}
          />
        )}
      </div>

      {/* Edit Dialog */}
      {editingBookmark && (
        <BookmarkDialog
          event={editingBookmark.event}
          session={editingBookmark.session}
          bookmark={editingBookmark.bookmark}
          onClose={() => {
            setEditingBookmark(null);
            // Refresh bookmarks
            bookmarkStore.fetchBookmarks();
          }}
        />
      )}
    </div>
  );
}

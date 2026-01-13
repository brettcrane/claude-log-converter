import { useEffect, useState, Fragment } from 'react';
import { Listbox, Transition } from '@headlessui/react';
import { Loader2, Search, X, ChevronDown, Check, SlidersHorizontal, Bookmark, Tag } from 'lucide-react';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { BookmarkList } from '@/components/bookmarks/BookmarkList';
import { BookmarkDialog } from '@/components/bookmarks/BookmarkDialog';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';
import type { Bookmark as BookmarkType, SessionDetail, TimelineEvent } from '@/services/types';
import { useSessionStore } from '@/stores/sessionStore';

const SORT_OPTIONS = [
  { value: 'created_at-desc', label: 'Newest first', order_by: 'created_at', order: 'desc' },
  { value: 'created_at-asc', label: 'Oldest first', order_by: 'created_at', order: 'asc' },
  { value: 'event_timestamp-desc', label: 'Event (newest)', order_by: 'event_timestamp', order: 'desc' },
  { value: 'event_timestamp-asc', label: 'Event (oldest)', order_by: 'event_timestamp', order: 'asc' },
] as const;

const CATEGORIES = [
  { value: 'all', label: 'All Categories', color: null },
  { value: 'general', label: 'General', color: 'bg-gray-500' },
  { value: 'important', label: 'Important', color: 'bg-orange-500' },
  { value: 'reference', label: 'Reference', color: 'bg-green-500' },
  { value: 'bug', label: 'Bug', color: 'bg-red-500' },
  { value: 'question', label: 'Question', color: 'bg-blue-500' },
];

export function BookmarksPage() {
  const bookmarkStore = useBookmarkStore();
  const sessionStore = useSessionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedSort, setSelectedSort] = useState('created_at-desc');

  // For editing bookmarks
  const [editingBookmark, setEditingBookmark] = useState<{
    bookmark: BookmarkType;
    event: TimelineEvent;
    session: SessionDetail;
  } | null>(null);

  // For delete confirmation
  const [deletingBookmark, setDeletingBookmark] = useState<BookmarkType | null>(null);
  const [deleting, setDeleting] = useState(false);

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

  const handleEdit = async (bookmark: BookmarkType) => {
    let session = sessionStore.currentSession?.session_id === bookmark.session_id
      ? sessionStore.currentSession
      : null;

    if (!session) {
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

  const handleDelete = (bookmark: BookmarkType) => {
    setDeletingBookmark(bookmark);
  };

  const confirmDelete = async () => {
    if (!deletingBookmark) return;
    setDeleting(true);
    try {
      await bookmarkStore.deleteBookmarkById(deletingBookmark.id);
      setDeletingBookmark(null);
    } finally {
      setDeleting(false);
    }
  };

  const currentSort = SORT_OPTIONS.find(o => o.value === selectedSort);
  const currentCategory = CATEGORIES.find(c => c.value === selectedCategory);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        {/* Title and filters */}
        <div className="px-6 pt-4 pb-4">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 shadow-sm">
                <Bookmark className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Bookmarks
              </h1>
              {!bookmarkStore.loading && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {bookmarkStore.total} {bookmarkStore.total === 1 ? 'moment' : 'moments'}
                </span>
              )}
              {bookmarkStore.loading && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </span>
              )}
            </div>
          </div>

          {/* Filters row */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative flex-1 min-w-[200px] max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search notes..."
                className="w-full pl-10 pr-8 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-colors"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                >
                  <X className="w-3.5 h-3.5 text-gray-400" />
                </button>
              )}
            </div>

            {/* Divider */}
            <div className="hidden sm:block h-6 w-px bg-gray-200 dark:bg-gray-700" />

            {/* Category dropdown */}
            <Listbox value={selectedCategory} onChange={setSelectedCategory}>
              <div className="relative">
                <Listbox.Button className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors">
                  <Tag className="w-4 h-4 text-gray-400" />
                  {currentCategory?.color && (
                    <span className={`w-2 h-2 rounded-full ${currentCategory.color}`} />
                  )}
                  <span>{currentCategory?.label}</span>
                  <ChevronDown className="w-4 h-4 text-gray-400" />
                </Listbox.Button>
                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="opacity-0 scale-95"
                  enterTo="opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="opacity-100 scale-100"
                  leaveTo="opacity-0 scale-95"
                >
                  <Listbox.Options className="absolute left-0 mt-2 w-48 origin-top-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl shadow-gray-900/10 dark:shadow-black/30 z-50 overflow-hidden focus:outline-none">
                    {CATEGORIES.map((cat) => (
                      <Listbox.Option
                        key={cat.value}
                        value={cat.value}
                        className={({ active }) =>
                          `flex items-center gap-2 px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                            active ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                          }`
                        }
                      >
                        {({ selected }) => (
                          <>
                            {cat.color ? (
                              <span className={`w-2.5 h-2.5 rounded-full ${cat.color}`} />
                            ) : (
                              <span className="w-2.5" />
                            )}
                            <span className={`flex-1 ${selected ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300'}`}>
                              {cat.label}
                            </span>
                            {selected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                          </>
                        )}
                      </Listbox.Option>
                    ))}
                  </Listbox.Options>
                </Transition>
              </div>
            </Listbox>

            {/* Sort dropdown */}
            <div className="ml-auto">
              <Listbox value={selectedSort} onChange={setSelectedSort}>
                <div className="relative">
                  <Listbox.Button className="inline-flex items-center gap-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 transition-colors">
                    <SlidersHorizontal className="w-4 h-4 text-gray-400" />
                    <span>{currentSort?.label}</span>
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  </Listbox.Button>
                  <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="opacity-0 scale-95"
                    enterTo="opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="opacity-100 scale-100"
                    leaveTo="opacity-0 scale-95"
                  >
                    <Listbox.Options className="absolute right-0 mt-2 w-48 origin-top-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-xl shadow-gray-900/10 dark:shadow-black/30 z-50 overflow-hidden focus:outline-none">
                      {SORT_OPTIONS.map((option) => (
                        <Listbox.Option
                          key={option.value}
                          value={option.value}
                          className={({ active }) =>
                            `flex items-center justify-between px-4 py-2.5 text-sm cursor-pointer transition-colors ${
                              active ? 'bg-gray-50 dark:bg-gray-700/50' : ''
                            }`
                          }
                        >
                          {({ selected }) => (
                            <>
                              <span className={selected ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300'}>
                                {option.label}
                              </span>
                              {selected && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                            </>
                          )}
                        </Listbox.Option>
                      ))}
                    </Listbox.Options>
                  </Transition>
                </div>
              </Listbox>
            </div>
          </div>
        </div>
      </div>

      {/* Bookmarks Grid */}
      <div className="flex-1 overflow-hidden">
        {bookmarkStore.error ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="text-red-500 dark:text-red-400 mb-2">
                Failed to load bookmarks
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                {bookmarkStore.error}
              </p>
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
            bookmarkStore.fetchBookmarks();
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      <ConfirmDialog
        isOpen={!!deletingBookmark}
        onClose={() => setDeletingBookmark(null)}
        onConfirm={confirmDelete}
        title="Delete Bookmark"
        message="Are you sure you want to delete this bookmark? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        loading={deleting}
      />
    </div>
  );
}

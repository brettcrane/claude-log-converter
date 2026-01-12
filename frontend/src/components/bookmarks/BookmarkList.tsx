import { Bookmark as BookmarkIcon, Search } from 'lucide-react';
import type { Bookmark } from '@/services/types';
import { BookmarkCard } from './BookmarkCard';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
}

export function BookmarkList({ bookmarks, onEdit, onDelete }: BookmarkListProps) {
  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="relative">
          {/* Decorative background */}
          <div className="absolute inset-0 -m-8">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-gradient-to-br from-indigo-500/10 to-purple-500/10 rounded-full blur-2xl" />
          </div>

          {/* Icon */}
          <div className="relative flex items-center justify-center w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-gray-100 to-gray-50 dark:from-gray-800 dark:to-gray-800/50 border border-gray-200 dark:border-gray-700 shadow-sm">
            <BookmarkIcon className="w-8 h-8 text-gray-400 dark:text-gray-500" />
          </div>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
          No bookmarks yet
        </h3>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center max-w-sm mb-6">
          Bookmark important moments in your Claude Code sessions to quickly find them later
        </p>

        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs text-gray-600 dark:text-gray-400">
          <Search className="w-3.5 h-3.5" />
          <span>View a session and click the bookmark icon on any event</span>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="p-6 pt-8">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {bookmarks.map((bookmark) => (
            <BookmarkCard
              key={`${bookmark.id}-${bookmark.updated_at}`}
              bookmark={bookmark}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

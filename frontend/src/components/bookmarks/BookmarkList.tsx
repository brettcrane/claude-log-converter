import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Bookmark } from '@/services/types';
import { BookmarkCard } from './BookmarkCard';

interface BookmarkListProps {
  bookmarks: Bookmark[];
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
}

export function BookmarkList({ bookmarks, onEdit, onDelete }: BookmarkListProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: bookmarks.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 200, // Estimate card height
    overscan: 5,
  });

  if (bookmarks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-20">
        <div className="text-gray-400 dark:text-gray-500 text-center">
          <div className="text-6xl mb-4">📑</div>
          <p className="text-lg font-medium mb-2">No bookmarks yet</p>
          <p className="text-sm">
            Start bookmarking important moments in your Claude Code sessions
          </p>
        </div>
      </div>
    );
  }

  return (
    <div ref={parentRef} className="h-full overflow-y-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const bookmark = bookmarks[virtualItem.index];
          // Use bookmark id + updated_at as key to force re-render when data changes
          const itemKey = `${bookmark.id}-${bookmark.updated_at}`;
          return (
            <div
              key={itemKey}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${virtualItem.start}px)`,
              }}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
            >
              <div className="px-4 py-2">
                <BookmarkCard
                  bookmark={bookmark}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

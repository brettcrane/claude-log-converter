import { useState } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';
import type { TimelineEvent, SessionDetail } from '@/services/types';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { BookmarkDialog } from './BookmarkDialog';

interface BookmarkButtonProps {
  event: TimelineEvent;
  session: SessionDetail;
}

export function BookmarkButton({ event, session }: BookmarkButtonProps) {
  const [dialogOpen, setDialogOpen] = useState(false);
  const isBookmarked = useBookmarkStore((state) =>
    state.isBookmarked(session.session_id, event.id)
  );

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setDialogOpen(true);
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        title={isBookmarked ? 'Edit bookmark' : 'Add bookmark'}
      >
        {isBookmarked ? (
          <BookmarkCheck className="w-4 h-4 text-yellow-500 fill-yellow-500" />
        ) : (
          <Bookmark className="w-4 h-4 text-gray-400 hover:text-yellow-500" />
        )}
      </button>

      {dialogOpen && (
        <BookmarkDialog
          event={event}
          session={session}
          onClose={() => setDialogOpen(false)}
        />
      )}
    </>
  );
}

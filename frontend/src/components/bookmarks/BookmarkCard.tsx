import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Edit2, Trash2, GitBranch } from 'lucide-react';
import type { Bookmark } from '@/services/types';
import { BookmarkBadge } from './BookmarkBadge';
import { formatTime } from '@/utils/formatters';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
}

export function BookmarkCard({ bookmark, onEdit, onDelete }: BookmarkCardProps) {
  const navigate = useNavigate();
  const [showFullNote, setShowFullNote] = useState(false);

  const handleJumpToEvent = () => {
    navigate(`/session/${bookmark.session_id}#event-${bookmark.event_id}`);
  };

  const truncatedNote = bookmark.note && bookmark.note.length > 150
    ? bookmark.note.slice(0, 150) + '...'
    : bookmark.note;

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:shadow-md transition-shadow">
      {/* Header */}
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <BookmarkBadge bookmark={bookmark} />
            <span className="text-xs text-gray-500 dark:text-gray-400">
              {bookmark.event_timestamp ? formatTime(bookmark.event_timestamp) : 'No timestamp'}
            </span>
          </div>
          <div className="text-sm font-medium text-gray-900 dark:text-white">
            {bookmark.project_name || 'Unknown Project'}
          </div>
          {bookmark.git_branch && (
            <div className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 mt-1">
              <GitBranch className="w-3 h-3" />
              {bookmark.git_branch}
            </div>
          )}
        </div>
        <div className="flex gap-1">
          <button
            onClick={() => onEdit(bookmark)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Edit bookmark"
          >
            <Edit2 className="w-4 h-4 text-gray-500" />
          </button>
          <button
            onClick={() => onDelete(bookmark)}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
            title="Delete bookmark"
          >
            <Trash2 className="w-4 h-4 text-gray-500" />
          </button>
        </div>
      </div>

      {/* Note */}
      {bookmark.note && (
        <div className="mb-3">
          <p className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
            {showFullNote || !truncatedNote ? bookmark.note : truncatedNote}
          </p>
          {bookmark.note.length > 150 && (
            <button
              onClick={() => setShowFullNote(!showFullNote)}
              className="text-xs text-blue-600 dark:text-blue-400 hover:underline mt-1"
            >
              {showFullNote ? 'Show less' : 'Show more'}
            </button>
          )}
        </div>
      )}

      {/* Event Type */}
      <div className="text-xs text-gray-500 dark:text-gray-400 mb-3">
        Event: <span className="font-mono">{bookmark.event_type}</span>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between">
        <div className="text-xs text-gray-500 dark:text-gray-400">
          Bookmarked {formatTime(bookmark.created_at)}
        </div>
        <button
          onClick={handleJumpToEvent}
          className="flex items-center gap-1 px-3 py-1.5 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
        >
          Jump to event
          <ArrowRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

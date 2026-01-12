import { useNavigate } from 'react-router-dom';
import { ArrowUpRight, Edit2, Trash2, GitBranch, Clock, Hash } from 'lucide-react';
import type { Bookmark } from '@/services/types';
import { BookmarkBadge } from './BookmarkBadge';
import { formatRelativeTime } from '@/utils/formatters';

interface BookmarkCardProps {
  bookmark: Bookmark;
  onEdit: (bookmark: Bookmark) => void;
  onDelete: (bookmark: Bookmark) => void;
}

// Truncate note to consistent length for uniform card heights
const MAX_NOTE_LENGTH = 80;

function truncateNote(note: string | null | undefined): string | null {
  if (!note) return null;
  if (note.length <= MAX_NOTE_LENGTH) return note;
  return note.slice(0, MAX_NOTE_LENGTH).trim() + '…';
}

// Event type styling
const EVENT_TYPE_STYLES: Record<string, { bg: string; text: string; border: string }> = {
  user: { bg: 'bg-blue-500/10', text: 'text-blue-600 dark:text-blue-400', border: 'border-l-blue-500' },
  assistant: { bg: 'bg-purple-500/10', text: 'text-purple-600 dark:text-purple-400', border: 'border-l-purple-500' },
  tool_use: { bg: 'bg-amber-500/10', text: 'text-amber-600 dark:text-amber-400', border: 'border-l-amber-500' },
  tool_result: { bg: 'bg-emerald-500/10', text: 'text-emerald-600 dark:text-emerald-400', border: 'border-l-emerald-500' },
  thinking: { bg: 'bg-gray-500/10', text: 'text-gray-600 dark:text-gray-400', border: 'border-l-gray-500' },
};

export function BookmarkCard({ bookmark, onEdit, onDelete }: BookmarkCardProps) {
  const navigate = useNavigate();
  const truncatedNote = truncateNote(bookmark.note);
  const eventType = bookmark.event_type || 'user';
  const eventStyle = EVENT_TYPE_STYLES[eventType] || EVENT_TYPE_STYLES.user;

  const handleJumpToEvent = () => {
    navigate(`/session/${bookmark.session_id}#event-${bookmark.event_id}`);
  };

  return (
    <div
      className={`group relative h-[156px] bg-white dark:bg-gray-800/80 rounded-lg border border-gray-200 dark:border-gray-700/50 border-l-[3px] ${eventStyle.border} overflow-hidden transition-all duration-200 hover:border-gray-300 dark:hover:border-gray-600 hover:shadow-lg hover:shadow-gray-900/5 dark:hover:shadow-black/20`}
    >
      {/* Action buttons - appear on hover */}
      <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity z-10">
        <button
          onClick={() => onEdit(bookmark)}
          className="p-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600 shadow-sm transition-colors"
          title="Edit bookmark"
        >
          <Edit2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400" />
        </button>
        <button
          onClick={() => onDelete(bookmark)}
          className="p-1.5 rounded-md bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 hover:bg-red-50 dark:hover:bg-red-900/20 shadow-sm transition-colors"
          title="Delete bookmark"
        >
          <Trash2 className="w-3.5 h-3.5 text-gray-500 dark:text-gray-400 hover:text-red-500" />
        </button>
      </div>

      {/* Card content */}
      <div className="p-3 h-full flex flex-col">
        {/* Header row */}
        <div className="flex items-start justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <BookmarkBadge bookmark={bookmark} />
            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide ${eventStyle.bg} ${eventStyle.text}`}>
              {eventType.replace('_', ' ')}
            </span>
          </div>
        </div>

        {/* Project + metadata */}
        <div className="mb-2">
          <div className="font-medium text-sm text-gray-900 dark:text-white truncate" title={bookmark.project_name || 'Unknown Project'}>
            {bookmark.project_name || 'Unknown Project'}
          </div>
          <div className="flex items-center gap-3 mt-1 text-[11px] text-gray-500 dark:text-gray-400">
            {bookmark.git_branch && (
              <span className="inline-flex items-center gap-1 truncate max-w-[120px]" title={bookmark.git_branch}>
                <GitBranch className="w-3 h-3 flex-shrink-0" />
                <span className="truncate">{bookmark.git_branch}</span>
              </span>
            )}
            {bookmark.event_timestamp && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3 h-3 flex-shrink-0" />
                {formatRelativeTime(bookmark.event_timestamp)}
              </span>
            )}
          </div>
        </div>

        {/* Note - fixed height area */}
        <div className="flex-1 min-h-0 mb-2">
          {truncatedNote ? (
            <p
              className="text-xs text-gray-600 dark:text-gray-300 leading-relaxed line-clamp-2"
              title={bookmark.note || undefined}
            >
              {truncatedNote}
            </p>
          ) : (
            <p className="text-xs text-gray-400 dark:text-gray-500 italic">No note</p>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t border-gray-100 dark:border-gray-700/50">
          <div className="flex items-center gap-1 text-[10px] text-gray-400 dark:text-gray-500 font-mono">
            <Hash className="w-3 h-3" />
            <span className="truncate max-w-[100px]" title={bookmark.session_id}>
              {bookmark.session_id.slice(0, 8)}
            </span>
          </div>
          <button
            onClick={handleJumpToEvent}
            className="inline-flex items-center gap-1 px-2 py-1 text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded transition-colors"
          >
            View
            <ArrowUpRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
}

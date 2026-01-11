import { useState } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';
import type { TimelineEvent, SessionDetail, Bookmark } from '@/services/types';
import { useBookmarkStore } from '@/stores/bookmarkStore';

interface BookmarkDialogProps {
  event: TimelineEvent;
  session: SessionDetail;
  onClose: () => void;
  /** Pass existing bookmark directly to avoid store lookup issues with unstable event IDs */
  bookmark?: Bookmark;
}

const CATEGORIES = [
  { value: 'general', label: 'General', color: 'bg-gray-500' },
  { value: 'important', label: 'Important - Come back to this', color: 'bg-orange-500' },
  { value: 'reference', label: 'Reference - Good example', color: 'bg-green-500' },
  { value: 'bug', label: 'Bug/Issue', color: 'bg-red-500' },
  { value: 'question', label: 'Question', color: 'bg-blue-500' },
];

export function BookmarkDialog({ event, session, onClose, bookmark }: BookmarkDialogProps) {
  const bookmarkStore = useBookmarkStore();
  // Use passed bookmark if provided, otherwise look up from store
  // (store lookup can fail when event IDs differ due to includeThinking setting)
  const existingBookmark = bookmark ?? bookmarkStore.bookmarksByEventId.get(
    `${session.session_id}:${event.id}`
  );

  const [category, setCategory] = useState(existingBookmark?.category || 'general');
  const [note, setNote] = useState(existingBookmark?.note || '');
  const [saving, setSaving] = useState(false);

  // Get context snippet (first 300 chars of content)
  const contextSnippet = event.content
    ? event.content.slice(0, 300) + (event.content.length > 300 ? '...' : '')
    : event.tool_name
    ? `Tool: ${event.tool_name}`
    : 'No content';

  const handleSave = async () => {
    setSaving(true);
    try {
      if (existingBookmark) {
        await bookmarkStore.updateBookmarkById(existingBookmark.id, { category, note });
      } else {
        await bookmarkStore.createBookmarkForEvent(event, session, note, category);
      }
      onClose();
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (existingBookmark && confirm('Delete this bookmark?')) {
      setSaving(true);
      try {
        await bookmarkStore.deleteBookmarkById(existingBookmark.id);
        onClose();
      } catch (error) {
        console.error('Failed to delete bookmark:', error);
      } finally {
        setSaving(false);
      }
    }
  };

  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  // Use portal to render at document body level, escaping any parent stacking contexts
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
      onClick={handleBackdropClick}
    >
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {existingBookmark ? 'Edit Bookmark' : 'Add Bookmark'}
          </h2>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 space-y-4">
          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Category
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Note */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={500}
              rows={4}
              placeholder="Add a note about why this is important..."
              className="w-full px-3 py-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 dark:text-white resize-none"
            />
            <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              {note.length}/500 characters
            </div>
          </div>

          {/* Context Preview */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Event Context
            </label>
            <div className="p-3 bg-gray-50 dark:bg-gray-900 rounded-md text-sm text-gray-700 dark:text-gray-300 max-h-32 overflow-y-auto">
              <div className="font-medium text-xs text-gray-500 dark:text-gray-400 mb-1">
                {event.type} • {event.timestamp || 'No timestamp'}
              </div>
              {contextSnippet}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 border-t dark:border-gray-700">
          <div>
            {existingBookmark && (
              <button
                onClick={handleDelete}
                disabled={saving}
                className="px-4 py-2 text-sm font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 disabled:opacity-50"
              >
                Delete
              </button>
            )}
          </div>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-md disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save'}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

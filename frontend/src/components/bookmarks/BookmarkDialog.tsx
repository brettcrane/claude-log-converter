import { useState, Fragment } from 'react';
import { Dialog, Transition, Listbox } from '@headlessui/react';
import { X, Check, ChevronDown } from 'lucide-react';
import type { TimelineEvent, SessionDetail, Bookmark } from '@/services/types';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { ConfirmDialog } from '@/components/ui/ConfirmDialog';

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

  const [isOpen, setIsOpen] = useState(true);
  const [category, setCategory] = useState(existingBookmark?.category || 'general');
  const [note, setNote] = useState(existingBookmark?.note || '');
  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const handleClose = () => {
    setIsOpen(false);
    onClose();
  };

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
      handleClose();
    } catch (error) {
      console.error('Failed to save bookmark:', error);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = () => {
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!existingBookmark) return;
    setSaving(true);
    try {
      await bookmarkStore.deleteBookmarkById(existingBookmark.id);
      setShowDeleteConfirm(false);
      handleClose();
    } catch (error) {
      console.error('Failed to delete bookmark:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={handleClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-50" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-2xl transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 shadow-xl transition-all">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b dark:border-gray-700">
                  <Dialog.Title className="text-lg font-semibold text-gray-900 dark:text-white">
                    {existingBookmark ? 'Edit Bookmark' : 'Add Bookmark'}
                  </Dialog.Title>
                  <button
                    onClick={handleClose}
                    className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>

                {/* Content */}
                <div className="p-4 space-y-4 max-h-[60vh] overflow-y-auto">
                  {/* Category */}
                  <div>
                    <Listbox value={category} onChange={setCategory}>
                      {({ open }) => (
                        <>
                          <Listbox.Label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                            Category
                          </Listbox.Label>
                          <div className="relative">
                            <Listbox.Button className="relative w-full cursor-pointer rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 py-2 pl-3 pr-10 text-left focus:outline-none focus:ring-2 focus:ring-blue-500">
                              <span className="flex items-center gap-2">
                                <span className={`w-2 h-2 rounded-full ${CATEGORIES.find(c => c.value === category)?.color}`} />
                                <span className="block truncate text-gray-900 dark:text-white">
                                  {CATEGORIES.find(c => c.value === category)?.label}
                                </span>
                              </span>
                              <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronDown className="h-4 w-4 text-gray-400" aria-hidden="true" />
                              </span>
                            </Listbox.Button>

                            <Transition
                              show={open}
                              as={Fragment}
                              leave="transition ease-in duration-100"
                              leaveFrom="opacity-100"
                              leaveTo="opacity-0"
                            >
                              <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white dark:bg-gray-700 py-1 shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                                {CATEGORIES.map((cat) => (
                                  <Listbox.Option
                                    key={cat.value}
                                    value={cat.value}
                                    className={({ active }) =>
                                      `relative cursor-pointer select-none py-2 pl-10 pr-4 ${
                                        active ? 'bg-blue-100 dark:bg-blue-900' : ''
                                      }`
                                    }
                                  >
                                    {({ selected }) => (
                                      <>
                                        <span className="flex items-center gap-2">
                                          <span className={`w-2 h-2 rounded-full ${cat.color}`} />
                                          <span className={`block truncate ${selected ? 'font-medium' : 'font-normal'} text-gray-900 dark:text-white`}>
                                            {cat.label}
                                          </span>
                                        </span>
                                        {selected && (
                                          <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600 dark:text-blue-400">
                                            <Check className="h-4 w-4" aria-hidden="true" />
                                          </span>
                                        )}
                                      </>
                                    )}
                                  </Listbox.Option>
                                ))}
                              </Listbox.Options>
                            </Transition>
                          </div>
                        </>
                      )}
                    </Listbox>
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
                      onClick={handleClose}
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
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>

    <ConfirmDialog
      isOpen={showDeleteConfirm}
      onClose={() => setShowDeleteConfirm(false)}
      onConfirm={confirmDelete}
      title="Delete Bookmark"
      message="Are you sure you want to delete this bookmark? This action cannot be undone."
      confirmLabel="Delete"
      variant="danger"
      loading={saving}
    />
    </>
  );
}

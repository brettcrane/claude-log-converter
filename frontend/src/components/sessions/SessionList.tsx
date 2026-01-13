import { useEffect, useState, Fragment } from 'react';
import { Link } from 'react-router-dom';
import { Listbox, Transition } from '@headlessui/react';
import {
  Loader2,
  RefreshCw,
  X,
  FolderOpen,
  History,
  Search,
  ChevronDown,
  Check,
  SlidersHorizontal,
  Clock,
  MessageSquare,
  Wrench,
  GitBranch,
  Calendar,
} from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { ProjectDropdown } from '@/components/navigation/ProjectDropdown';
import { formatDateTime, formatDuration, formatRelativeTime } from '@/utils/formatters';
import type { SessionSummary } from '@/services/types';

const SORT_OPTIONS = [
  { value: 'date-desc', label: 'Newest first', order_by: 'start_time', order: 'desc' },
  { value: 'date-asc', label: 'Oldest first', order_by: 'start_time', order: 'asc' },
  { value: 'duration-desc', label: 'Longest duration', order_by: 'duration_seconds', order: 'desc' },
  { value: 'duration-asc', label: 'Shortest duration', order_by: 'duration_seconds', order: 'asc' },
  { value: 'messages-desc', label: 'Most messages', order_by: 'message_count', order: 'desc' },
  { value: 'messages-asc', label: 'Fewest messages', order_by: 'message_count', order: 'asc' },
] as const;

export function SessionList() {
  const { sessions, loading, error, total, hasMore, filters, projects, setFilters, fetchSessions, fetchMoreSessions, refreshSessions } =
    useSessionStore();
  const [searchQuery, setSearchQuery] = useState(filters.search || '');
  const [selectedSort, setSelectedSort] = useState('date-desc');

  // Fetch sessions when filters change (including sort)
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, filters.project, filters.search, filters.date_from, filters.date_to, filters.order_by, filters.order]);

  // Sync search query with filters (debounced)
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      if (searchQuery !== (filters.search || '')) {
        setFilters({ search: searchQuery || undefined });
      }
    }, 300);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, filters.search, setFilters]);

  // Handle sort change - update filters which triggers refetch
  const handleSortChange = (sortValue: string) => {
    setSelectedSort(sortValue);
    const option = SORT_OPTIONS.find(o => o.value === sortValue);
    if (option) {
      setFilters({
        order_by: option.order_by as 'start_time' | 'duration_seconds' | 'message_count',
        order: option.order as 'asc' | 'desc',
      });
    }
  };

  // Find the current project name for display
  const currentProject = filters.project
    ? projects.find((p) => p.encoded_name === filters.project)
    : null;

  const clearProjectFilter = () => {
    setFilters({ project: undefined });
  };

  const currentSort = SORT_OPTIONS.find(o => o.value === selectedSort);

  return (
    <div className="h-screen flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header - matches bookmarks style */}
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="px-6 pt-4 pb-4">
          {/* Title row */}
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2.5">
              <div className="flex items-center justify-center w-7 h-7 rounded-lg bg-gradient-to-br from-emerald-500 to-teal-600 shadow-sm">
                <History className="w-4 h-4 text-white" />
              </div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">
                Sessions
              </h1>
              {!loading && (
                <span className="text-sm text-gray-500 dark:text-gray-400">
                  {total} {total === 1 ? 'session' : 'sessions'}
                </span>
              )}
              {loading && sessions.length === 0 && (
                <span className="inline-flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400">
                  <Loader2 className="w-3 h-3 animate-spin" />
                  Loading...
                </span>
              )}
              {currentProject && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 rounded-full">
                  <FolderOpen className="w-3.5 h-3.5" />
                  {currentProject.name}
                  <button
                    onClick={clearProjectFilter}
                    className="ml-0.5 p-0.5 hover:bg-indigo-200 dark:hover:bg-indigo-800 rounded-full"
                    title="Clear project filter"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              )}
            </div>
            <button
              onClick={refreshSessions}
              disabled={loading}
              className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg border border-gray-200 dark:border-gray-700 disabled:opacity-50 transition-colors"
              title="Refresh to find new sessions"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
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
                placeholder="Search sessions..."
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

            {/* Project dropdown */}
            <ProjectDropdown />

            {/* Date filters */}
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={filters.date_from?.split('T')[0] || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ date_from: value ? `${value}T00:00:00` : undefined });
                }}
                className="px-2.5 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                title="From date"
              />
              <span className="text-gray-400 text-xs">to</span>
              <input
                type="date"
                value={filters.date_to?.split('T')[0] || ''}
                onChange={(e) => {
                  const value = e.target.value;
                  setFilters({ date_to: value ? `${value}T23:59:59` : undefined });
                }}
                className="px-2.5 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                title="To date"
              />
            </div>

            {/* Sort dropdown */}
            <div className="ml-auto">
              <Listbox value={selectedSort} onChange={handleSortChange}>
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

      {/* Content area */}
      <div className="flex-1 overflow-hidden">
        {error ? (
          <div className="m-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
            {error}
          </div>
        ) : loading && sessions.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        ) : sessions.length === 0 ? (
          <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
            No sessions found. Try adjusting your filters.
          </div>
        ) : (
          <div className="h-full overflow-auto">
            {/* Table */}
            <table className="w-full">
              {/* Sticky header */}
              <thead className="sticky top-0 z-10 bg-gray-100 dark:bg-gray-800/90 backdrop-blur-sm border-b border-gray-200 dark:border-gray-700">
                <tr>
                  <th className="text-left px-6 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <FolderOpen className="w-3.5 h-3.5" />
                      Project
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5" />
                      Date
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <Clock className="w-3.5 h-3.5" />
                      Duration
                    </div>
                  </th>
                  <th className="text-left px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center gap-1.5">
                      <GitBranch className="w-3.5 h-3.5" />
                      Branch
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Msgs
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    <div className="flex items-center justify-center gap-1.5">
                      <Wrench className="w-3.5 h-3.5" />
                      Tools
                    </div>
                  </th>
                  <th className="text-center px-4 py-3 text-xs font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wider">
                    Files
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                {sessions.map((session) => (
                  <SessionRow key={session.session_id} session={session} />
                ))}
              </tbody>
            </table>

            {/* Load more */}
            {hasMore && (
              <div className="py-4 text-center border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <button
                  onClick={fetchMoreSessions}
                  disabled={loading}
                  className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center gap-2"
                >
                  {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                  Load More
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

function SessionRow({ session }: { session: SessionSummary }) {
  return (
    <tr className="group bg-white dark:bg-gray-800/50 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
      <td className="px-6 py-3">
        <Link
          to={`/session/${session.session_id}`}
          className="block"
        >
          <div className="font-medium text-gray-900 dark:text-white hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
            {session.project_name}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[280px]" title={session.cwd || ''}>
            {session.cwd || 'Unknown directory'}
          </div>
          <div className="text-[10px] font-mono text-gray-400 dark:text-gray-500 mt-0.5">
            {session.session_id}
          </div>
        </Link>
      </td>
      <td className="px-4 py-3">
        <Link to={`/session/${session.session_id}`} className="block">
          <div className="text-sm text-gray-900 dark:text-white">
            {session.start_time ? formatDateTime(session.start_time) : '—'}
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400">
            {session.start_time ? formatRelativeTime(session.start_time) : ''}
          </div>
        </Link>
      </td>
      <td className="px-4 py-3">
        <Link to={`/session/${session.session_id}`} className="block text-sm text-gray-700 dark:text-gray-300">
          {session.duration_seconds ? formatDuration(session.duration_seconds) : '—'}
        </Link>
      </td>
      <td className="px-4 py-3">
        <Link to={`/session/${session.session_id}`} className="block">
          {session.git_branch ? (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded truncate max-w-[120px]" title={session.git_branch}>
              {session.git_branch}
            </span>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">—</span>
          )}
        </Link>
      </td>
      <td className="px-4 py-3 text-center">
        <Link to={`/session/${session.session_id}`} className="block text-sm font-medium text-gray-900 dark:text-white">
          {session.message_count}
        </Link>
      </td>
      <td className="px-4 py-3 text-center">
        <Link to={`/session/${session.session_id}`} className="block text-sm text-gray-700 dark:text-gray-300">
          {session.tool_count}
        </Link>
      </td>
      <td className="px-4 py-3 text-center">
        <Link to={`/session/${session.session_id}`} className="block">
          {session.files_modified_count > 0 ? (
            <span className="text-sm font-medium text-indigo-600 dark:text-indigo-400">
              {session.files_modified_count}
            </span>
          ) : (
            <span className="text-sm text-gray-400 dark:text-gray-500">0</span>
          )}
        </Link>
      </td>
    </tr>
  );
}

import { useEffect } from 'react';
import { Loader2, RefreshCw, X, FolderOpen } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { SessionCard } from './SessionCard';
import { SessionFilters } from './SessionFilters';

export function SessionList() {
  const { sessions, loading, error, total, hasMore, filters, projects, setFilters, fetchSessions, fetchMoreSessions, refreshSessions } =
    useSessionStore();

  // Fetch sessions when filters change
  useEffect(() => {
    fetchSessions();
  }, [fetchSessions, filters.project, filters.search, filters.date_from, filters.date_to]);

  // Find the current project name for display
  const currentProject = filters.project
    ? projects.find((p) => p.encoded_name === filters.project)
    : null;

  const clearProjectFilter = () => {
    setFilters({ project: undefined });
  };

  return (
    <div className="p-4">
      <div className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">Sessions</h1>
            {currentProject && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 text-sm bg-indigo-100 dark:bg-indigo-900 text-indigo-700 dark:text-indigo-300 rounded-full">
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
            className="flex items-center gap-1.5 px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 rounded disabled:opacity-50"
            title="Refresh to find new sessions"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>
        <SessionFilters />
      </div>

      {error ? (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md text-red-700 dark:text-red-400 text-sm">
          {error}
        </div>
      ) : null}

      {loading && sessions.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-12 text-gray-500 dark:text-gray-400 text-sm">
          No sessions found. Try adjusting your filters.
        </div>
      ) : (
        <>
          <p className="text-xs text-gray-500 dark:text-gray-400 mb-3">
            Showing {sessions.length} of {total} sessions
          </p>

          <div className="space-y-2">
            {sessions.map((session) => (
              <SessionCard key={session.session_id} session={session} />
            ))}
          </div>

          {hasMore ? (
            <div className="mt-4 text-center">
              <button
                onClick={fetchMoreSessions}
                disabled={loading}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 mx-auto"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                Load More
              </button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}

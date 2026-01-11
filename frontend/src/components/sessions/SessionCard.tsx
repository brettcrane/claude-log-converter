import { Link } from 'react-router-dom';
import { Clock, GitBranch, FileText, Wrench, Calendar } from 'lucide-react';
import type { SessionSummary } from '@/services/types';
import { formatDateTime, formatDuration, formatRelativeTime } from '@/utils/formatters';

interface SessionCardProps {
  session: SessionSummary;
}

export function SessionCard({ session }: SessionCardProps) {
  return (
    <Link
      to={`/session/${session.session_id}`}
      className="block bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4 hover:border-indigo-500 dark:hover:border-indigo-400 transition-colors"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <h3 className="font-medium text-gray-900 dark:text-white">
            {session.project_name}
          </h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-md" title={session.cwd || ''}>
            {session.cwd || 'Unknown directory'}
          </p>
        </div>
        <span className="text-xs text-gray-500 dark:text-gray-400">
          {formatRelativeTime(session.start_time)}
        </span>
      </div>

      <div className="flex flex-wrap gap-4 text-sm text-gray-600 dark:text-gray-400">
        <div className="flex items-center gap-1" title="Date">
          <Calendar className="w-4 h-4" />
          <span>{formatDateTime(session.start_time)}</span>
        </div>

        {session.duration_seconds ? (
          <div className="flex items-center gap-1" title="Duration">
            <Clock className="w-4 h-4" />
            <span>{formatDuration(session.duration_seconds)}</span>
          </div>
        ) : null}

        {session.git_branch ? (
          <div className="flex items-center gap-1" title="Git branch">
            <GitBranch className="w-4 h-4" />
            <span>{session.git_branch}</span>
          </div>
        ) : null}

        <div className="flex items-center gap-1" title="Messages">
          <FileText className="w-4 h-4" />
          <span>{session.message_count} messages</span>
        </div>

        <div className="flex items-center gap-1" title="Tool calls">
          <Wrench className="w-4 h-4" />
          <span>{session.tool_count} tools</span>
        </div>

        {session.files_modified_count > 0 ? (
          <div className="text-indigo-600 dark:text-indigo-400">
            {session.files_modified_count} files modified
          </div>
        ) : null}
      </div>
    </Link>
  );
}

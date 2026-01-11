import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  GitBranch,
  FolderOpen,
  FileText,
  Wrench,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  ListTodo,
} from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { formatDateTime, formatDuration } from '@/utils/formatters';
import { Timeline } from '@/components/timeline/Timeline';
import { getExportUrl } from '@/services/api';
import type { SessionDetail } from '@/services/types';

type TabType = 'timeline' | 'files' | 'summary';

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const { currentSession, loading, error, fetchSession, clearSession } = useSessionStore();
  const [activeTab, setActiveTab] = useState<TabType>('timeline');
  const [includeThinking, setIncludeThinking] = useState(false);

  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId, includeThinking);
    }
    return () => clearSession();
  }, [sessionId, includeThinking, fetchSession, clearSession]);

  if (loading && !currentSession) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4">
        <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
        <Link
          to="/"
          className="mt-4 inline-flex items-center gap-2 text-sm text-indigo-600 dark:text-indigo-400 hover:underline"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to sessions
        </Link>
      </div>
    );
  }

  if (!currentSession) {
    return null;
  }

  const tabs: { id: TabType; label: string; icon: typeof FileText }[] = [
    { id: 'timeline', label: 'Timeline', icon: FileText },
    { id: 'files', label: 'Files', icon: FolderOpen },
    { id: 'summary', label: 'Summary', icon: ListTodo },
  ];

  return (
    <div className="h-full flex flex-col">
      <div className="flex-shrink-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-3">
            <Link
              to="/"
              className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              title="Back"
            >
              <ArrowLeft className="w-4 h-4" />
            </Link>
            <div>
              <h1 className="font-semibold text-gray-900 dark:text-white">
                {currentSession.project_name}
              </h1>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-md">
                {currentSession.cwd}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <label className="flex items-center gap-1.5 text-xs text-gray-600 dark:text-gray-400">
              <input
                type="checkbox"
                checked={includeThinking}
                onChange={(e) => setIncludeThinking(e.target.checked)}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              Thinking
            </label>
            <a
              href={getExportUrl(currentSession.session_id, 'markdown', { includeThinking })}
              download
              className="flex items-center gap-1.5 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
            >
              <Download className="w-3 h-3" />
              MD
            </a>
            <a
              href={getExportUrl(currentSession.session_id, 'json', { includeThinking })}
              download
              className="flex items-center gap-1.5 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              <Download className="w-3 h-3" />
              JSON
            </a>
          </div>
        </div>

        <div className="flex flex-wrap gap-3 text-xs text-gray-600 dark:text-gray-400 mb-3">
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {formatDateTime(currentSession.start_time)}
          </div>
          {currentSession.duration_seconds ? (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {formatDuration(currentSession.duration_seconds)}
            </div>
          ) : null}
          {currentSession.git_branch ? (
            <div className="flex items-center gap-1">
              <GitBranch className="w-3 h-3" />
              {currentSession.git_branch}
            </div>
          ) : null}
          <div className="flex items-center gap-1">
            <FileText className="w-3 h-3" />
            {currentSession.events.filter((e) => ['user', 'assistant'].includes(e.type)).length} messages
          </div>
          <div className="flex items-center gap-1">
            <Wrench className="w-3 h-3" />
            {currentSession.events.filter((e) => e.type === 'tool_use').length} tools
          </div>
        </div>

        <div className="flex gap-1 border-b border-gray-200 dark:border-gray-700 -mb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors ${
                activeTab === tab.id
                  ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                  : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
              }`}
            >
              <tab.icon className="w-3 h-3" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 min-h-0 overflow-hidden">
        {activeTab === 'timeline' ? <Timeline events={currentSession.events} /> : null}
        {activeTab === 'files' ? <FilesTab session={currentSession} /> : null}
        {activeTab === 'summary' ? <SummaryTab session={currentSession} /> : null}
      </div>
    </div>
  );
}

function FilesTab({ session }: { session: SessionDetail }) {
  return (
    <div className="p-4 overflow-auto h-full">
      {session.files_modified.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <CheckCircle className="w-4 h-4 text-green-600" />
            Files Modified ({session.files_modified.length})
          </h3>
          <ul className="space-y-1">
            {session.files_modified.map((file) => (
              <li key={file} className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {file}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {session.files_read.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-blue-600" />
            Files Read ({session.files_read.length})
          </h3>
          <ul className="space-y-1">
            {session.files_read.map((file) => (
              <li key={file} className="text-xs font-mono text-gray-700 dark:text-gray-300 bg-gray-100 dark:bg-gray-800 px-2 py-1 rounded">
                {file}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {session.files_modified.length === 0 && session.files_read.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No files were read or modified.</p>
      ) : null}
    </div>
  );
}

function SummaryTab({ session }: { session: SessionDetail }) {
  return (
    <div className="p-4 overflow-auto h-full">
      {session.tools_used.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Tools Used</h3>
          <div className="flex flex-wrap gap-1">
            {session.tools_used.map((tool) => (
              <span
                key={tool}
                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 rounded text-gray-700 dark:text-gray-300"
              >
                {tool}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {session.phases.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Phases/Plans</h3>
          <ul className="space-y-1">
            {session.phases.map((phase, i) => (
              <li key={i} className="text-xs text-gray-700 dark:text-gray-300">
                {phase}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {session.decisions.length > 0 ? (
        <div className="mb-4">
          <h3 className="text-sm font-medium text-gray-900 dark:text-white mb-2">Key Decisions</h3>
          <ul className="space-y-1">
            {session.decisions.map((decision, i) => (
              <li key={i} className="text-xs text-gray-700 dark:text-gray-300">
                {decision}
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {session.phases.length === 0 && session.decisions.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          No phases or decisions detected.
        </p>
      ) : null}
    </div>
  );
}

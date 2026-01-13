import { useEffect, useState, Fragment, useCallback, useRef, useMemo } from 'react';
import { useParams, useLocation, Link } from 'react-router-dom';
import { Tab, Switch } from '@headlessui/react';
import {
  ArrowLeft,
  Clock,
  GitBranch,
  FolderOpen,
  FileText,
  Download,
  Loader2,
  AlertCircle,
  CheckCircle,
  ListTodo,
  Bookmark,
  Eye,
  HelpCircle,
  MessageSquare,
  Wrench,
  Activity,
} from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';
import { formatDateTime, formatDuration } from '@/utils/formatters';
import { Timeline } from '@/components/timeline/Timeline';
import { Tooltip } from '@/components/ui/Tooltip';
import { getExportUrl } from '@/services/api';
import type { SessionDetail } from '@/services/types';

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();

  // Use individual selectors to maintain stable references for action functions
  // This prevents infinite re-render loops when updating store state
  const currentSession = useSessionStore(state => state.currentSession);
  const loading = useSessionStore(state => state.loading);
  const error = useSessionStore(state => state.error);
  const fetchSession = useSessionStore(state => state.fetchSession);
  const clearSession = useSessionStore(state => state.clearSession);
  const setActiveEventType = useSessionStore(state => state.setActiveEventType);

  // Simple toggles for what to show (User + Assistant always shown)
  const [showTools, setShowTools] = useState(false);
  const [showThinking, setShowThinking] = useState(false);

  // Compute selected types from toggles
  const selectedTypes = useMemo(() => {
    const types = new Set(['user', 'assistant']);
    if (showTools) {
      types.add('tool_use');
      types.add('tool_result');
    }
    if (showThinking) {
      types.add('thinking');
    }
    return types;
  }, [showTools, showThinking]);

  const lastEventTypeRef = useRef<string | null>(null);

  // Parse event ID from URL hash (e.g., #event-abc123)
  const scrollToEventId = location.hash.startsWith('#event-')
    ? location.hash.slice(7) // Remove '#event-' prefix
    : undefined;

  // Track if the target event is currently filtered out
  const [targetEventFiltered, setTargetEventFiltered] = useState(false);

  // Sync activeEventType to store for header display
  // Use ref to track last value and prevent unnecessary store updates
  const handleActiveEventTypeChange = useCallback((eventType: string | null) => {
    if (lastEventTypeRef.current !== eventType) {
      lastEventTypeRef.current = eventType;
      setActiveEventType(eventType);
    }
  }, [setActiveEventType]);

  // Fetch bookmarks for this session
  const fetchSessionBookmarks = useBookmarkStore(state => state.fetchSessionBookmarks);

  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId, showThinking);
      // Fetch bookmarks for this session so badges display
      fetchSessionBookmarks(sessionId);
    }
    return () => clearSession();
  }, [sessionId, showThinking, fetchSession, clearSession, fetchSessionBookmarks]);

  // Show the bookmarked event by enabling the appropriate toggle
  const showBookmarkedEvent = useCallback(() => {
    if (!scrollToEventId || !currentSession) return;

    // Find the bookmarked event to get its type
    const targetEvent = currentSession.events.find(e => e.id === scrollToEventId);
    if (!targetEvent) return;

    // Enable the appropriate toggle based on event type
    if (targetEvent.type === 'tool_use' || targetEvent.type === 'tool_result') {
      setShowTools(true);
    } else if (targetEvent.type === 'thinking') {
      setShowThinking(true);
    }
    // User and Assistant are always shown, no action needed
  }, [scrollToEventId, currentSession]);

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

  const tabs = [
    { label: 'Timeline', icon: FileText, component: Timeline },
    { label: 'Files', icon: FolderOpen, component: FilesTab },
    { label: 'Summary', icon: ListTodo, component: SummaryTab },
  ];

  return (
    <Tab.Group>
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

            <div className="flex items-center gap-3">
              {/* Tools toggle */}
              <Switch.Group>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={showTools}
                    onChange={setShowTools}
                    className={`${
                      showTools ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1`}
                  >
                    <span
                      className={`${
                        showTools ? 'translate-x-5' : 'translate-x-1'
                      } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                  <Switch.Label className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    Tools
                  </Switch.Label>
                  <Tooltip
                    content="Show tool calls and their results"
                    position="bottom"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                  </Tooltip>
                </div>
              </Switch.Group>

              {/* Thinking toggle */}
              <Switch.Group>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={showThinking}
                    onChange={setShowThinking}
                    className={`${
                      showThinking ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1`}
                  >
                    <span
                      className={`${
                        showThinking ? 'translate-x-5' : 'translate-x-1'
                      } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                  <Switch.Label className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    Thinking
                  </Switch.Label>
                  <Tooltip
                    content="Show Claude's internal reasoning blocks"
                    position="bottom"
                  >
                    <HelpCircle className="w-3.5 h-3.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 cursor-help" />
                  </Tooltip>
                </div>
              </Switch.Group>

              <div className="w-px h-4 bg-gray-300 dark:bg-gray-600" />

              <a
                href={getExportUrl(currentSession.session_id, 'markdown', { includeThinking: showThinking })}
                download
                className="flex items-center gap-1.5 px-2 py-1 text-xs bg-indigo-600 text-white rounded hover:bg-indigo-700"
              >
                <Download className="w-3 h-3" />
                MD
              </a>
              <a
                href={getExportUrl(currentSession.session_id, 'json', { includeThinking: showThinking })}
                download
                className="flex items-center gap-1.5 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Download className="w-3 h-3" />
                JSON
              </a>
            </div>
          </div>

          <div className="flex items-center justify-between border-b border-gray-200 dark:border-gray-700 -mb-px">
            <Tab.List className="flex gap-1">
              {tabs.map((tab) => (
                <Tab key={tab.label} as={Fragment}>
                  {({ selected }) => (
                    <button
                      className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border-b-2 -mb-px transition-colors focus:outline-none ${
                        selected
                          ? 'border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400'
                          : 'border-transparent text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'
                      }`}
                    >
                      <tab.icon className="w-3 h-3" />
                      {tab.label}
                    </button>
                  )}
                </Tab>
              ))}
            </Tab.List>

            <div className="flex items-center gap-2 pb-1 text-[11px] text-gray-500 dark:text-gray-400">
              {/* Session metadata - compact inline */}
              <div className="hidden sm:flex items-center gap-2">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDateTime(currentSession.start_time)}
                </span>
                {currentSession.duration_seconds ? (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatDuration(currentSession.duration_seconds)}
                    </span>
                  </>
                ) : null}
                {currentSession.git_branch ? (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="w-3 h-3" />
                      {currentSession.git_branch}
                    </span>
                  </>
                ) : null}
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="flex items-center gap-1">
                  <MessageSquare className="w-3 h-3" />
                  {currentSession.events.filter((e) => ['user', 'assistant'].includes(e.type)).length} msgs
                </span>
                <span className="text-gray-300 dark:text-gray-600">·</span>
                <span className="flex items-center gap-1">
                  <Wrench className="w-3 h-3" />
                  {currentSession.events.filter((e) => e.type === 'tool_use').length} tools
                </span>
              </div>

              <span className="text-gray-300 dark:text-gray-600 hidden sm:inline">|</span>

              {/* Event counter */}
              <span className="flex items-center gap-1">
                <Activity className="w-3 h-3" />
                {currentSession.events.filter((e) => selectedTypes.has(e.type)).length} events
              </span>

              {/* Bookmarked event hidden indicator */}
              {scrollToEventId && targetEventFiltered && (
                <button
                  onClick={showBookmarkedEvent}
                  className="flex items-center gap-1.5 px-2 py-1 text-xs bg-amber-50 dark:bg-amber-900/30 text-amber-700 dark:text-amber-300 border border-amber-200 dark:border-amber-700 rounded-full hover:bg-amber-100 dark:hover:bg-amber-900/50 transition-colors"
                >
                  <Bookmark className="w-3 h-3 fill-current" />
                  <span>Bookmark hidden</span>
                  <Eye className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 flex min-h-0">
          <Tab.Panels className="flex-1 min-h-0 overflow-hidden">
            <Tab.Panel className="h-full">
              <Timeline
                events={currentSession.events}
                session={currentSession}
                selectedTypes={selectedTypes}
                scrollToEventId={scrollToEventId}
                onActiveEventTypeChange={handleActiveEventTypeChange}
                onTargetEventFiltered={setTargetEventFiltered}
              />
            </Tab.Panel>
            <Tab.Panel className="h-full">
              <FilesTab session={currentSession} />
            </Tab.Panel>
            <Tab.Panel className="h-full">
              <SummaryTab session={currentSession} />
            </Tab.Panel>
          </Tab.Panels>
        </div>
      </div>
    </Tab.Group>
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

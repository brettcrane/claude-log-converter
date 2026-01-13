import { useEffect, useState, Fragment, useCallback, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Tab, Switch, Menu, Transition } from '@headlessui/react';
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
  Filter,
  ChevronDown,
} from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { formatDateTime, formatDuration } from '@/utils/formatters';
import { Timeline } from '@/components/timeline/Timeline';
import { getExportUrl } from '@/services/api';
import type { SessionDetail } from '@/services/types';

const EVENT_TYPES = [
  { value: 'user', label: 'User', color: 'bg-blue-500' },
  { value: 'assistant', label: 'Assistant', color: 'bg-purple-500' },
  { value: 'tool_use', label: 'Tool Use', color: 'bg-gray-500' },
  { value: 'tool_result', label: 'Tool Result', color: 'bg-gray-400' },
  { value: 'thinking', label: 'Thinking', color: 'bg-gray-300' },
];

export function SessionDetailPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  // Use individual selectors to maintain stable references for action functions
  // This prevents infinite re-render loops when updating store state
  const currentSession = useSessionStore(state => state.currentSession);
  const loading = useSessionStore(state => state.loading);
  const error = useSessionStore(state => state.error);
  const fetchSession = useSessionStore(state => state.fetchSession);
  const clearSession = useSessionStore(state => state.clearSession);
  const setActiveEventType = useSessionStore(state => state.setActiveEventType);
  const [includeThinking, setIncludeThinking] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(['user', 'assistant', 'tool_use'])
  );
  const lastEventTypeRef = useRef<string | null>(null);

  // Sync activeEventType to store for header display
  // Use ref to track last value and prevent unnecessary store updates
  const handleActiveEventTypeChange = useCallback((eventType: string | null) => {
    if (lastEventTypeRef.current !== eventType) {
      lastEventTypeRef.current = eventType;
      setActiveEventType(eventType);
    }
  }, [setActiveEventType]);

  useEffect(() => {
    if (sessionId) {
      fetchSession(sessionId, includeThinking);
    }
    return () => clearSession();
  }, [sessionId, includeThinking, fetchSession, clearSession]);

  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const selectAll = () => {
    setSelectedTypes(new Set(EVENT_TYPES.map((t) => t.value)));
  };

  const selectNone = () => {
    setSelectedTypes(new Set());
  };

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

            <div className="flex items-center gap-2">
              <Switch.Group>
                <div className="flex items-center gap-1.5">
                  <Switch
                    checked={includeThinking}
                    onChange={setIncludeThinking}
                    className={`${
                      includeThinking ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'
                    } relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1`}
                  >
                    <span
                      className={`${
                        includeThinking ? 'translate-x-5' : 'translate-x-1'
                      } inline-block h-3 w-3 transform rounded-full bg-white transition-transform`}
                    />
                  </Switch>
                  <Switch.Label className="text-xs text-gray-600 dark:text-gray-400 cursor-pointer">
                    Thinking
                  </Switch.Label>
                </div>
              </Switch.Group>
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

            <div className="flex items-center gap-3 pb-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {currentSession.events.filter((e) => selectedTypes.has(e.type)).length} of {currentSession.events.length} events
              </span>

              <Menu as="div" className="relative">
                <Menu.Button className="flex items-center gap-1.5 px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded hover:bg-gray-50 dark:hover:bg-gray-700">
                  <Filter className="w-3 h-3" />
                  Filter
                  <ChevronDown className="w-3 h-3" />
                </Menu.Button>

                <Transition
                  as={Fragment}
                  enter="transition ease-out duration-100"
                  enterFrom="transform opacity-0 scale-95"
                  enterTo="transform opacity-100 scale-100"
                  leave="transition ease-in duration-75"
                  leaveFrom="transform opacity-100 scale-100"
                  leaveTo="transform opacity-0 scale-95"
                >
                  <Menu.Items className="absolute right-0 mt-2 w-44 origin-top-right bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg focus:outline-none z-50">
                    <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex gap-2">
                      <button
                        onClick={selectAll}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        All
                      </button>
                      <button
                        onClick={selectNone}
                        className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                      >
                        None
                      </button>
                    </div>
                    <div className="p-2 space-y-1">
                      {EVENT_TYPES.map((type) => (
                        <Menu.Item key={type.value}>
                          {() => (
                            <label className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer">
                              <input
                                type="checkbox"
                                checked={selectedTypes.has(type.value)}
                                onChange={() => toggleType(type.value)}
                                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                              />
                              <span className={`w-2 h-2 rounded-full ${type.color}`} />
                              <span className="text-sm text-gray-900 dark:text-white">{type.label}</span>
                            </label>
                          )}
                        </Menu.Item>
                      ))}
                    </div>
                  </Menu.Items>
                </Transition>
              </Menu>
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
                onActiveEventTypeChange={handleActiveEventTypeChange}
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

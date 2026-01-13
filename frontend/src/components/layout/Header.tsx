import { Link, useLocation } from 'react-router-dom';
import { Terminal, Upload, History, Bookmark, User, Bot, Wrench, CheckCircle, Brain } from 'lucide-react';
import { useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';

const EVENT_TYPE_CONFIG: Record<string, { label: string; icon: typeof User; bgClass: string; textClass: string }> = {
  user: {
    label: 'User',
    icon: User,
    bgClass: 'bg-blue-100 dark:bg-blue-900/40',
    textClass: 'text-blue-700 dark:text-blue-300',
  },
  assistant: {
    label: 'Assistant',
    icon: Bot,
    bgClass: 'bg-purple-100 dark:bg-purple-900/40',
    textClass: 'text-purple-700 dark:text-purple-300',
  },
  tool_use: {
    label: 'Tool Use',
    icon: Wrench,
    bgClass: 'bg-gray-100 dark:bg-gray-700',
    textClass: 'text-gray-700 dark:text-gray-300',
  },
  tool_result: {
    label: 'Tool Result',
    icon: CheckCircle,
    bgClass: 'bg-green-100 dark:bg-green-900/40',
    textClass: 'text-green-700 dark:text-green-300',
  },
  thinking: {
    label: 'Thinking',
    icon: Brain,
    bgClass: 'bg-amber-100 dark:bg-amber-900/40',
    textClass: 'text-amber-700 dark:text-amber-300',
  },
};

export function Header() {
  const location = useLocation();
  const { fetchProjects, currentSession, activeEventType } = useSessionStore();
  const { total: bookmarkCount } = useBookmarkStore();

  const isActive = (path: string) => location.pathname === path;
  const isSessionPage = location.pathname.startsWith('/session/');

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const eventTypeConfig = activeEventType ? EVENT_TYPE_CONFIG[activeEventType] : null;

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
      <div className="px-4">
        <div className="flex items-center h-14 gap-6">
          {/* Left: Logo + App Name + Primary Navigation */}
          <div className="flex items-center gap-6">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
              <Link to="/" className="font-semibold text-gray-900 dark:text-white">
                Claude Log Viewer
              </Link>
            </div>

            {/* Primary Navigation - now on the left */}
            <nav className="flex items-center gap-1">
              <Link
                to="/"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive('/')
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                }`}
              >
                <History className="w-4 h-4" />
                Sessions
              </Link>
              <Link
                to="/bookmarks"
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                  isActive('/bookmarks')
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
                }`}
              >
                <Bookmark className="w-4 h-4" />
                Bookmarks
                {bookmarkCount > 0 && (
                  <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                    {bookmarkCount}
                  </span>
                )}
              </Link>
            </nav>
          </div>

          {/* Center: Current event type badge when viewing a session */}
          {isSessionPage && currentSession && (
            <div className="flex-1 flex items-center justify-center">
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-gray-900 dark:text-white">
                  {currentSession.project_name}
                </span>
                {eventTypeConfig && (
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${eventTypeConfig.bgClass} ${eventTypeConfig.textClass} transition-all duration-200`}>
                    <eventTypeConfig.icon className="w-3 h-3" aria-hidden="true" />
                    {eventTypeConfig.label}
                  </span>
                )}
              </div>
            </div>
          )}

          {/* Spacer when not on session page */}
          {!isSessionPage && <div className="flex-1" />}

          {/* Right: Upload */}
          <Link
            to="/upload"
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
              isActive('/upload')
                ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
            }`}
          >
            <Upload className="w-4 h-4" />
            Upload
          </Link>
        </div>
      </div>
    </header>
  );
}

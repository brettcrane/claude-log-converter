import { Link, useLocation } from 'react-router-dom';
import { Terminal, Upload, FolderOpen, PanelLeftClose, PanelLeft } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

export function Header() {
  const location = useLocation();
  const { sidebarCollapsed, toggleSidebar } = useSessionStore();

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
      <div className="px-4">
        <div className="flex justify-between items-center h-14">
          <div className="flex items-center gap-2">
            <button
              onClick={toggleSidebar}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              title={sidebarCollapsed ? 'Show sidebar' : 'Hide sidebar'}
            >
              {sidebarCollapsed ? (
                <PanelLeft className="w-5 h-5" />
              ) : (
                <PanelLeftClose className="w-5 h-5" />
              )}
            </button>
            <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <Link to="/" className="font-semibold text-gray-900 dark:text-white">
              Claude Log Viewer
            </Link>
          </div>

          <nav className="flex items-center gap-1">
            <Link
              to="/"
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors flex items-center gap-2 ${
                isActive('/')
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                  : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-300 dark:hover:text-white dark:hover:bg-gray-700'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              Sessions
            </Link>
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
          </nav>
        </div>
      </div>
    </header>
  );
}

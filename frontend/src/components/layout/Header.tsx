import { Link, useLocation } from 'react-router-dom';
import { Terminal, Upload, FolderOpen, Bookmark } from 'lucide-react';
import { useEffect } from 'react';
import { useSessionStore } from '@/stores/sessionStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';

export function Header() {
  const location = useLocation();
  const { fetchProjects } = useSessionStore();
  const { total: bookmarkCount } = useBookmarkStore();

  const isActive = (path: string) => location.pathname === path;

  // Fetch projects on mount
  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  return (
    <header className="sticky top-0 z-50 border-b border-gray-200 dark:border-gray-700 bg-white/95 dark:bg-gray-800/95 backdrop-blur-sm">
      <div className="px-4">
        <div className="flex justify-between items-center h-14">
          {/* Left: Logo + App Name */}
          <div className="flex items-center gap-2">
            <Terminal className="w-5 h-5 text-indigo-600 dark:text-indigo-400" />
            <Link to="/" className="font-semibold text-gray-900 dark:text-white">
              Claude Log Viewer
            </Link>
          </div>

          {/* Center: Primary Navigation */}
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

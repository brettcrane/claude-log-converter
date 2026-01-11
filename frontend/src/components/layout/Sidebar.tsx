import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { FolderOpen, ChevronRight, PanelLeftClose, PanelLeft, Bookmark } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';
import { useBookmarkStore } from '@/stores/bookmarkStore';

export function Sidebar() {
  const { projects, filters, setFilters, fetchProjects, sidebarCollapsed, toggleSidebar } = useSessionStore();
  const { total: bookmarkCount } = useBookmarkStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleProjectClick = (encodedName: string | null) => {
    setFilters({ project: encodedName || undefined });
    navigate('/');
  };

  if (sidebarCollapsed) {
    return (
      <aside className="w-10 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex-shrink-0">
        <div className="p-2">
          <button
            onClick={toggleSidebar}
            className="p-1.5 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md text-gray-500 dark:text-gray-400"
            title="Show sidebar"
          >
            <PanelLeft className="w-5 h-5" />
          </button>
        </div>
      </aside>
    );
  }

  return (
    <aside className="w-56 border-r border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 overflow-y-auto flex-shrink-0">
      <div className="p-3">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
            Navigation
          </h2>
          <button
            onClick={toggleSidebar}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded text-gray-400 dark:text-gray-500"
            title="Hide sidebar"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* Bookmarks Link */}
        <div className="mb-4">
          <button
            onClick={() => navigate('/bookmarks')}
            className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
              location.pathname === '/bookmarks'
                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-200'
                : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
            }`}
          >
            <Bookmark className="w-4 h-4" />
            <span className="flex-1 text-left">Bookmarks</span>
            {bookmarkCount > 0 && (
              <span className="text-xs bg-gray-200 dark:bg-gray-600 px-1.5 py-0.5 rounded">
                {bookmarkCount}
              </span>
            )}
          </button>
        </div>

        {/* Projects Section */}
        <h2 className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
          Projects
        </h2>
        <ul className="space-y-0.5">
          <li>
            <button
              onClick={() => handleProjectClick(null)}
              className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                !filters.project
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                  : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
              }`}
            >
              <FolderOpen className="w-4 h-4" />
              <span className="flex-1 text-left">All Projects</span>
            </button>
          </li>
          {projects.map((project) => (
            <li key={project.encoded_name}>
              <button
                onClick={() => handleProjectClick(project.encoded_name)}
                className={`w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded-md transition-colors ${
                  filters.project === project.encoded_name
                    ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-200'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                <FolderOpen className="w-4 h-4 flex-shrink-0" />
                <span className="flex-1 text-left truncate" title={project.decoded_path}>
                  {project.name}
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {project.session_count}
                </span>
                <ChevronRight className="w-3 h-3 text-gray-400" />
              </button>
            </li>
          ))}
        </ul>
      </div>
    </aside>
  );
}

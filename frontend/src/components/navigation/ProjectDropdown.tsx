import { Fragment, useState } from 'react';
import { Menu, Transition } from '@headlessui/react';
import { FolderOpen, ChevronDown, Check, Search } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useSessionStore } from '@/stores/sessionStore';

export function ProjectDropdown() {
  const { projects, filters, setFilters } = useSessionStore();
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();

  const selectedProject = projects.find(p => p.encoded_name === filters.project);
  const displayName = selectedProject?.name || 'All Projects';

  // Filter projects based on search
  const filteredProjects = searchQuery
    ? projects.filter(p => p.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : projects;

  const handleSelectProject = (encodedName: string | null) => {
    setFilters({ project: encodedName || undefined });
    setSearchQuery('');
    navigate('/');
  };

  return (
    <Menu as="div" className="relative">
      {({ open }) => (
        <>
          {/* Trigger Button */}
          <Menu.Button className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-md border border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
            <FolderOpen className="w-4 h-4 text-gray-500 dark:text-gray-400" />
            <span className="text-gray-900 dark:text-white">{displayName}</span>
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
          </Menu.Button>

          {/* Dropdown Menu */}
          <Transition
            as={Fragment}
            enter="transition ease-out duration-100"
            enterFrom="transform opacity-0 scale-95"
            enterTo="transform opacity-100 scale-100"
            leave="transition ease-in duration-75"
            leaveFrom="transform opacity-100 scale-100"
            leaveTo="transform opacity-0 scale-95"
          >
            <Menu.Items className="absolute left-0 mt-2 w-64 origin-top-left bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg focus:outline-none z-50">
              {/* Search Input (if many projects) */}
              {projects.length > 10 && (
                <div className="p-2 border-b border-gray-200 dark:border-gray-700">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      placeholder="Search projects..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-8 pr-2 py-1.5 text-sm bg-gray-50 dark:bg-gray-900 border border-gray-300 dark:border-gray-600 rounded focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      onClick={(e) => e.stopPropagation()}
                    />
                  </div>
                </div>
              )}

              {/* Project List */}
              <div className="py-1 max-h-80 overflow-y-auto">
                {/* All Projects Option */}
                <Menu.Item>
                  {({ active }) => (
                    <button
                      onClick={() => handleSelectProject(null)}
                      className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                        active ? 'bg-gray-50 dark:bg-gray-700' : ''
                      } ${
                        !filters.project ? 'text-indigo-600 dark:text-indigo-400 font-medium' : 'text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <FolderOpen className="w-4 h-4 flex-shrink-0" />
                      <span className="flex-1 text-left">All Projects</span>
                      {!filters.project && <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400" />}
                    </button>
                  )}
                </Menu.Item>

                <div className="h-px bg-gray-200 dark:bg-gray-700 my-1" />

                {/* Individual Projects */}
                {filteredProjects.map((project) => (
                  <Menu.Item key={project.encoded_name}>
                    {({ active }) => (
                      <button
                        onClick={() => handleSelectProject(project.encoded_name)}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm ${
                          active ? 'bg-gray-50 dark:bg-gray-700' : ''
                        } ${
                          filters.project === project.encoded_name
                            ? 'text-indigo-600 dark:text-indigo-400 font-medium'
                            : 'text-gray-700 dark:text-gray-300'
                        }`}
                        title={project.decoded_path}
                      >
                        <FolderOpen className="w-4 h-4 flex-shrink-0" />
                        <span className="flex-1 text-left truncate">{project.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{project.session_count}</span>
                        {filters.project === project.encoded_name && (
                          <Check className="w-4 h-4 text-indigo-600 dark:text-indigo-400 flex-shrink-0" />
                        )}
                      </button>
                    )}
                  </Menu.Item>
                ))}

                {/* No Results */}
                {filteredProjects.length === 0 && (
                  <div className="px-3 py-2 text-sm text-gray-500 dark:text-gray-400">
                    No projects found
                  </div>
                )}
              </div>
            </Menu.Items>
          </Transition>
        </>
      )}
    </Menu>
  );
}

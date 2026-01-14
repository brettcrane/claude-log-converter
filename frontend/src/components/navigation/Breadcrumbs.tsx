import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, History, FileUp, MessageSquare, FolderOpen } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

interface BreadcrumbSegment {
  label: string;
  href?: string;
  icon?: React.ReactNode;
  iconBg?: string;
}

export function Breadcrumbs() {
  const location = useLocation();
  const { sessionId } = useParams();
  const { currentSession, filters, projects } = useSessionStore();

  const segments: BreadcrumbSegment[] = [];

  // Top-level pages don't need breadcrumbs
  if (location.pathname === '/bookmarks') {
    return null;
  }

  // Home/Sessions page - has its own integrated header with filters/project badge
  if (location.pathname === '/') {
    return null;
  }

  // On other pages, show Sessions as the base
  segments.push({
    label: 'Sessions',
    href: '/',
    icon: <History className="w-3 h-3" />,
    iconBg: 'bg-gradient-to-br from-emerald-500 to-teal-600',
  });

  // Add project if filtered (and not viewing a session which has its own project display)
  if (filters.project && !sessionId) {
    const project = projects.find(p => p.encoded_name === filters.project);
    if (project) {
      segments.push({
        label: project.name,
        href: `/?project=${filters.project}`,
        icon: <FolderOpen className="w-3 h-3" />,
      });
    }
  }

  // Add session if viewing session detail
  if (sessionId && currentSession) {
    // Add project context for session
    if (currentSession.project_name) {
      const project = projects.find(p => p.name === currentSession.project_name);
      segments.push({
        label: currentSession.project_name,
        href: project ? `/?project=${project.encoded_name}` : undefined,
        icon: <FolderOpen className="w-3 h-3" />,
      });
    }
    segments.push({
      label: sessionId,
      icon: <MessageSquare className="w-3 h-3" />,
    });
  }

  // Add upload page
  if (location.pathname === '/upload') {
    segments.push({
      label: 'Upload',
      icon: <FileUp className="w-3 h-3" />,
      iconBg: 'bg-gradient-to-br from-amber-500 to-orange-600',
    });
  }

  // Don't show breadcrumbs if only one segment
  if (segments.length <= 1) {
    return null;
  }

  return (
    <nav
      aria-label="Breadcrumb"
      className="flex items-center gap-1.5 px-6 py-2.5 text-sm bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700"
    >
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const showGradientIcon = index === 0 && segment.iconBg;

        return (
          <div key={index} className="flex items-center gap-1.5">
            {index > 0 && (
              <ChevronRight className="w-3.5 h-3.5 text-gray-400 dark:text-gray-500" />
            )}

            {segment.href && !isLast ? (
              <Link
                to={segment.href}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              >
                {showGradientIcon ? (
                  <span className={`flex items-center justify-center w-5 h-5 rounded ${segment.iconBg} shadow-sm`}>
                    <span className="text-white">{segment.icon}</span>
                  </span>
                ) : segment.icon ? (
                  <span className="text-gray-400">{segment.icon}</span>
                ) : null}
                <span className="font-medium">{segment.label}</span>
              </Link>
            ) : (
              <span className="flex items-center gap-1.5 px-2 py-1 text-gray-900 dark:text-white">
                {showGradientIcon ? (
                  <span className={`flex items-center justify-center w-5 h-5 rounded ${segment.iconBg} shadow-sm`}>
                    <span className="text-white">{segment.icon}</span>
                  </span>
                ) : segment.icon ? (
                  <span className="text-gray-500 dark:text-gray-400">{segment.icon}</span>
                ) : null}
                <span className="font-medium">{segment.label}</span>
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}

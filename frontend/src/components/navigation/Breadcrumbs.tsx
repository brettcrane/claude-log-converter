import { Link, useLocation, useParams } from 'react-router-dom';
import { ChevronRight, Home } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

interface BreadcrumbSegment {
  label: string;
  href?: string;
  icon?: React.ReactNode;
}

export function Breadcrumbs() {
  const location = useLocation();
  const { sessionId } = useParams();
  const { currentSession, filters, projects } = useSessionStore();

  const segments: BreadcrumbSegment[] = [
    { label: 'Home', href: '/', icon: <Home className="w-3 h-3" /> },
  ];

  // Add project if filtered
  if (filters.project) {
    const project = projects.find(p => p.encoded_name === filters.project);
    if (project) {
      segments.push({ label: project.name, href: `/?project=${filters.project}` });
    }
  }

  // Add session if viewing session detail
  if (sessionId && currentSession) {
    segments.push({
      label: sessionId,
      href: `/session/${sessionId}`,
    });
  }

  // Add upload page
  if (location.pathname === '/upload') {
    segments.push({ label: 'Upload' });
  }

  // Add bookmarks page
  if (location.pathname === '/bookmarks') {
    segments.push({ label: 'Bookmarks' });
  }

  // Don't show breadcrumbs on home page with no filters
  if (segments.length === 1 && location.pathname === '/') {
    return null;
  }

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-2 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 bg-gray-50 dark:bg-gray-900 border-b border-gray-200 dark:border-gray-700">
      {segments.map((segment, index) => (
        <div key={index} className="flex items-center gap-2">
          {index > 0 && <ChevronRight className="w-4 h-4 text-gray-400" />}

          {segment.href ? (
            <Link
              to={segment.href}
              className="flex items-center gap-1 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {segment.icon}
              <span>{segment.label}</span>
            </Link>
          ) : (
            <span className="flex items-center gap-1 text-gray-900 dark:text-white font-medium">
              {segment.icon}
              <span>{segment.label}</span>
            </span>
          )}
        </div>
      ))}
    </nav>
  );
}

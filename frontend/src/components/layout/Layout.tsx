import { Outlet } from 'react-router-dom';
import { Header } from './Header';
import { Breadcrumbs } from '@/components/navigation/Breadcrumbs';

export function Layout() {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <Breadcrumbs />
      <main className="flex-1 min-h-0 overflow-hidden bg-gray-50 dark:bg-gray-900">
        <Outlet />
      </main>
    </div>
  );
}

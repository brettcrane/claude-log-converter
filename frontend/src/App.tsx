import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Layout } from '@/components/layout/Layout';
import { HomePage } from '@/pages/HomePage';
import { SessionDetailPage } from '@/pages/SessionDetailPage';
import { UploadPage } from '@/pages/UploadPage';
import { BookmarksPage } from '@/pages/BookmarksPage';
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function AppRoutes() {
  useKeyboardShortcuts();

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<HomePage />} />
        <Route path="session/:sessionId" element={<SessionDetailPage />} />
        <Route path="upload" element={<UploadPage />} />
        <Route path="bookmarks" element={<BookmarksPage />} />
      </Route>
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;

import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function isInputFocused() {
  const active = document.activeElement;
  return (
    active?.tagName === 'INPUT' ||
    active?.tagName === 'TEXTAREA' ||
    active?.hasAttribute('contenteditable')
  );
}

export function useKeyboardShortcuts() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Skip if input is focused
      if (isInputFocused()) return;

      // Escape: Go back / navigate to home
      if (e.key === 'Escape') {
        navigate('/');
      }

      // H: Navigate to home
      if (e.key === 'h') {
        navigate('/');
      }

      // B: Navigate to bookmarks
      if (e.key === 'b') {
        navigate('/bookmarks');
      }

      // U: Navigate to upload
      if (e.key === 'u') {
        navigate('/upload');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);
}

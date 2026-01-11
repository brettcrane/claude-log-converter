import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronUp } from 'lucide-react';

interface FloatingNavProps {
  /** Ref to the scroll container to monitor */
  scrollContainerRef: React.RefObject<HTMLElement | null>;
  /** Show threshold in pixels */
  threshold?: number;
}

export function FloatingNav({ scrollContainerRef, threshold = 200 }: FloatingNavProps) {
  const navigate = useNavigate();
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const handleScroll = () => {
      setIsVisible(container.scrollTop > threshold);
    };

    container.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      container.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef, threshold]);

  const scrollToTop = () => {
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    navigate('/');
  };

  if (!isVisible) return null;

  return (
    <div className="fixed bottom-6 right-6 z-40 flex flex-col gap-2">
      {/* Scroll to top */}
      <button
        onClick={scrollToTop}
        className="
          p-3 rounded-full
          bg-white dark:bg-gray-800
          border border-gray-200 dark:border-gray-700
          shadow-lg hover:shadow-xl
          text-gray-600 dark:text-gray-300
          hover:text-gray-900 dark:hover:text-white
          hover:bg-gray-50 dark:hover:bg-gray-700
          transition-all duration-200
        "
        title="Scroll to top"
      >
        <ChevronUp className="w-5 h-5" />
      </button>

      {/* Back to sessions */}
      <button
        onClick={goBack}
        className="
          p-3 rounded-full
          bg-indigo-600 hover:bg-indigo-700
          text-white
          shadow-lg hover:shadow-xl
          transition-all duration-200
        "
        title="Back to sessions"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>
    </div>
  );
}

import { useState, useEffect, Fragment } from 'react';
import { useNavigate } from 'react-router-dom';
import { Transition } from '@headlessui/react';
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
      // Check both container scroll and window scroll
      // Some layouts scroll the container, others scroll the window
      const containerScrolled = container.scrollTop > threshold;
      const windowScrolled = window.scrollY > threshold;
      setIsVisible(containerScrolled || windowScrolled);
    };

    // Listen to both container and window scroll
    container.addEventListener('scroll', handleScroll, { passive: true });
    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll(); // Initial check

    return () => {
      container.removeEventListener('scroll', handleScroll);
      window.removeEventListener('scroll', handleScroll);
    };
  }, [scrollContainerRef, threshold]);

  const scrollToTop = () => {
    // Scroll both container and window to handle different layout scenarios
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goBack = () => {
    navigate('/');
  };

  return (
    <Transition
      show={isVisible}
      as={Fragment}
      enter="transition ease-out duration-200"
      enterFrom="opacity-0 translate-y-4"
      enterTo="opacity-100 translate-y-0"
      leave="transition ease-in duration-150"
      leaveFrom="opacity-100 translate-y-0"
      leaveTo="opacity-0 translate-y-4"
    >
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
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
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
            focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2
          "
          title="Back to sessions"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      </div>
    </Transition>
  );
}

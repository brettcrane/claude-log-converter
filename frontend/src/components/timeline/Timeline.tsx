import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Filter, ChevronDown, Search, X, ChevronUp, ChevronDown as ChevronDownIcon } from 'lucide-react';
import type { TimelineEvent as TimelineEventType } from '@/services/types';
import { TimelineEvent } from './TimelineEvent';

interface TimelineProps {
  events: TimelineEventType[];
}

const EVENT_TYPES = [
  { value: 'user', label: 'User', color: 'bg-blue-500' },
  { value: 'assistant', label: 'Assistant', color: 'bg-purple-500' },
  { value: 'tool_use', label: 'Tool Use', color: 'bg-gray-500' },
  { value: 'tool_result', label: 'Tool Result', color: 'bg-gray-400' },
  { value: 'thinking', label: 'Thinking', color: 'bg-gray-300' },
];

export function Timeline({ events }: TimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(['user', 'assistant', 'tool_use'])
  );

  // Search state
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);

  const filteredEvents = events.filter((e) => selectedTypes.has(e.type));

  // Find matching event indices
  const searchMatches = useMemo(() => {
    if (!searchQuery.trim()) return [];
    const query = searchQuery.toLowerCase();
    const matches: number[] = [];
    filteredEvents.forEach((event, index) => {
      const content = event.content?.toLowerCase() || '';
      const toolInput = event.tool_input ? JSON.stringify(event.tool_input).toLowerCase() : '';
      if (content.includes(query) || toolInput.includes(query)) {
        matches.push(index);
      }
    });
    return matches;
  }, [filteredEvents, searchQuery]);

  // Reset current match when search changes
  useEffect(() => {
    setCurrentMatchIndex(0);
  }, [searchQuery]);

  const virtualizer = useVirtualizer({
    count: filteredEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  // Keyboard shortcut for Ctrl+F
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        setSearchOpen(true);
        setTimeout(() => searchInputRef.current?.focus(), 0);
      }
      if (e.key === 'Escape' && searchOpen) {
        setSearchOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [searchOpen]);

  // Scroll to current match
  const scrollToMatch = useCallback((matchIdx: number) => {
    if (searchMatches.length === 0) return;
    const eventIndex = searchMatches[matchIdx];
    if (eventIndex !== undefined) {
      virtualizer.scrollToIndex(eventIndex, { align: 'start' });
    }
  }, [searchMatches, virtualizer]);

  // Navigate to next/previous match
  const goToNextMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const nextIndex = (currentMatchIndex + 1) % searchMatches.length;
    setCurrentMatchIndex(nextIndex);
    scrollToMatch(nextIndex);
  }, [currentMatchIndex, searchMatches.length, scrollToMatch]);

  const goToPrevMatch = useCallback(() => {
    if (searchMatches.length === 0) return;
    const prevIndex = (currentMatchIndex - 1 + searchMatches.length) % searchMatches.length;
    setCurrentMatchIndex(prevIndex);
    scrollToMatch(prevIndex);
  }, [currentMatchIndex, searchMatches.length, scrollToMatch]);

  // Handle Enter key in search input
  const handleSearchKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        goToPrevMatch();
      } else {
        goToNextMatch();
      }
    }
  };

  // Scroll to first match when search query changes and has results
  useEffect(() => {
    if (searchMatches.length > 0) {
      scrollToMatch(0);
    }
  }, [searchMatches, scrollToMatch]);

  const toggleType = (type: string) => {
    const newSet = new Set(selectedTypes);
    if (newSet.has(type)) {
      newSet.delete(type);
    } else {
      newSet.add(type);
    }
    setSelectedTypes(newSet);
  };

  const selectAll = () => {
    setSelectedTypes(new Set(EVENT_TYPES.map((t) => t.value)));
  };

  const selectNone = () => {
    setSelectedTypes(new Set());
  };

  // Create a set of matching event indices for quick lookup
  const matchingEventIndices = useMemo(() => new Set(searchMatches), [searchMatches]);
  const currentMatchEventIndex = searchMatches[currentMatchIndex];

  return (
    <div className="flex flex-col h-full">
      {/* Search bar */}
      {searchOpen && (
        <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-yellow-50 dark:bg-yellow-900/20">
          <div className="flex items-center gap-2">
            <Search className="w-4 h-4 text-gray-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={handleSearchKeyDown}
              placeholder="Search in conversation..."
              className="flex-1 bg-transparent border-none outline-none text-sm text-gray-900 dark:text-white placeholder-gray-400"
              autoFocus
            />
            {searchQuery && (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                {searchMatches.length > 0
                  ? `${currentMatchIndex + 1} of ${searchMatches.length}`
                  : 'No matches'}
              </span>
            )}
            <button
              onClick={goToPrevMatch}
              disabled={searchMatches.length === 0}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
              title="Previous match (Shift+Enter)"
            >
              <ChevronUp className="w-4 h-4" />
            </button>
            <button
              onClick={goToNextMatch}
              disabled={searchMatches.length === 0}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded disabled:opacity-30"
              title="Next match (Enter)"
            >
              <ChevronDownIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => {
                setSearchOpen(false);
                setSearchQuery('');
              }}
              className="p-1 hover:bg-gray-200 dark:hover:bg-gray-700 rounded"
              title="Close (Esc)"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredEvents.length} of {events.length} events
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSearchOpen(true);
                setTimeout(() => searchInputRef.current?.focus(), 0);
              }}
              className="flex items-center gap-1.5 px-2 py-1 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-md"
              title="Search (Ctrl+F)"
            >
              <Search className="w-4 h-4" />
              <span className="hidden sm:inline">Search</span>
            </button>

            <div className="relative">
              <button
                onClick={() => setFilterOpen(!filterOpen)}
                className="flex items-center gap-2 px-2 py-1 text-sm border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <Filter className="w-4 h-4" />
                Filter
                <ChevronDown className="w-4 h-4" />
              </button>

            {filterOpen ? (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-md shadow-lg z-10">
                <div className="p-2 border-b border-gray-200 dark:border-gray-700 flex gap-2">
                  <button
                    onClick={selectAll}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    All
                  </button>
                  <button
                    onClick={selectNone}
                    className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
                  >
                    None
                  </button>
                </div>
                <div className="p-2 space-y-1">
                  {EVENT_TYPES.map((type) => (
                    <label
                      key={type.value}
                      className="flex items-center gap-2 px-2 py-1 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedTypes.has(type.value)}
                        onChange={() => toggleType(type.value)}
                        className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                      />
                      <span className={`w-2 h-2 rounded-full ${type.color}`} />
                      <span className="text-sm">{type.label}</span>
                    </label>
                  ))}
                </div>
              </div>
            ) : null}
            </div>
          </div>
        </div>
      </div>

      <div ref={parentRef} className="flex-1 overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const event = filteredEvents[virtualItem.index];
            const isMatch = matchingEventIndices.has(virtualItem.index);
            const isCurrentMatch = virtualItem.index === currentMatchEventIndex;
            return (
              <div
                key={virtualItem.key}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  transform: `translateY(${virtualItem.start}px)`,
                }}
                data-index={virtualItem.index}
                ref={virtualizer.measureElement}
              >
                <div className={`px-4 ${isCurrentMatch ? 'bg-yellow-100 dark:bg-yellow-900/30' : isMatch ? 'bg-yellow-50 dark:bg-yellow-900/10' : ''}`}>
                  <TimelineEvent event={event} searchQuery={searchQuery} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

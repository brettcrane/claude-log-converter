import { useRef, useState } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Filter, ChevronDown } from 'lucide-react';
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
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(['user', 'assistant', 'tool_use'])
  );

  const filteredEvents = events.filter((e) => selectedTypes.has(e.type));

  const virtualizer = useVirtualizer({
    count: filteredEvents.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

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

  return (
    <div className="flex flex-col h-full">
      <div className="flex-shrink-0 px-4 py-2 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            {filteredEvents.length} of {events.length} events
          </span>

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
                <div className="px-4">
                  <TimelineEvent event={event} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

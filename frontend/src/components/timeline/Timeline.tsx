import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { Filter, ChevronDown } from 'lucide-react';
import type { TimelineEvent as TimelineEventType, SessionDetail } from '@/services/types';
import { TimelineEvent } from './TimelineEvent';
import { EventGroup } from './EventGroup';
import { FloatingContextBadge } from './FloatingContextBadge';
import { Toast } from '@/components/ui/Toast';

// Represents either a single event or a group of events
type TimelineItem =
  | { type: 'single'; event: TimelineEventType; originalIndex: number }
  | { type: 'group'; events: TimelineEventType[]; groupType: 'tool_use' | 'tool_result'; toolName?: string; originalIndices: number[] };

// Group consecutive tool events together
function groupEvents(events: TimelineEventType[]): TimelineItem[] {
  const items: TimelineItem[] = [];
  let i = 0;

  while (i < events.length) {
    const event = events[i];

    // Only group tool_use and tool_result events
    if (event.type === 'tool_use' || event.type === 'tool_result') {
      const groupType = event.type;
      const toolName = event.type === 'tool_use' ? event.tool_name || undefined : undefined;
      const groupEvents: TimelineEventType[] = [event];
      const groupIndices: number[] = [i];

      // Look ahead for consecutive same-type events
      let j = i + 1;
      while (j < events.length) {
        const nextEvent = events[j];
        // For tool_use, group by same tool_name; for tool_result, just group consecutive results
        const shouldGroup =
          nextEvent.type === groupType &&
          (groupType === 'tool_result' || nextEvent.tool_name === toolName);

        if (shouldGroup) {
          groupEvents.push(nextEvent);
          groupIndices.push(j);
          j++;
        } else {
          break;
        }
      }

      // Only create a group if there are 2+ events
      if (groupEvents.length >= 2) {
        items.push({
          type: 'group',
          events: groupEvents,
          groupType,
          toolName,
          originalIndices: groupIndices,
        });
      } else {
        items.push({ type: 'single', event, originalIndex: i });
      }

      i = j;
    } else {
      // User, assistant, thinking - keep as single items
      items.push({ type: 'single', event, originalIndex: i });
      i++;
    }
  }

  return items;
}

interface TimelineProps {
  events: TimelineEventType[];
  session: SessionDetail;
}

const EVENT_TYPES = [
  { value: 'user', label: 'User', color: 'bg-blue-500' },
  { value: 'assistant', label: 'Assistant', color: 'bg-purple-500' },
  { value: 'tool_use', label: 'Tool Use', color: 'bg-gray-500' },
  { value: 'tool_result', label: 'Tool Result', color: 'bg-gray-400' },
  { value: 'thinking', label: 'Thinking', color: 'bg-gray-300' },
];

export function Timeline({ events, session }: TimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedTypes, setSelectedTypes] = useState<Set<string>>(
    new Set(['user', 'assistant', 'tool_use'])
  );

  // Active event tracking for floating badge and rail highlight
  const [activeEventType, setActiveEventType] = useState<string | null>(null);
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const filteredEvents = events.filter((e) => selectedTypes.has(e.type));

  // Group consecutive tool events
  const groupedItems = useMemo(() => groupEvents(filteredEvents), [filteredEvents]);

  const virtualizer = useVirtualizer({
    count: groupedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  // Track active event based on scroll position
  useEffect(() => {
    const scrollContainer = parentRef.current;
    if (!scrollContainer) return;

    const updateActiveItem = () => {
      // Get the container's position relative to viewport
      const containerRect = scrollContainer.getBoundingClientRect();
      // Calculate target position: middle of viewport, relative to container's top
      const viewportMiddle = window.innerHeight / 2;
      const targetPosition = viewportMiddle - containerRect.top;

      // Find the item that contains this position
      const virtualItems = virtualizer.getVirtualItems();
      const sortedItems = [...virtualItems].sort((a, b) => a.start - b.start);

      for (const virtualItem of sortedItems) {
        if (virtualItem.start <= targetPosition && virtualItem.end > targetPosition) {
          const item = groupedItems[virtualItem.index];
          if (item) {
            const eventType = item.type === 'single' ? item.event.type : item.groupType;
            setActiveItemIndex(virtualItem.index);
            setActiveEventType(eventType);
          }
          return;
        }
      }

      // If no item contains the target position, find the closest item
      if (sortedItems.length > 0) {
        let closestItem = sortedItems[0];
        let closestDistance = Math.abs(targetPosition - (closestItem.start + closestItem.end) / 2);

        for (const virtualItem of sortedItems) {
          const itemCenter = (virtualItem.start + virtualItem.end) / 2;
          const distance = Math.abs(targetPosition - itemCenter);
          if (distance < closestDistance) {
            closestDistance = distance;
            closestItem = virtualItem;
          }
        }

        const item = groupedItems[closestItem.index];
        if (item) {
          setActiveItemIndex(closestItem.index);
          setActiveEventType(item.type === 'single' ? item.event.type : item.groupType);
        }
      }
    };

    // Initial update
    updateActiveItem();

    // Listen to scroll events
    scrollContainer.addEventListener('scroll', updateActiveItem, { passive: true });
    window.addEventListener('resize', updateActiveItem, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', updateActiveItem);
      window.removeEventListener('resize', updateActiveItem);
    };
  }, [groupedItems, virtualizer]);

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

  const handleCopySuccess = useCallback(() => {
    setToastMessage('Event copied to clipboard');
    setToastType('success');
    setShowToast(true);
  }, []);

  const handleCopyError = useCallback(() => {
    setToastMessage('Failed to copy event');
    setToastType('error');
    setShowToast(true);
  }, []);

  return (
    <div className="flex flex-col h-full min-h-0">
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

      <div ref={parentRef} className="flex-1 min-h-0 overflow-auto">
        <div
          style={{
            height: `${virtualizer.getTotalSize()}px`,
            width: '100%',
            position: 'relative',
          }}
        >
          {virtualizer.getVirtualItems().map((virtualItem) => {
            const item = groupedItems[virtualItem.index];

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
                {item.type === 'single' ? (
                  <div className="px-4">
                    <TimelineEvent
                      event={item.event}
                      session={session}
                      isActive={virtualItem.index === activeItemIndex}
                      onCopySuccess={handleCopySuccess}
                      onCopyError={handleCopyError}
                    />
                  </div>
                ) : (
                  <EventGroup
                    events={item.events}
                    session={session}
                    groupType={item.groupType}
                    toolName={item.toolName}
                    isActive={virtualItem.index === activeItemIndex}
                    onCopySuccess={handleCopySuccess}
                    onCopyError={handleCopyError}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      <FloatingContextBadge eventType={activeEventType} />

      {showToast && (
        <Toast
          message={toastMessage}
          type={toastType}
          onClose={() => setShowToast(false)}
        />
      )}
    </div>
  );
}

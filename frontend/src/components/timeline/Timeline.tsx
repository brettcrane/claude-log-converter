import { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { TimelineEvent as TimelineEventType, SessionDetail } from '@/services/types';
import { TimelineEvent } from './TimelineEvent';
import { EventGroup } from './EventGroup';
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
  selectedTypes: Set<string>;
  onActiveIndexChange?: (index: number | null) => void;
  onActiveEventTypeChange?: (type: string | null) => void;
}

export function Timeline({ events, session, selectedTypes, onActiveIndexChange, onActiveEventTypeChange }: TimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Active event tracking for TOC
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
  // Uses both container and window scroll to handle different layout scenarios
  useEffect(() => {
    const scrollContainer = parentRef.current;
    if (!scrollContainer) return;

    const updateActiveItem = () => {
      // Detect which scroll mechanism is in use:
      // If container can scroll (scrollHeight > clientHeight), use container scroll
      // Otherwise, use window scroll and calculate relative to container position
      const containerCanScroll = scrollContainer.scrollHeight > scrollContainer.clientHeight;

      let targetPosition: number;

      if (containerCanScroll && scrollContainer.scrollTop > 0) {
        // Container is scrolling - use container scroll position
        const scrollTop = scrollContainer.scrollTop;
        const clientHeight = scrollContainer.clientHeight;
        targetPosition = scrollTop + clientHeight / 2;
      } else {
        // Window is scrolling - calculate position relative to container
        const containerRect = scrollContainer.getBoundingClientRect();
        const viewportMiddle = window.innerHeight / 2;
        targetPosition = viewportMiddle - containerRect.top;
      }

      // Find the item that contains this position
      const virtualItems = virtualizer.getVirtualItems();
      const sortedItems = [...virtualItems].sort((a, b) => a.start - b.start);

      for (const virtualItem of sortedItems) {
        if (virtualItem.start <= targetPosition && virtualItem.end > targetPosition) {
          const item = groupedItems[virtualItem.index];
          if (item) {
            setActiveItemIndex(virtualItem.index);
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
        }
      }
    };

    // Initial update
    updateActiveItem();

    // Listen to both container and window scroll to handle all scenarios
    scrollContainer.addEventListener('scroll', updateActiveItem, { passive: true });
    window.addEventListener('scroll', updateActiveItem, { passive: true });
    window.addEventListener('resize', updateActiveItem, { passive: true });
    return () => {
      scrollContainer.removeEventListener('scroll', updateActiveItem);
      window.removeEventListener('scroll', updateActiveItem);
      window.removeEventListener('resize', updateActiveItem);
    };
  }, [groupedItems, virtualizer]);

  // Notify parent of active index changes
  useEffect(() => {
    if (onActiveIndexChange) {
      onActiveIndexChange(activeItemIndex);
    }
  }, [activeItemIndex, onActiveIndexChange]);

  // Notify parent of active event type changes
  useEffect(() => {
    if (onActiveEventTypeChange && activeItemIndex !== null) {
      const item = groupedItems[activeItemIndex];
      if (item) {
        const eventType = item.type === 'single' ? item.event.type : item.groupType;
        onActiveEventTypeChange(eventType);
      }
    } else if (onActiveEventTypeChange) {
      onActiveEventTypeChange(null);
    }
  }, [activeItemIndex, groupedItems, onActiveEventTypeChange]);

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

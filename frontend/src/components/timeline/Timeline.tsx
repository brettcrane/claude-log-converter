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
  scrollToEventId?: string;
  onActiveEventTypeChange?: (type: string | null) => void;
  onTargetEventFiltered?: (filtered: boolean) => void;
}

export function Timeline({ events, session, selectedTypes, scrollToEventId, onActiveEventTypeChange, onTargetEventFiltered }: TimelineProps) {
  const parentRef = useRef<HTMLDivElement>(null);

  // Active event tracking for header badge
  const [activeItemIndex, setActiveItemIndex] = useState<number | null>(null);

  // Highlighted event for bookmark jumps (clears after animation)
  const [highlightedEventId, setHighlightedEventId] = useState<string | null>(null);
  const scrolledRef = useRef(false);

  // Toast state
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastType, setToastType] = useState<'success' | 'error'>('success');

  const filteredEvents = events.filter((e) => selectedTypes.has(e.type));

  // Group consecutive tool events
  const groupedItems = useMemo(() => groupEvents(filteredEvents), [filteredEvents]);

  // Check if target event exists in unfiltered events (to detect if it's filtered out)
  const targetEventInAllEvents = useMemo(() => {
    if (!scrollToEventId) return null;
    return events.find(e => e.id === scrollToEventId) || null;
  }, [scrollToEventId, events]);

  // Check if target event is in filtered events
  const targetEventInFilteredEvents = useMemo(() => {
    if (!scrollToEventId) return null;
    return filteredEvents.find(e => e.id === scrollToEventId) || null;
  }, [scrollToEventId, filteredEvents]);

  // Find the grouped item index containing the target event
  const findGroupedItemIndex = useCallback((eventId: string): number => {
    return groupedItems.findIndex(item => {
      if (item.type === 'single') {
        return item.event.id === eventId;
      } else {
        return item.events.some(e => e.id === eventId);
      }
    });
  }, [groupedItems]);

  const virtualizer = useVirtualizer({
    count: groupedItems.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 150,
    overscan: 5,
  });

  // Handle scroll-to-event when scrollToEventId is provided
  useEffect(() => {
    console.log('[Timeline scroll] scrollToEventId:', scrollToEventId);
    console.log('[Timeline scroll] events count:', events.length);
    console.log('[Timeline scroll] event IDs sample:', events.slice(0, 5).map(e => e.id));

    if (!scrollToEventId) {
      scrolledRef.current = false;
      return;
    }

    console.log('[Timeline scroll] targetEventInAllEvents:', targetEventInAllEvents);
    console.log('[Timeline scroll] targetEventInFilteredEvents:', targetEventInFilteredEvents);

    // Notify parent if target event is filtered out
    const isFiltered = targetEventInAllEvents && !targetEventInFilteredEvents;
    console.log('[Timeline scroll] isFiltered:', isFiltered);

    if (onTargetEventFiltered) {
      onTargetEventFiltered(!!isFiltered);
    }

    // If event is filtered out, don't scroll
    if (isFiltered || !targetEventInFilteredEvents) {
      console.log('[Timeline scroll] Skipping - event filtered or not found');
      return;
    }

    // Find the grouped item containing this event
    const targetIndex = findGroupedItemIndex(scrollToEventId);
    console.log('[Timeline scroll] targetIndex:', targetIndex);

    if (targetIndex === -1) {
      console.log('[Timeline scroll] Event not found in grouped items');
      return;
    }

    // Only scroll once per scrollToEventId
    if (scrolledRef.current) {
      console.log('[Timeline scroll] Already scrolled, skipping');
      return;
    }
    scrolledRef.current = true;

    console.log('[Timeline scroll] Scrolling to index:', targetIndex);

    // Set highlight
    setHighlightedEventId(scrollToEventId);

    // Smart scroll that accounts for variable header heights
    const performScroll = () => {
      const targetElement = document.querySelector(`[data-event-id="${scrollToEventId}"]`);

      if (!targetElement) {
        console.log('[Timeline scroll] Element not found, using virtualizer');
        virtualizer.scrollToIndex(targetIndex, { align: 'start', behavior: 'auto' });

        // Try again after virtualizer renders
        setTimeout(() => {
          const element = document.querySelector(`[data-event-id="${scrollToEventId}"]`);
          if (element) {
            scrollElementIntoPosition(element as HTMLElement);
          }
        }, 150);
        return;
      }

      scrollElementIntoPosition(targetElement as HTMLElement);
    };

    // Scroll element to proper position below headers
    const scrollElementIntoPosition = (element: HTMLElement) => {
      // Get element's absolute position in document
      const rect = element.getBoundingClientRect();
      const absoluteTop = rect.top + window.scrollY;

      // Find the session detail header (the flex-shrink-0 container with border-b)
      // This header contains project info, metadata, tabs, and filters
      const sessionHeader = document.querySelector('.flex-shrink-0.border-b.border-gray-200');

      let headerBottom = 200; // Safe default

      if (sessionHeader) {
        const headerRect = sessionHeader.getBoundingClientRect();
        // If header is visible (not scrolled past), use its bottom
        // Add the current scroll position to get absolute position
        if (headerRect.top >= -headerRect.height) {
          headerBottom = headerRect.bottom;
        }
      }

      // Also check for any sticky/fixed app-level headers
      const appHeader = document.querySelector('header');
      if (appHeader) {
        const appHeaderRect = appHeader.getBoundingClientRect();
        const style = window.getComputedStyle(appHeader);
        if (style.position === 'fixed' || style.position === 'sticky') {
          headerBottom = Math.max(headerBottom, appHeaderRect.bottom);
        }
      }

      // Calculate where to scroll - position element just below all headers
      const padding = 12; // Small padding below header
      const targetScrollY = absoluteTop - headerBottom - padding;

      console.log('[Timeline scroll] Positioning:', {
        absoluteTop,
        headerBottom,
        targetScrollY: Math.max(0, targetScrollY),
      });

      window.scrollTo({ top: Math.max(0, targetScrollY), behavior: 'auto' });

      // Double-check after scroll settles - the header might have changed
      requestAnimationFrame(() => {
        const newRect = element.getBoundingClientRect();
        const currentHeaderBottom = sessionHeader
          ? sessionHeader.getBoundingClientRect().bottom
          : 200;

        // If element is still under header, do a fine-tune adjustment
        if (newRect.top < currentHeaderBottom + padding) {
          const adjustment = (currentHeaderBottom + padding) - newRect.top;
          window.scrollBy({ top: -adjustment, behavior: 'auto' });
          console.log('[Timeline scroll] Fine-tune adjustment:', adjustment);
        }
      });
    };

    // Clear highlight after animation (2.5s)
    setTimeout(() => {
      setHighlightedEventId(null);
    }, 2500);

    // Give the component time to mount and render
    setTimeout(() => {
      performScroll();
    }, 100);
  }, [scrollToEventId, targetEventInAllEvents, targetEventInFilteredEvents, findGroupedItemIndex, virtualizer, onTargetEventFiltered]);

  // Re-notify parent when filters change (target might become filtered/unfiltered)
  useEffect(() => {
    if (!scrollToEventId || !onTargetEventFiltered) return;
    const isFiltered = targetEventInAllEvents && !targetEventInFilteredEvents;
    onTargetEventFiltered(!!isFiltered);
  }, [scrollToEventId, targetEventInAllEvents, targetEventInFilteredEvents, onTargetEventFiltered]);

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

      // Use a small offset from the top (where header ends) to detect the "current" event
      // This makes the header badge show what's at the top of visible content
      const TOP_OFFSET = 80; // pixels from top of scroll area

      let targetPosition: number;

      if (containerCanScroll && scrollContainer.scrollTop > 0) {
        // Container is scrolling - detect event near top of visible area
        targetPosition = scrollContainer.scrollTop + TOP_OFFSET;
      } else {
        // Window is scrolling - calculate position relative to container top
        const containerRect = scrollContainer.getBoundingClientRect();
        targetPosition = TOP_OFFSET - containerRect.top;
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
                      isHighlighted={item.event.id === highlightedEventId}
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
                    highlightedEventId={highlightedEventId || undefined}
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

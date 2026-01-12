import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, ArrowUp, User, Bot, Wrench, X } from 'lucide-react';
import type { TimelineEvent, SessionDetail } from '@/services/types';
import { formatTime } from '@/utils/formatters';

interface TOCItem {
  id: string;
  type: 'user' | 'assistant' | 'tool_group';
  title: string;
  timestamp: string;
  eventIndex: number;
  children?: TOCItem[];
}

interface TimelineTOCProps {
  events: TimelineEvent[];
  session: SessionDetail;
  selectedTypes: Set<string>;
  activeItemIndex: number | null;
  activeEventType: string | null;
  onNavigate: (eventIndex: number) => void;
  initialCollapsed?: boolean;
}

export function TimelineTOC({
  events,
  selectedTypes,
  activeItemIndex,
  activeEventType,
  onNavigate,
  initialCollapsed = false,
}: TimelineTOCProps) {
  const [isCollapsed, setIsCollapsed] = useState(initialCollapsed);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  // Generate TOC items from events
  const tocItems = useMemo(() => {
    const items: TOCItem[] = [];
    let i = 0;

    const filteredEvents = events.filter(e => selectedTypes.has(e.type));

    while (i < filteredEvents.length) {
      const event = filteredEvents[i];

      // Group consecutive tool events
      if (event.type === 'tool_use') {
        const groupChildren: TOCItem[] = [];
        const groupIndex = i;
        let toolCount = 0;

        // Collect tool_use + tool_result pairs
        while (i < filteredEvents.length && (filteredEvents[i].type === 'tool_use' || filteredEvents[i].type === 'tool_result')) {
          const e = filteredEvents[i];
          if (e.type === 'tool_use') {
            toolCount++;
            groupChildren.push({
              id: `event-${i}`,
              type: 'tool_group',
              title: e.tool_name || 'Tool',
              timestamp: formatTime(e.timestamp),
              eventIndex: i,
            });
          }
          i++;
        }

        items.push({
          id: `group-${groupIndex}`,
          type: 'tool_group',
          title: `Tools (${toolCount})`,
          timestamp: formatTime(event.timestamp),
          eventIndex: groupIndex,
          children: groupChildren,
        });
      } else if (event.type === 'user' || event.type === 'assistant') {
        // Extract first line or N characters as title
        let title = '';
        if (event.type === 'user' && event.content) {
          title = event.content.substring(0, 50);
        } else if (event.type === 'assistant' && event.content) {
          title = event.content.substring(0, 50);
        }

        if (title.length >= 50) title += '...';
        if (!title) title = event.type === 'user' ? 'User message' : 'Assistant message';

        items.push({
          id: `event-${i}`,
          type: event.type,
          title,
          timestamp: formatTime(event.timestamp),
          eventIndex: i,
        });
        i++;
      } else {
        i++; // Skip other types (thinking, etc.)
      }
    }

    return items;
  }, [events, selectedTypes]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups(prev => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  const scrollToTop = () => {
    onNavigate(0);
  };

  if (isCollapsed) {
    return (
      <div className="fixed right-4 top-1/2 -translate-y-1/2 z-40">
        <button
          onClick={() => setIsCollapsed(false)}
          className="p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
          title="Show table of contents"
          aria-label="Show table of contents"
        >
          <ChevronRight className="w-5 h-5 text-gray-600 dark:text-gray-400" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-80 flex-shrink-0 border-l border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 flex flex-col" aria-label="Table of contents">
      {/* Header with section indicator */}
      <div className="flex items-center justify-between p-3 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">Timeline</h2>
          {activeEventType && (
            <SectionIndicator type={activeEventType} />
          )}
        </div>
        <button
          onClick={() => setIsCollapsed(true)}
          className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
          title="Hide table of contents"
          aria-label="Hide table of contents"
        >
          <X className="w-4 h-4 text-gray-500 dark:text-gray-400" />
        </button>
      </div>

      {/* TOC Items */}
      <div className="flex-1 overflow-y-auto p-2">
        {tocItems.length > 0 ? (
          <nav>
            <ul className="space-y-1">
              {tocItems.map((item) => (
                <TOCItemComponent
                  key={item.id}
                  item={item}
                  isActive={item.eventIndex === activeItemIndex}
                  isExpanded={expandedGroups.has(item.id)}
                  activeItemIndex={activeItemIndex}
                  onToggle={() => toggleGroup(item.id)}
                  onNavigate={onNavigate}
                />
              ))}
            </ul>
          </nav>
        ) : (
          <div className="flex flex-col items-center justify-center h-32 text-gray-400 dark:text-gray-500">
            <Bot className="w-8 h-8 mb-2" />
            <p className="text-sm">No events to display</p>
          </div>
        )}
      </div>

      {/* Scroll to Top */}
      <div className="p-3 border-t border-gray-200 dark:border-gray-700">
        <button
          onClick={scrollToTop}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-md transition-colors"
        >
          <ArrowUp className="w-4 h-4" />
          Back to top
        </button>
      </div>
    </aside>
  );
}

interface TOCItemComponentProps {
  item: TOCItem;
  isActive: boolean;
  isExpanded: boolean;
  activeItemIndex: number | null;
  onToggle: () => void;
  onNavigate: (index: number) => void;
}

function TOCItemComponent({
  item,
  isActive,
  isExpanded,
  activeItemIndex,
  onToggle,
  onNavigate,
}: TOCItemComponentProps) {
  const getIcon = () => {
    switch (item.type) {
      case 'user':
        return <User className="w-4 h-4 text-blue-500" />;
      case 'assistant':
        return <Bot className="w-4 h-4 text-purple-500" />;
      case 'tool_group':
        return <Wrench className="w-4 h-4 text-gray-500" />;
    }
  };

  const hasChildren = item.children && item.children.length > 0;

  return (
    <li>
      <div
        className={`
          flex items-start gap-2 px-2 py-1.5 rounded-md cursor-pointer
          transition-all duration-150
          ${isActive
            ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 font-medium'
            : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
          }
        `}
        onClick={() => onNavigate(item.eventIndex)}
      >
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          {getIcon()}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="text-sm truncate" title={item.title}>{item.title}</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">{item.timestamp}</div>
        </div>

        {/* Expand/Collapse (if group) */}
        {hasChildren && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggle();
            }}
            className="flex-shrink-0 p-1 hover:bg-gray-200 dark:hover:bg-gray-600 rounded transition-colors"
            aria-label={isExpanded ? 'Collapse group' : 'Expand group'}
          >
            {isExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
          </button>
        )}
      </div>

      {/* Children (if expanded) */}
      {hasChildren && isExpanded && (
        <ul className="ml-6 mt-1 space-y-1 border-l border-gray-200 dark:border-gray-700 pl-2">
          {item.children!.map((child) => (
            <TOCItemComponent
              key={child.id}
              item={child}
              isActive={child.eventIndex === activeItemIndex}
              isExpanded={false}
              activeItemIndex={activeItemIndex}
              onToggle={() => {}}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      )}
    </li>
  );
}

// Section indicator badge shown in TOC header
function SectionIndicator({ type }: { type: string }) {
  const config = {
    user: { icon: <User className="w-3 h-3" />, label: 'User', bg: 'bg-blue-100 dark:bg-blue-900/40', text: 'text-blue-700 dark:text-blue-300' },
    assistant: { icon: <Bot className="w-3 h-3" />, label: 'Assistant', bg: 'bg-purple-100 dark:bg-purple-900/40', text: 'text-purple-700 dark:text-purple-300' },
    tool_use: { icon: <Wrench className="w-3 h-3" />, label: 'Tool', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-300' },
    tool_result: { icon: <Wrench className="w-3 h-3" />, label: 'Result', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' },
    thinking: { icon: <Bot className="w-3 h-3" />, label: 'Thinking', bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-600 dark:text-gray-400' },
  }[type];

  if (!config) return null;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${config.bg} ${config.text} transition-all duration-200`}>
      {config.icon}
      {config.label}
    </span>
  );
}

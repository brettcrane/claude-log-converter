import { Disclosure, Transition } from '@headlessui/react';
import { ChevronDown, ChevronRight, Wrench, FileText, FolderSearch, Terminal } from 'lucide-react';
import type { TimelineEvent as TimelineEventType, SessionDetail } from '@/services/types';
import { TimelineEvent } from './TimelineEvent';

interface EventGroupProps {
  events: TimelineEventType[];
  session: SessionDetail;
  groupType: 'tool_use' | 'tool_result';
  toolName?: string;
  isActive?: boolean;
  onCopySuccess?: () => void;
  onCopyError?: () => void;
}

// Get an appropriate icon for the tool type
function getToolIcon(toolName: string) {
  switch (toolName) {
    case 'Read':
      return FileText;
    case 'Glob':
    case 'Grep':
      return FolderSearch;
    case 'Bash':
      return Terminal;
    default:
      return Wrench;
  }
}

// Generate a summary for the group
function getGroupSummary(events: TimelineEventType[], groupType: string, toolName?: string): string {
  const count = events.length;

  if (groupType === 'tool_result') {
    return `${count} tool results`;
  }

  if (toolName) {
    switch (toolName) {
      case 'Read':
        return `${count} file reads`;
      case 'Write':
        return `${count} file writes`;
      case 'Edit':
        return `${count} file edits`;
      case 'Bash':
        return `${count} commands`;
      case 'Glob':
        return `${count} file searches`;
      case 'Grep':
        return `${count} content searches`;
      case 'Task':
        return `${count} agent tasks`;
      default:
        return `${count} ${toolName} calls`;
    }
  }

  return `${count} tool calls`;
}

// Get file paths from events for preview
function getFilePaths(events: TimelineEventType[]): string[] {
  const paths: string[] = [];
  for (const event of events) {
    if (event.tool_input) {
      const filePath = event.tool_input.file_path as string | undefined;
      if (filePath) {
        // Extract just the filename
        const parts = filePath.split('/');
        paths.push(parts[parts.length - 1]);
      }
    }
    if (paths.length >= 3) break; // Limit preview
  }
  return paths;
}

export function EventGroup({ events, session, groupType, toolName, isActive = false, onCopySuccess, onCopyError }: EventGroupProps) {
  const Icon = toolName ? getToolIcon(toolName) : Wrench;
  const summary = getGroupSummary(events, groupType, toolName);
  const filePaths = groupType === 'tool_use' ? getFilePaths(events) : [];

  return (
    <div className="px-4">
      <div
        className={`border-l-4 border-l-gray-400 pl-4 py-3 transition-all duration-200 ${
          isActive ? 'border-l-8 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/30' : ''
        }`}
      >
        <Disclosure>
          {({ open }) => (
            <>
              <Disclosure.Button className="w-full flex items-center gap-3 hover:bg-gray-50 dark:hover:bg-gray-800/50 rounded px-2 py-1 -ml-2 text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1">
                {open ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 flex-shrink-0 transition-transform" />
                )}
                <Icon className="w-5 h-5 text-gray-500 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {summary}
                  </span>
                  {filePaths.length > 0 && (
                    <span className="ml-2 text-xs text-gray-500 dark:text-gray-400 truncate">
                      {filePaths.join(', ')}
                      {events.length > filePaths.length && `, +${events.length - filePaths.length} more`}
                    </span>
                  )}
                </div>
              </Disclosure.Button>

              <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform opacity-0 -translate-y-1"
                enterTo="transform opacity-100 translate-y-0"
                leave="transition duration-75 ease-in"
                leaveFrom="transform opacity-100 translate-y-0"
                leaveTo="transform opacity-0 -translate-y-1"
              >
                <Disclosure.Panel className="mt-2 space-y-2 ml-6">
                  {events.map((event, index) => (
                    <div key={index} className="border-l-2 border-gray-200 dark:border-gray-700 pl-3">
                      <TimelineEvent
                        event={event}
                        session={session}
                        onCopySuccess={onCopySuccess}
                        onCopyError={onCopyError}
                      />
                    </div>
                  ))}
                </Disclosure.Panel>
              </Transition>
            </>
          )}
        </Disclosure>
      </div>
    </div>
  );
}

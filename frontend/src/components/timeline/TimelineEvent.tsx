import { useState } from 'react';
import { User, Bot, Wrench, ChevronDown, ChevronRight, Clock } from 'lucide-react';
import type { TimelineEvent as TimelineEventType } from '@/services/types';
import { formatTime } from '@/utils/formatters';

interface TimelineEventProps {
  event: TimelineEventType;
}

export function TimelineEvent({ event }: TimelineEventProps) {
  const [expanded, setExpanded] = useState(false);

  const getEventIcon = () => {
    switch (event.type) {
      case 'user':
        return <User className="w-5 h-5 text-blue-600 dark:text-blue-400" />;
      case 'assistant':
        return <Bot className="w-5 h-5 text-purple-600 dark:text-purple-400" />;
      case 'tool_use':
      case 'tool_result':
        return <Wrench className="w-5 h-5 text-gray-600 dark:text-gray-400" />;
      case 'thinking':
        return <Bot className="w-5 h-5 text-gray-400" />;
      default:
        return null;
    }
  };

  const getEventColor = () => {
    switch (event.type) {
      case 'user':
        return 'border-l-blue-500';
      case 'assistant':
        return 'border-l-purple-500';
      case 'tool_use':
      case 'tool_result':
        return 'border-l-gray-400';
      case 'thinking':
        return 'border-l-gray-300';
      default:
        return 'border-l-gray-300';
    }
  };

  const renderContent = () => {
    if (event.type === 'tool_use') {
      return (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 w-full text-left"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
              {event.tool_name}
            </span>
            {event.files_affected.length > 0 ? (
              <span className="text-xs text-gray-500 dark:text-gray-400">
                ({event.files_affected.length} files)
              </span>
            ) : null}
          </button>

          {expanded && event.tool_input ? (
            <div className="mt-2 ml-6">
              <ToolInputDisplay toolName={event.tool_name!} input={event.tool_input} />
            </div>
          ) : null}
        </div>
      );
    }

    if (event.type === 'tool_result') {
      return (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 w-full text-left"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm text-gray-600 dark:text-gray-400">Tool Result</span>
          </button>

          {expanded && event.content ? (
            <div className="mt-2 ml-6">
              <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto max-h-64 overflow-y-auto">
                {event.content.length > 2000
                  ? event.content.slice(0, 2000) + '\n... [truncated]'
                  : event.content}
              </pre>
            </div>
          ) : null}
        </div>
      );
    }

    if (event.type === 'thinking') {
      return (
        <div>
          <button
            onClick={() => setExpanded(!expanded)}
            className="flex items-center gap-2 w-full text-left"
          >
            {expanded ? (
              <ChevronDown className="w-4 h-4 text-gray-400" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-400" />
            )}
            <span className="text-sm text-gray-500 dark:text-gray-400 italic">Thinking...</span>
          </button>

          {expanded && event.content ? (
            <div className="mt-2 ml-6">
              <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                {event.content.length > 2000
                  ? event.content.slice(0, 2000) + '\n... [truncated]'
                  : event.content}
              </div>
            </div>
          ) : null}
        </div>
      );
    }

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <div className="whitespace-pre-wrap text-gray-900 dark:text-gray-100">
          {event.content}
        </div>
      </div>
    );
  };

  return (
    <div className={`border-l-4 ${getEventColor()} pl-4 py-3`}>
      <div className="flex items-center gap-2 mb-2">
        {getEventIcon()}
        <span className="font-medium capitalize text-gray-900 dark:text-white text-sm">
          {event.type === 'tool_use' ? 'Tool' : event.type === 'tool_result' ? 'Result' : event.type}
        </span>
        {event.timestamp ? (
          <span className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400">
            <Clock className="w-3 h-3" />
            {formatTime(event.timestamp)}
          </span>
        ) : null}
      </div>
      {renderContent()}
    </div>
  );
}

function ToolInputDisplay({ toolName, input }: { toolName: string; input: Record<string, unknown> }) {
  if (toolName === 'Bash') {
    return (
      <div>
        {input.description ? (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-2 italic">
            {String(input.description)}
          </p>
        ) : null}
        <pre className="text-sm bg-gray-900 text-green-400 p-3 rounded overflow-x-auto">
          $ {String(input.command || '')}
        </pre>
      </div>
    );
  }

  if (toolName === 'Read') {
    return (
      <div className="text-sm">
        <span className="text-gray-600 dark:text-gray-400">Reading: </span>
        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
          {String(input.file_path || '')}
        </code>
      </div>
    );
  }

  if (toolName === 'Write') {
    const content = String(input.content || '');
    return (
      <div>
        <div className="text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Writing: </span>
          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
            {String(input.file_path || '')}
          </code>
        </div>
        <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto max-h-48 overflow-y-auto">
          {content.length > 1000 ? content.slice(0, 1000) + '\n... [truncated]' : content}
        </pre>
      </div>
    );
  }

  if (toolName === 'Edit') {
    const oldStr = String(input.old_string || '');
    const newStr = String(input.new_string || '');
    return (
      <div>
        <div className="text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Editing: </span>
          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
            {String(input.file_path || '')}
          </code>
        </div>
        <pre className="text-xs p-3 rounded overflow-x-auto bg-gray-100 dark:bg-gray-800">
          <span className="text-red-600 dark:text-red-400">- {oldStr.slice(0, 200)}{oldStr.length > 200 ? '...' : ''}</span>
          {'\n'}
          <span className="text-green-600 dark:text-green-400">+ {newStr.slice(0, 200)}{newStr.length > 200 ? '...' : ''}</span>
        </pre>
      </div>
    );
  }

  if (toolName === 'Glob' || toolName === 'Grep') {
    return (
      <div className="text-sm">
        <span className="text-gray-600 dark:text-gray-400">Pattern: </span>
        <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
          {String(input.pattern || '')}
        </code>
        {input.path ? (
          <>
            <span className="text-gray-600 dark:text-gray-400"> in </span>
            <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
              {String(input.path)}
            </code>
          </>
        ) : null}
      </div>
    );
  }

  return (
    <pre className="text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-x-auto">
      {JSON.stringify(input, null, 2)}
    </pre>
  );
}

import { useState } from 'react';
import { Disclosure, Transition } from '@headlessui/react';
import { User, Bot, Wrench, ChevronDown, ChevronRight, Clock, Copy } from 'lucide-react';
import type { TimelineEvent as TimelineEventType, SessionDetail } from '@/services/types';
import { formatTime } from '@/utils/formatters';
import { MarkdownContent } from '@/components/ui/MarkdownContent';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { formatEventAsMarkdown, copyToClipboard } from '@/utils/eventFormatter';
import { BookmarkButton } from '@/components/bookmarks/BookmarkButton';
import { BookmarkBadge } from '@/components/bookmarks/BookmarkBadge';
import { useBookmarkStore } from '@/stores/bookmarkStore';

interface TimelineEventProps {
  event: TimelineEventType;
  session: SessionDetail;
  isActive?: boolean;
  isHighlighted?: boolean;
  onCopySuccess?: () => void;
  onCopyError?: () => void;
}

export function TimelineEvent({ event, session, isActive = false, isHighlighted = false, onCopySuccess, onCopyError }: TimelineEventProps) {
  const [copying, setCopying] = useState(false);
  const bookmarkStore = useBookmarkStore();
  const bookmark = bookmarkStore.bookmarksByEventId.get(`${session.session_id}:${event.id}`);

  const handleCopy = async () => {
    setCopying(true);
    const markdown = formatEventAsMarkdown(event);
    const success = await copyToClipboard(markdown);

    if (success && onCopySuccess) {
      onCopySuccess();
    } else if (!success && onCopyError) {
      onCopyError();
    }

    // Brief delay to show the copying state
    setTimeout(() => setCopying(false), 500);
  };

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
        <Disclosure>
          {({ open }) => (
            <div>
              <Disclosure.Button className="flex items-center gap-2 w-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded">
                {open ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform" />
                )}
                <span className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                  {event.tool_name}
                </span>
                {event.files_affected.length > 0 ? (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({event.files_affected.length} files)
                  </span>
                ) : null}
              </Disclosure.Button>

              <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform opacity-0 -translate-y-1"
                enterTo="transform opacity-100 translate-y-0"
                leave="transition duration-75 ease-in"
                leaveFrom="transform opacity-100 translate-y-0"
                leaveTo="transform opacity-0 -translate-y-1"
              >
                <Disclosure.Panel className="mt-2 ml-6">
                  {event.tool_input && (
                    <ToolInputDisplay toolName={event.tool_name!} input={event.tool_input} />
                  )}
                </Disclosure.Panel>
              </Transition>
            </div>
          )}
        </Disclosure>
      );
    }

    if (event.type === 'tool_result') {
      const displayContent = event.content && event.content.length > 2000
        ? event.content.slice(0, 2000) + '\n... [truncated]'
        : event.content || '';
      return (
        <Disclosure>
          {({ open }) => (
            <div>
              <Disclosure.Button className="flex items-center gap-2 w-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded">
                {open ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform" />
                )}
                <span className="text-sm text-gray-600 dark:text-gray-400">Tool Result</span>
              </Disclosure.Button>

              <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform opacity-0 -translate-y-1"
                enterTo="transform opacity-100 translate-y-0"
                leave="transition duration-75 ease-in"
                leaveFrom="transform opacity-100 translate-y-0"
                leaveTo="transform opacity-0 -translate-y-1"
              >
                <Disclosure.Panel className="mt-2 ml-6 max-h-64 overflow-y-auto rounded">
                  {event.content && <CodeBlock code={displayContent} className="text-xs" />}
                </Disclosure.Panel>
              </Transition>
            </div>
          )}
        </Disclosure>
      );
    }

    if (event.type === 'thinking') {
      return (
        <Disclosure>
          {({ open }) => (
            <div>
              <Disclosure.Button className="flex items-center gap-2 w-full text-left focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-1 rounded">
                {open ? (
                  <ChevronDown className="w-4 h-4 text-gray-400 transition-transform" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-gray-400 transition-transform" />
                )}
                <span className="text-sm text-gray-500 dark:text-gray-400 italic">Thinking...</span>
              </Disclosure.Button>

              <Transition
                enter="transition duration-100 ease-out"
                enterFrom="transform opacity-0 -translate-y-1"
                enterTo="transform opacity-100 translate-y-0"
                leave="transition duration-75 ease-in"
                leaveFrom="transform opacity-100 translate-y-0"
                leaveTo="transform opacity-0 -translate-y-1"
              >
                <Disclosure.Panel className="mt-2 ml-6">
                  {event.content && (
                    <div className="text-sm text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {event.content.length > 2000
                        ? event.content.slice(0, 2000) + '\n... [truncated]'
                        : event.content}
                    </div>
                  )}
                </Disclosure.Panel>
              </Transition>
            </div>
          )}
        </Disclosure>
      );
    }

    return (
      <div className="prose prose-sm dark:prose-invert max-w-none">
        <MarkdownContent
          content={event.content || ''}
          className="text-gray-900 dark:text-gray-100"
        />
      </div>
    );
  };

  // Highlight animation for bookmark jumps
  const highlightStyles = isHighlighted ? {
    animation: 'bookmark-highlight 2.5s ease-out forwards',
  } : {};

  return (
    <div
      data-event-id={event.id}
      className={`group border-l-4 ${getEventColor()} pl-4 py-3 transition-all duration-200 rounded-r-lg ${
        isActive ? 'border-l-8 bg-gradient-to-r from-gray-50/50 to-transparent dark:from-gray-800/30' : ''
      } ${isHighlighted ? 'ring-2 ring-amber-400/60 dark:ring-amber-500/50 bg-amber-50/30 dark:bg-amber-900/10' : ''}`}
      style={highlightStyles}
    >
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
        {bookmark && <BookmarkBadge bookmark={bookmark} />}
        <div className="ml-auto flex items-center gap-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity">
          <BookmarkButton event={event} session={session} />
          <button
            onClick={handleCopy}
            disabled={copying}
            className="p-1 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors disabled:opacity-50"
            title="Copy event to clipboard"
            aria-label="Copy event to clipboard"
          >
            <Copy className={`w-4 h-4 ${copying ? 'text-green-500' : 'text-gray-400'}`} />
          </button>
        </div>
      </div>
      {renderContent()}
    </div>
  );
}

// Infer language from file extension
function getLanguageFromPath(filePath: string): string | undefined {
  const ext = filePath.split('.').pop()?.toLowerCase();
  const extMap: Record<string, string> = {
    js: 'javascript',
    jsx: 'jsx',
    ts: 'typescript',
    tsx: 'tsx',
    py: 'python',
    rb: 'ruby',
    go: 'go',
    rs: 'rust',
    java: 'java',
    kt: 'kotlin',
    swift: 'swift',
    c: 'c',
    cpp: 'cpp',
    h: 'c',
    hpp: 'cpp',
    cs: 'csharp',
    php: 'php',
    html: 'html',
    htm: 'html',
    css: 'css',
    scss: 'scss',
    sass: 'sass',
    less: 'less',
    json: 'json',
    yaml: 'yaml',
    yml: 'yaml',
    xml: 'xml',
    md: 'markdown',
    sql: 'sql',
    sh: 'bash',
    bash: 'bash',
    zsh: 'bash',
    fish: 'bash',
    ps1: 'powershell',
    dockerfile: 'docker',
    toml: 'toml',
    ini: 'ini',
    cfg: 'ini',
    env: 'bash',
    graphql: 'graphql',
    gql: 'graphql',
    vue: 'vue',
    svelte: 'svelte',
  };
  return ext ? extMap[ext] : undefined;
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
    const filePath = String(input.file_path || '');
    const language = getLanguageFromPath(filePath);
    const displayContent = content.length > 1000 ? content.slice(0, 1000) + '\n... [truncated]' : content;
    return (
      <div>
        <div className="text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Writing: </span>
          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
            {filePath}
          </code>
        </div>
        <div className="max-h-48 overflow-y-auto rounded">
          <CodeBlock code={displayContent} language={language} className="text-xs" />
        </div>
      </div>
    );
  }

  if (toolName === 'Edit') {
    const oldStr = String(input.old_string || '');
    const newStr = String(input.new_string || '');
    const filePath = String(input.file_path || '');
    const language = getLanguageFromPath(filePath);
    const oldDisplay = oldStr.length > 500 ? oldStr.slice(0, 500) + '\n... [truncated]' : oldStr;
    const newDisplay = newStr.length > 500 ? newStr.slice(0, 500) + '\n... [truncated]' : newStr;
    return (
      <div>
        <div className="text-sm mb-2">
          <span className="text-gray-600 dark:text-gray-400">Editing: </span>
          <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded">
            {filePath}
          </code>
        </div>
        <div className="space-y-2">
          <div className="border-l-4 border-red-500 pl-2">
            <div className="text-xs text-red-600 dark:text-red-400 font-medium mb-1">Removed:</div>
            <div className="max-h-32 overflow-y-auto rounded">
              <CodeBlock code={oldDisplay} language={language} className="text-xs" />
            </div>
          </div>
          <div className="border-l-4 border-green-500 pl-2">
            <div className="text-xs text-green-600 dark:text-green-400 font-medium mb-1">Added:</div>
            <div className="max-h-32 overflow-y-auto rounded">
              <CodeBlock code={newDisplay} language={language} className="text-xs" />
            </div>
          </div>
        </div>
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
    <CodeBlock code={JSON.stringify(input, null, 2)} language="json" className="text-xs" />
  );
}

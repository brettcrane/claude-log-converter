import { CodeBlock, InlineCode } from './CodeBlock';

interface MarkdownContentProps {
  content: string;
  className?: string;
  searchQuery?: string;
}

interface ContentPart {
  type: 'text' | 'codeblock' | 'inline-code';
  content: string;
  language?: string;
}

// Parse content into text and code block parts
function parseContent(content: string): ContentPart[] {
  const parts: ContentPart[] = [];

  // Regex to match fenced code blocks: ```lang\n...\n```
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  let lastIndex = 0;
  let match;

  while ((match = codeBlockRegex.exec(content)) !== null) {
    // Add text before this code block
    if (match.index > lastIndex) {
      const textBefore = content.slice(lastIndex, match.index);
      parts.push(...parseInlineCode(textBefore));
    }

    // Add the code block
    parts.push({
      type: 'codeblock',
      language: match[1] || undefined,
      content: match[2],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text after last code block
  if (lastIndex < content.length) {
    const remaining = content.slice(lastIndex);
    parts.push(...parseInlineCode(remaining));
  }

  return parts;
}

// Parse inline code (`code`) in text
function parseInlineCode(text: string): ContentPart[] {
  const parts: ContentPart[] = [];
  const inlineCodeRegex = /`([^`]+)`/g;

  let lastIndex = 0;
  let match;

  while ((match = inlineCodeRegex.exec(text)) !== null) {
    // Add text before this inline code
    if (match.index > lastIndex) {
      parts.push({
        type: 'text',
        content: text.slice(lastIndex, match.index),
      });
    }

    // Add the inline code
    parts.push({
      type: 'inline-code',
      content: match[1],
    });

    lastIndex = match.index + match[0].length;
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push({
      type: 'text',
      content: text.slice(lastIndex),
    });
  }

  return parts;
}

// Highlight search matches in text
function highlightMatches(text: string, query: string): React.ReactNode {
  if (!query.trim()) return text;

  const lowerText = text.toLowerCase();
  const lowerQuery = query.toLowerCase();
  const parts: React.ReactNode[] = [];
  let lastIndex = 0;
  let matchIndex = lowerText.indexOf(lowerQuery);
  let keyCounter = 0;

  while (matchIndex !== -1) {
    // Add text before match
    if (matchIndex > lastIndex) {
      parts.push(text.slice(lastIndex, matchIndex));
    }
    // Add highlighted match
    parts.push(
      <mark key={keyCounter++} className="bg-yellow-300 dark:bg-yellow-600 text-inherit rounded px-0.5">
        {text.slice(matchIndex, matchIndex + query.length)}
      </mark>
    );
    lastIndex = matchIndex + query.length;
    matchIndex = lowerText.indexOf(lowerQuery, lastIndex);
  }

  // Add remaining text
  if (lastIndex < text.length) {
    parts.push(text.slice(lastIndex));
  }

  return parts.length > 0 ? parts : text;
}

export function MarkdownContent({ content, className = '', searchQuery }: MarkdownContentProps) {
  const parts = parseContent(content);

  return (
    <div className={`${className}`}>
      {parts.map((part, index) => {
        if (part.type === 'codeblock') {
          return (
            <CodeBlock
              key={index}
              code={part.content}
              language={part.language}
              className="my-2"
            />
          );
        }

        if (part.type === 'inline-code') {
          return <InlineCode key={index}>{part.content}</InlineCode>;
        }

        // Regular text - preserve whitespace and highlight search matches
        return (
          <span key={index} className="whitespace-pre-wrap">
            {searchQuery ? highlightMatches(part.content, searchQuery) : part.content}
          </span>
        );
      })}
    </div>
  );
}

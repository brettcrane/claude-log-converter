import { CodeBlock, InlineCode } from './CodeBlock';

interface MarkdownContentProps {
  content: string;
  className?: string;
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

export function MarkdownContent({ content, className = '' }: MarkdownContentProps) {
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

        // Regular text - preserve whitespace
        return (
          <span key={index} className="whitespace-pre-wrap">
            {part.content}
          </span>
        );
      })}
    </div>
  );
}

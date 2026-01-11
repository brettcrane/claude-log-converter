import type { TimelineEvent } from '@/services/types';
import { formatTime } from './formatters';

/**
 * Formats a timeline event as markdown for copying to clipboard
 */
export function formatEventAsMarkdown(event: TimelineEvent): string {
  const parts: string[] = [];

  // Header with event type and timestamp
  const eventType = event.type === 'tool_use' ? 'Tool Use' :
                    event.type === 'tool_result' ? 'Tool Result' :
                    event.type.charAt(0).toUpperCase() + event.type.slice(1);

  parts.push(`## ${eventType}`);

  if (event.timestamp) {
    parts.push(`*${formatTime(event.timestamp)}*`);
  }

  parts.push(''); // Empty line

  // Format based on event type
  switch (event.type) {
    case 'user':
    case 'assistant':
      if (event.content) {
        parts.push(event.content);
      }
      break;

    case 'tool_use':
      if (event.tool_name) {
        parts.push(`**Tool:** \`${event.tool_name}\``);
        parts.push('');
      }

      if (event.tool_input) {
        parts.push('**Input:**');
        parts.push('```json');
        parts.push(JSON.stringify(event.tool_input, null, 2));
        parts.push('```');
      }

      if (event.files_affected && event.files_affected.length > 0) {
        parts.push('');
        parts.push('**Files Affected:**');
        event.files_affected.forEach(file => {
          parts.push(`- \`${file}\``);
        });
      }
      break;

    case 'tool_result':
      parts.push('**Result:**');
      if (event.content) {
        const isLikelyCode = event.content.includes('\n') ||
                            event.content.includes('{') ||
                            event.content.includes('[');

        if (isLikelyCode) {
          parts.push('```');
          // Truncate if too long
          const displayContent = event.content.length > 5000
            ? event.content.slice(0, 5000) + '\n... [truncated]'
            : event.content;
          parts.push(displayContent);
          parts.push('```');
        } else {
          parts.push(event.content);
        }
      }
      break;

    case 'thinking':
      if (event.content) {
        parts.push('*Thinking process:*');
        parts.push('');
        const displayContent = event.content.length > 5000
          ? event.content.slice(0, 5000) + '\n... [truncated]'
          : event.content;
        parts.push(displayContent);
      }
      break;
  }

  return parts.join('\n');
}

/**
 * Copies text to clipboard
 */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    } else {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      textArea.style.position = 'fixed';
      textArea.style.left = '-999999px';
      textArea.style.top = '-999999px';
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();

      const successful = document.execCommand('copy');
      document.body.removeChild(textArea);
      return successful;
    }
  } catch (err) {
    console.error('Failed to copy to clipboard:', err);
    return false;
  }
}

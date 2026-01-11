import { format, formatDistanceToNow, parseISO } from 'date-fns';

export function formatDateTime(isoString: string | null): string {
  if (!isoString) return '-';
  try {
    return format(parseISO(isoString), 'MMM d, yyyy HH:mm');
  } catch {
    return '-';
  }
}

export function formatDate(isoString: string | null): string {
  if (!isoString) return '-';
  try {
    return format(parseISO(isoString), 'MMM d, yyyy');
  } catch {
    return '-';
  }
}

export function formatTime(isoString: string | null): string {
  if (!isoString) return '';
  try {
    return format(parseISO(isoString), 'HH:mm:ss');
  } catch {
    return '';
  }
}

export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return '-';
  try {
    return formatDistanceToNow(parseISO(isoString), { addSuffix: true });
  } catch {
    return '-';
  }
}

export function formatDuration(seconds: number | null): string {
  if (seconds === null || seconds === undefined) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${secs}s`;
  }
  return `${secs}s`;
}

export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

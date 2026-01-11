import { Bookmark } from 'lucide-react';
import type { Bookmark as BookmarkType } from '@/services/types';

interface BookmarkBadgeProps {
  bookmark: BookmarkType;
}

const CATEGORY_COLORS: Record<string, string> = {
  general: 'bg-gray-500',
  important: 'bg-orange-500',
  reference: 'bg-green-500',
  bug: 'bg-red-500',
  question: 'bg-blue-500',
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'General',
  important: 'Important',
  reference: 'Reference',
  bug: 'Bug',
  question: 'Question',
};

export function BookmarkBadge({ bookmark }: BookmarkBadgeProps) {
  const color = CATEGORY_COLORS[bookmark.category] || CATEGORY_COLORS.general;
  const label = CATEGORY_LABELS[bookmark.category] || bookmark.category;

  return (
    <div
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs text-white ${color}`}
      title={bookmark.note || label}
    >
      <Bookmark className="w-3 h-3 fill-current" />
      <span>{label}</span>
    </div>
  );
}

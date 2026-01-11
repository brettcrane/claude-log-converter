import { Search, X } from 'lucide-react';
import { useSessionStore } from '@/stores/sessionStore';

export function SessionFilters() {
  const { filters, setFilters, fetchSessions } = useSessionStore();

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilters({ search: e.target.value || undefined });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchSessions();
  };

  const handleDateFromChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({ date_from: value ? `${value}T00:00:00` : undefined });
    fetchSessions();
  };

  const handleDateToChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setFilters({ date_to: value ? `${value}T23:59:59` : undefined });
    fetchSessions();
  };

  const clearFilters = () => {
    setFilters({
      search: undefined,
      date_from: undefined,
      date_to: undefined,
    });
    fetchSessions();
  };

  const hasActiveFilters = filters.search || filters.date_from || filters.date_to;

  return (
    <div className="flex flex-wrap gap-3 items-end">
      <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] max-w-md">
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          Search conversations
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search in messages..."
            value={filters.search || ''}
            onChange={handleSearchChange}
            className="w-full pl-9 pr-4 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
      </form>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          From
        </label>
        <input
          type="date"
          value={filters.date_from?.split('T')[0] || ''}
          onChange={handleDateFromChange}
          className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
          To
        </label>
        <input
          type="date"
          value={filters.date_to?.split('T')[0] || ''}
          onChange={handleDateToChange}
          className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      {hasActiveFilters ? (
        <button
          onClick={clearFilters}
          className="flex items-center gap-1 px-2 py-1.5 text-sm text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white"
        >
          <X className="w-4 h-4" />
          Clear
        </button>
      ) : null}
    </div>
  );
}

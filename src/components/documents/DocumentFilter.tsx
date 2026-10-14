import { Search } from 'lucide-react';
import type { DocumentStatus } from '../../types/document';

export interface DocumentFilterState {
  search: string;
  status: DocumentStatus | 'ALL';
}

const STATUS_OPTIONS: { value: DocumentFilterState['status']; label: string }[] = [
  { value: 'ALL', label: 'All statuses' },
  { value: 'PENDING', label: 'Pending' },
  { value: 'PROCESSING', label: 'Processing' },
  { value: 'INDEXED', label: 'Indexed' },
  { value: 'FAILED', label: 'Failed' },
  { value: 'REJECTED', label: 'Rejected' },
];

export function DocumentFilter({ value, onChange }: { value: DocumentFilterState; onChange: (next: DocumentFilterState) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div className="relative flex-1">
        <Search className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-[var(--color-text-muted)]" />
        <input
          type="search"
          placeholder="Search documents..."
          value={value.search}
          onChange={(e) => onChange({ ...value, search: e.target.value })}
          className="w-full rounded-lg border border-[var(--color-border)] bg-transparent py-1.5 pl-8 pr-3 text-sm outline-none
            focus:border-[var(--color-accent)]"
        />
      </div>
      <select
        value={value.status}
        onChange={(e) => onChange({ ...value, status: e.target.value as DocumentFilterState['status'] })}
        className="rounded-lg border border-[var(--color-border)] bg-transparent px-2 py-1.5 text-sm outline-none
          focus:border-[var(--color-accent)]"
      >
        {STATUS_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

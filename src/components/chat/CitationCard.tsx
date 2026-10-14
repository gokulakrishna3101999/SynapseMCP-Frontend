import { FileText } from 'lucide-react';
import type { Citation } from '../../types/chat';

export function CitationCard({ citation }: { citation: Citation }) {
  return (
    <div className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] bg-black/5 p-2.5 text-xs dark:bg-white/5">
      <span className="flex items-center gap-1 font-medium text-[var(--color-text)]">
        <FileText className="size-3.5 text-[var(--color-accent)]" />
        {citation.documentName}
      </span>
      <span className="text-[var(--color-text-muted)]">{(citation.similarityScore * 100).toFixed(0)}% match</span>
    </div>
  );
}

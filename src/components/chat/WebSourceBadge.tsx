import { Globe } from 'lucide-react';
import type { WebSource } from '../../types/chat';

export function WebSourceBadge({ source }: { source: WebSource }) {
  let hostname = source.url;
  try {
    hostname = new URL(source.url).hostname;
  } catch {
    // keep the raw URL if it's not a well-formed one
  }

  return (
    <a
      href={source.url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 rounded-full border border-[var(--color-border)] px-2.5 py-1 text-xs
        text-[var(--color-text-muted)] hover:border-[var(--color-accent)] hover:text-[var(--color-accent)]"
      title={source.title}
    >
      <Globe className="size-3.5" />
      {hostname}
    </a>
  );
}

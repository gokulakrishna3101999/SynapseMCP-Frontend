import { Loader2 } from 'lucide-react';

export function QueryRoutingIndicator() {
  return (
    <div className="flex items-center gap-2 text-xs text-[var(--color-text-muted)]">
      <Loader2 className="size-3.5 animate-spin" />
      Searching your knowledge base...
    </div>
  );
}

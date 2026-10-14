import { AlertCircle } from 'lucide-react';
import type { ChatMessage, Citation } from '../../types/chat';
import { Badge } from '../common/Badge';
import { CitationCard } from './CitationCard';
import { QueryRoutingIndicator } from './QueryRoutingIndicator';
import { WebSourceBadge } from './WebSourceBadge';

const SOURCE_LABEL: Record<string, string> = {
  LOCAL_KB: 'Knowledge base',
  WEB_SEARCH: 'Web search',
  NONE: 'No source',
};

/** Only the single best-matching chunk is shown - the backend returns up to 5, sorted or not. */
function topCitation(citations: Citation[]): Citation {
  return citations.reduce((best, c) => (c.similarityScore > best.similarityScore ? c : best));
}

export function MessageBubble({ message }: { message: ChatMessage }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[80%] rounded-2xl px-4 py-3 text-sm
          ${isUser ? 'bg-[var(--color-accent)] text-[var(--color-accent-contrast)]' : 'bg-black/5 text-[var(--color-text)] dark:bg-white/5'}`}
      >
        {message.pending && <QueryRoutingIndicator />}

        {message.error && (
          <div className="flex items-center gap-1.5 text-[var(--color-danger)]">
            <AlertCircle className="size-4" />
            {message.error}
          </div>
        )}

        {!message.pending && !message.error && (
          <>
            <p className="whitespace-pre-wrap">{message.text}</p>

            {message.response && !isUser && (
              <div className="mt-2 flex flex-col gap-2">
                <Badge tone={message.response.source === 'LOCAL_KB' ? 'success' : message.response.source === 'WEB_SEARCH' ? 'info' : 'neutral'}>
                  {SOURCE_LABEL[message.response.source]}
                </Badge>

                {message.response.citations.length > 0 && (
                  <div className="flex flex-col gap-1.5">
                    <CitationCard citation={topCitation(message.response.citations)} />
                  </div>
                )}

                {message.response.webSources.length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {message.response.webSources.map((source) => (
                      <WebSourceBadge key={source.url} source={source} />
                    ))}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

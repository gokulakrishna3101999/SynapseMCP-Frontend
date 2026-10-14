import { useCallback, useState } from 'react';
import { chatService } from '../services/chatService';
import { extractErrorMessage } from '../services/api';
import type { ChatMessage, ChatTurn } from '../types/chat';

/** How many prior turns (user+assistant) ride along on each request; the backend trims further itself. */
const MAX_HISTORY_TURNS = 6;

/** Transient, client-side-only chat history (architecture.md: no chat transcripts persisted server-side). */
export function useRagChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [sending, setSending] = useState(false);

  const send = useCallback(async (query: string) => {
    const trimmed = query.trim();
    if (!trimmed) return;

    // Only completed turns (not the pending placeholder or a failed one) count as real history.
    const history: ChatTurn[] = messages
      .filter((m) => !m.pending && !m.error)
      .slice(-MAX_HISTORY_TURNS)
      .map((m) => ({ role: m.role, text: m.text }));

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: 'user', text: trimmed };
    const pendingId = crypto.randomUUID();
    setMessages((prev) => [...prev, userMessage, { id: pendingId, role: 'assistant', text: '', pending: true }]);
    setSending(true);

    try {
      const response = await chatService.ask({ query: trimmed, history });
      setMessages((prev) =>
        prev.map((m) => (m.id === pendingId ? { id: pendingId, role: 'assistant', text: response.answer, response } : m)),
      );
    } catch (err) {
      const message = extractErrorMessage(err, 'Could not get an answer right now.');
      setMessages((prev) => prev.map((m) => (m.id === pendingId ? { id: pendingId, role: 'assistant', text: '', error: message } : m)));
    } finally {
      setSending(false);
    }
  }, []);

  const clear = useCallback(() => setMessages([]), []);

  return { messages, sending, send, clear };
}

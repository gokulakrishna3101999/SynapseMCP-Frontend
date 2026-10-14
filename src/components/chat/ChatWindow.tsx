import { Send } from 'lucide-react';
import { useEffect, useRef, useState, type FormEvent } from 'react';
import { useRagChat } from '../../hooks/useRagChat';
import { Button } from '../common/Button';
import { MessageBubble } from './MessageBubble';

export function ChatWindow() {
  const { messages, sending, send } = useRagChat();
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!input.trim() || sending) return;
    send(input);
    setInput('');
  };

  return (
    <div className="flex h-full flex-col">
      <div className="flex-1 overflow-y-auto px-1">
        {messages.length === 0 && (
          <p className="py-10 text-center text-sm text-[var(--color-text-muted)]">
            Ask a question about your knowledge base. Answers cite your documents, or fall back to the web when needed.
          </p>
        )}
        <div className="flex flex-col gap-3 py-2">
          {messages.map((message) => (
            <MessageBubble key={message.id} message={message} />
          ))}
        </div>
        <div ref={bottomRef} />
      </div>

      <form onSubmit={handleSubmit} className="mt-3 flex items-center gap-2 border-t border-[var(--color-border)] pt-3">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your documents..."
          className="flex-1 rounded-lg border border-[var(--color-border)] bg-transparent px-3 py-2 text-sm outline-none
            focus:border-[var(--color-accent)]"
        />
        <Button type="submit" icon={<Send className="size-4" />} loading={sending} disabled={!input.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}

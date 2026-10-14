import { Check, Copy, KeyRound, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { useMcpKeys } from '../../hooks/useMcpKeys';
import { useToast } from '../../context/ToastContext';
import { extractErrorMessage } from '../../services/api';
import { Badge } from '../common/Badge';
import { Button } from '../common/Button';
import { Modal } from '../common/Modal';

function configSnippet(key: string): string {
  // MCP clients (Claude Desktop, Cursor, standalone CLIs like Antigravity) make their own direct HTTP
  // requests - they are not the browser page, so they never go through Vite's dev-only /api proxy or
  // hit window.location.origin's same-origin benefits. window.location.origin would be this frontend's
  // own port (5173 in dev), which only serves /api; /mcp/sse there 404s before it ever reaches the
  // backend. VITE_BACKEND_ORIGIN points this at the backend's actual address; it defaults to the
  // frontend's own origin so a production deployment that truly serves both from one origin (behind a
  // reverse proxy that also forwards /mcp) still works without any extra configuration.
  const backendOrigin = import.meta.env.VITE_BACKEND_ORIGIN ?? window.location.origin;
  const sseUrl = `${backendOrigin}/mcp/sse`;
  return JSON.stringify(
    { mcpServers: { 'synapse-my-kb': { url: sseUrl, headers: { Authorization: `Bearer ${key}` } } } },
    null,
    2,
  );
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      }}
      className="inline-flex items-center gap-1 text-xs text-[var(--color-accent)]"
    >
      {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
      {copied ? 'Copied' : 'Copy'}
    </button>
  );
}

export function McpKeyModal({ onClose }: { onClose: () => void }) {
  const { keys, loading, create, revoke } = useMcpKeys();
  const { showToast } = useToast();
  const [creating, setCreating] = useState(false);
  const [justCreatedKey, setJustCreatedKey] = useState<string | null>(null);

  const handleCreate = async () => {
    setCreating(true);
    try {
      const created = await create();
      setJustCreatedKey(created.key);
    } catch (err) {
      showToast(extractErrorMessage(err, 'Could not create an MCP key.'), 'error');
    } finally {
      setCreating(false);
    }
  };

  const handleRevoke = async (id: string) => {
    try {
      await revoke(id);
      showToast('MCP key revoked.', 'success');
    } catch (err) {
      showToast(extractErrorMessage(err, 'Could not revoke that key.'), 'error');
    }
  };

  return (
    <Modal title="Connect External LLM" onClose={onClose}>
      <p className="mb-4 text-sm text-[var(--color-text-muted)]">
        Generate an API key to let Claude Desktop, Cursor, or another MCP client query your knowledge base directly.
      </p>

      {justCreatedKey && (
        <div className="mb-4 rounded-lg border border-[var(--color-accent)] bg-[var(--color-accent)]/5 p-3">
          <p className="mb-1 text-xs font-medium text-[var(--color-text)]">
            Your new key (shown once - copy it now):
          </p>
          <div className="flex items-center justify-between gap-2 rounded-md bg-black/5 px-2 py-1.5 font-mono text-xs dark:bg-white/10">
            <span className="truncate">{justCreatedKey}</span>
            <CopyButton text={justCreatedKey} />
          </div>
          <p className="mb-1 mt-3 text-xs font-medium text-[var(--color-text)]">Claude Desktop / Cursor config:</p>
          <div className="relative">
            <pre className="max-h-40 overflow-auto rounded-md bg-black/5 p-2 text-[11px] dark:bg-white/10">
              {configSnippet(justCreatedKey)}
            </pre>
            <div className="absolute right-2 top-2">
              <CopyButton text={configSnippet(justCreatedKey)} />
            </div>
          </div>
        </div>
      )}

      <Button onClick={handleCreate} loading={creating} icon={<KeyRound className="size-4" />} className="mb-4 w-full">
        Generate new key
      </Button>

      <div className="flex flex-col gap-2">
        {loading && <p className="text-sm text-[var(--color-text-muted)]">Loading keys...</p>}
        {!loading && keys.length === 0 && <p className="text-sm text-[var(--color-text-muted)]">No MCP keys yet.</p>}
        {keys.map((key) => (
          <div key={key.id} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--color-border)] p-2.5">
            <div className="flex flex-col">
              <span className="text-sm font-medium text-[var(--color-text)]">{key.name}</span>
              <span className="font-mono text-xs text-[var(--color-text-muted)]">{key.keyPrefix}...</span>
            </div>
            <div className="flex items-center gap-2">
              {key.revoked ? (
                <Badge tone="danger">Revoked</Badge>
              ) : (
                <button onClick={() => handleRevoke(key.id)} aria-label={`Revoke ${key.name}`} className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)]">
                  <Trash2 className="size-4" />
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </Modal>
  );
}

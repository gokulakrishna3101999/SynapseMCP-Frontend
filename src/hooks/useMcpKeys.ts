import { useCallback, useEffect, useState } from 'react';
import { mcpKeyService } from '../services/mcpKeyService';
import { extractErrorMessage } from '../services/api';
import type { McpKeySummary } from '../types/mcp';

export function useMcpKeys() {
  const [keys, setKeys] = useState<McpKeySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      setKeys(await mcpKeyService.list());
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load your MCP keys.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const create = useCallback(async (name?: string) => {
    const created = await mcpKeyService.create({ name });
    await refresh();
    return created;
  }, [refresh]);

  const revoke = useCallback(async (id: string) => {
    await mcpKeyService.revoke(id);
    setKeys((prev) => prev.map((k) => (k.id === id ? { ...k, revoked: true } : k)));
  }, []);

  return { keys, loading, error, refresh, create, revoke };
}

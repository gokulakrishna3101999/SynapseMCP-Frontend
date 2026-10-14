import { useCallback, useEffect, useState } from 'react';
import { documentService } from '../services/documentService';
import { extractErrorMessage } from '../services/api';
import type { DocumentListItem } from '../types/document';

export function useDocuments() {
  const [documents, setDocuments] = useState<DocumentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const data = await documentService.list();
      setDocuments(data);
      setError(null);
    } catch (err) {
      setError(extractErrorMessage(err, 'Could not load your documents.'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const remove = useCallback(async (documentId: string) => {
    await documentService.remove(documentId);
    setDocuments((prev) => prev.filter((d) => d.id !== documentId));
  }, []);

  return { documents, loading, error, refresh, remove };
}

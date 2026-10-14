import { Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { DocumentListItem, DocumentStatus } from '../../types/document';
import { Badge } from '../common/Badge';
import { categoryLabel, formatBytes } from './fileCategory';

const STATUS_TONE: Record<DocumentStatus, 'neutral' | 'success' | 'warning' | 'danger'> = {
  PENDING: 'neutral',
  PROCESSING: 'warning',
  INDEXED: 'success',
  FAILED: 'danger',
  REJECTED: 'danger',
};

const STATUS_LABEL: Record<DocumentStatus, string> = {
  PENDING: 'Pending',
  PROCESSING: 'Processing',
  INDEXED: 'Indexed - S3 Purged',
  FAILED: 'Failed',
  REJECTED: 'Rejected',
};

interface DocumentTableProps {
  documents: DocumentListItem[];
  onDelete: (documentId: string) => Promise<void>;
}

export function DocumentTable({ documents, onDelete }: DocumentTableProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  if (documents.length === 0) {
    return <p className="py-6 text-center text-sm text-[var(--color-text-muted)]">No documents yet. Upload one to get started.</p>;
  }

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      await onDelete(id);
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm">
        <thead>
          <tr className="border-b border-[var(--color-border)] text-xs uppercase text-[var(--color-text-muted)]">
            <th className="py-2 pr-4">Name</th>
            <th className="py-2 pr-4">Category</th>
            <th className="py-2 pr-4">Size</th>
            <th className="py-2 pr-4">Chunks</th>
            <th className="py-2 pr-4">Status</th>
            <th className="py-2" />
          </tr>
        </thead>
        <tbody>
          {documents.map((doc) => (
            <tr key={doc.id} className="border-b border-[var(--color-border)] last:border-0">
              <td className="max-w-xs truncate py-2 pr-4 font-medium text-[var(--color-text)]" title={doc.name}>
                {doc.name}
              </td>
              <td className="py-2 pr-4 text-[var(--color-text-muted)]">{categoryLabel(doc.name)}</td>
              <td className="py-2 pr-4 text-[var(--color-text-muted)]">{formatBytes(doc.fileSize)}</td>
              <td className="py-2 pr-4 text-[var(--color-text-muted)]">{doc.chunkCount}</td>
              <td className="py-2 pr-4">
                <Badge tone={STATUS_TONE[doc.status]}>{STATUS_LABEL[doc.status]}</Badge>
              </td>
              <td className="py-2 text-right">
                <button
                  onClick={() => handleDelete(doc.id)}
                  disabled={deletingId === doc.id}
                  aria-label={`Delete ${doc.name}`}
                  className="text-[var(--color-text-muted)] hover:text-[var(--color-danger)] disabled:opacity-50"
                >
                  <Trash2 className="size-4" />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

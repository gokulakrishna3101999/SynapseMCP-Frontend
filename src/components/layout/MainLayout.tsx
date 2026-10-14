import { useCallback, useEffect } from 'react';
import { useDocuments } from '../../hooks/useDocuments';
import { useFileUploadWithProgress } from '../../hooks/useFileUploadWithProgress';
import { useToast } from '../../context/ToastContext';
import { ChatWindow } from '../chat/ChatWindow';
import { Card } from '../common/Card';
import { DocumentTable } from '../documents/DocumentTable';
import { DocumentUploadDropzone } from '../documents/DocumentUploadDropzone';
import { FileUploadProgressCard } from '../documents/FileUploadProgressCard';
import { AppHeader } from './AppHeader';

export function MainLayout() {
  const { documents, refresh, remove } = useDocuments();
  const { progress, uploadAndTrack, reset } = useFileUploadWithProgress();
  const { showToast } = useToast();

  const handleFileSelected = useCallback(
    async (file: File) => {
      await uploadAndTrack(file);
    },
    [uploadAndTrack],
  );

  // Refresh the table once ingestion reaches a terminal state (effect, not inline - refresh() sets
  // state, and doing that during render would re-render with the same terminal phase forever).
  useEffect(() => {
    if (progress.phase === 'COMPLETED' || progress.phase === 'FAILED') {
      refresh();
    }
  }, [progress.phase, progress.documentId, refresh]);

  const handleDelete = async (documentId: string) => {
    try {
      await remove(documentId);
      showToast('Document deleted.', 'success');
    } catch {
      showToast('Could not delete that document.', 'error');
    }
  };

  return (
    <div className="flex h-screen flex-col">
      <AppHeader />
      <div className="grid flex-1 gap-4 overflow-hidden p-4 md:grid-cols-2">
        <section className="flex flex-col gap-4 overflow-y-auto">
          <DocumentUploadDropzone onFileSelected={handleFileSelected} disabled={progress.phase === 'UPLOADING' || progress.phase === 'PROCESSING'} />
          <FileUploadProgressCard progress={progress} onDismiss={reset} />
          <Card className="flex-1">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Your knowledge base</h2>
            <DocumentTable documents={documents} onDelete={handleDelete} />
          </Card>
        </section>

        <section className="flex flex-col overflow-hidden">
          <Card className="flex h-full flex-col">
            <h2 className="mb-3 text-sm font-semibold text-[var(--color-text)]">Chat</h2>
            <ChatWindow />
          </Card>
        </section>
      </div>
    </div>
  );
}

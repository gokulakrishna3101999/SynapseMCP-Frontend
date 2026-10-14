import { FileText, X } from 'lucide-react';
import type { IngestionProgressState } from '../../hooks/useFileUploadWithProgress';
import { Card } from '../common/Card';
import { IngestionStepper } from './IngestionStepper';

const STAGE_LABEL: Record<string, string> = {
  QUEUED: 'Queued',
  EXTRACTION: 'Parsing',
  SPLITTING: 'Chunking',
  VECTORIZING: 'Embedding',
  PURGING_S3: 'Purging S3',
  COMPLETED: 'Ready',
  FAILED: 'Failed',
};

export function FileUploadProgressCard({ progress, onDismiss }: { progress: IngestionProgressState; onDismiss: () => void }) {
  if (progress.phase === 'IDLE') return null;

  return (
    <Card>
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-hidden">
          <FileText className="size-4 shrink-0 text-[var(--color-accent)]" />
          <span className="truncate text-sm font-medium text-[var(--color-text)]">{progress.fileName}</span>
        </div>
        {(progress.phase === 'COMPLETED' || progress.phase === 'FAILED') && (
          <button onClick={onDismiss} aria-label="Dismiss" className="text-[var(--color-text-muted)] hover:text-[var(--color-text)]">
            <X className="size-4" />
          </button>
        )}
      </div>

      {progress.phase === 'UPLOADING' && (
        <>
          <div className="mb-1 flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>Uploading...</span>
            <span>{progress.uploadPercent}%</span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-black/10 dark:bg-white/10">
            <div
              className="h-full rounded-full bg-[var(--color-accent)] transition-all"
              style={{ width: `${progress.uploadPercent}%` }}
            />
          </div>
        </>
      )}

      {(progress.phase === 'PROCESSING' || progress.phase === 'COMPLETED' || progress.phase === 'FAILED') && (
        <div>
          <div className="mb-2 flex justify-between text-xs text-[var(--color-text-muted)]">
            <span>{progress.phase === 'FAILED' ? progress.errorMessage ?? 'Ingestion failed' : STAGE_LABEL[progress.stage]}</span>
            <span>{progress.stagePercent}%</span>
          </div>
          <IngestionStepper stage={progress.stage} failed={progress.phase === 'FAILED'} />
        </div>
      )}
    </Card>
  );
}

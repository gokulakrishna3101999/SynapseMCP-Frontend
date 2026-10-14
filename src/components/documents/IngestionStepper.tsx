import { Check, Loader2, X } from 'lucide-react';
import type { JobStage } from '../../types/document';

const STEPS: { stage: JobStage; label: string }[] = [
  { stage: 'QUEUED', label: 'Queued' },
  { stage: 'EXTRACTION', label: 'Parsing' },
  { stage: 'SPLITTING', label: 'Chunking' },
  { stage: 'VECTORIZING', label: 'Embedding' },
  { stage: 'PURGING_S3', label: 'S3 Purged' },
  { stage: 'COMPLETED', label: 'Ready' },
];

function stepIndex(stage: JobStage): number {
  const idx = STEPS.findIndex((s) => s.stage === stage);
  return idx === -1 ? 0 : idx;
}

export function IngestionStepper({ stage, failed }: { stage: JobStage; failed?: boolean }) {
  const currentIndex = stepIndex(stage);
  const isTerminalComplete = stage === 'COMPLETED';

  return (
    <ol className="flex items-center gap-1">
      {STEPS.map((step, index) => {
        // The terminal "Ready" step is itself currentIndex once reached - it must render as done
        // (checkmark), not as the perpetually-spinning "current" step, or 100% never stops loading.
        const isDone = !failed && (index < currentIndex || (isTerminalComplete && index === currentIndex));
        const isCurrent = !failed && index === currentIndex && !isTerminalComplete;
        const isFailedHere = failed && index === currentIndex;

        return (
          <li key={step.stage} className="flex flex-1 items-center gap-1">
            <div
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-medium
                ${isDone ? 'bg-[var(--color-success)] text-white' : ''}
                ${isCurrent ? 'bg-[var(--color-accent)] text-white' : ''}
                ${isFailedHere ? 'bg-[var(--color-danger)] text-white' : ''}
                ${!isDone && !isCurrent && !isFailedHere ? 'bg-black/10 text-[var(--color-text-muted)] dark:bg-white/10' : ''}`}
              title={step.label}
            >
              {isDone && <Check className="size-3.5" />}
              {isCurrent && <Loader2 className="size-3.5 animate-spin" />}
              {isFailedHere && <X className="size-3.5" />}
              {!isDone && !isCurrent && !isFailedHere && index + 1}
            </div>
            {index < STEPS.length - 1 && (
              <div className={`h-0.5 flex-1 ${isDone ? 'bg-[var(--color-success)]' : 'bg-black/10 dark:bg-white/10'}`} />
            )}
          </li>
        );
      })}
    </ol>
  );
}

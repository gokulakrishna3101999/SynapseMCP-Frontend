import { useCallback, useState } from 'react';
import { documentService } from '../services/documentService';
import { extractErrorMessage } from '../services/api';
import type { JobStage, JobStatus, ProgressEventPayload } from '../types/document';

export interface IngestionProgressState {
  documentId: string | null;
  fileName: string | null;
  phase: 'IDLE' | 'UPLOADING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  uploadPercent: number;
  stage: JobStage;
  stagePercent: number;
  jobStatus: JobStatus | null;
  errorMessage?: string;
}

const IDLE_STATE: IngestionProgressState = {
  documentId: null,
  fileName: null,
  phase: 'IDLE',
  uploadPercent: 0,
  stage: 'QUEUED',
  stagePercent: 0,
  jobStatus: null,
};

/**
 * Coordinates the dual-phase upload: Axios `onUploadProgress` for the network transfer, then an
 * EventSource for the server-side ingestion stages (design.md section 2.3). A server-sent named
 * `error` event and the browser's own connection-level `error` event both surface on EventSource as
 * type `error`; only the former carries `event.data`, so that's what distinguishes them below.
 */
export function useFileUploadWithProgress() {
  const [progress, setProgress] = useState<IngestionProgressState>(IDLE_STATE);

  const reset = useCallback(() => setProgress(IDLE_STATE), []);

  const uploadAndTrack = useCallback(async (file: File) => {
    setProgress({ ...IDLE_STATE, phase: 'UPLOADING', fileName: file.name });

    try {
      const response = await documentService.upload(file, (event) => {
        if (!event.total) return;
        const percent = Math.round((event.loaded * 100) / event.total);
        setProgress((prev) => ({ ...prev, uploadPercent: percent }));
      });

      setProgress((prev) => ({
        ...prev,
        documentId: response.documentId,
        phase: 'PROCESSING',
        uploadPercent: 100,
        stage: 'QUEUED',
        stagePercent: 5,
      }));

      const eventSource = new EventSource(documentService.progressStreamUrl(response.documentId));

      eventSource.addEventListener('progress', (event: MessageEvent) => {
        const data: ProgressEventPayload = JSON.parse(event.data);
        setProgress((prev) => ({
          ...prev,
          stage: data.stage as JobStage,
          stagePercent: data.progressPercent,
          jobStatus: data.status as JobStatus,
        }));

        if (data.stage === 'COMPLETED') {
          setProgress((prev) => ({ ...prev, phase: 'COMPLETED' }));
          eventSource.close();
        }
      });

      eventSource.addEventListener('error', (event) => {
        if (event instanceof MessageEvent && event.data) {
          const data = JSON.parse(event.data);
          setProgress((prev) => ({ ...prev, phase: 'FAILED', errorMessage: data.error }));
        }
        // A connection-level error (no `data`) is not fatal by itself - the REST status endpoint
        // (useDocuments' polling fallback) covers a dropped SSE connection per plan.md's risk table.
        eventSource.close();
      });
    } catch (err) {
      setProgress((prev) => ({ ...prev, phase: 'FAILED', errorMessage: extractErrorMessage(err) }));
    }
  }, []);

  return { progress, uploadAndTrack, reset };
}

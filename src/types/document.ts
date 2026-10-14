export type IngestionTier = 'TIER_1_MULTIMODAL' | 'TIER_2_JAVA_PARSER';

export type DocumentStatus = 'PENDING' | 'PROCESSING' | 'INDEXED' | 'FAILED' | 'REJECTED';

export type JobStatus =
  | 'QUEUED'
  | 'PARSING'
  | 'CHUNKING'
  | 'EMBEDDING'
  | 'PURGING_S3'
  | 'COMPLETED'
  | 'FAILED';

export type JobStage =
  | 'QUEUED'
  | 'EXTRACTION'
  | 'SPLITTING'
  | 'VECTORIZING'
  | 'PURGING_S3'
  | 'COMPLETED'
  | 'FAILED';

export interface UploadResponse {
  documentId: string;
  jobId: string;
  fileName: string;
  fileSize: number;
  ingestionTier: IngestionTier;
  status: string;
  rawFilePurged: boolean;
}

export interface DocumentStatusResponse {
  documentId: string;
  documentStatus: DocumentStatus;
  jobStatus: JobStatus;
  stage: JobStage;
  progressPercent: number;
  errorMessage: string | null;
}

export interface DocumentListItem {
  id: string;
  name: string;
  contentType: string;
  fileSize: number;
  status: DocumentStatus;
  rawFilePurged: boolean;
  chunkCount: number;
  createdAt: string;
}

/** Payload of the SSE `progress` event (ProgressEvent.java) - note `status`, not `documentStatus`/`jobStatus`. */
export interface ProgressEventPayload {
  documentId: string;
  stage: JobStage | 'QUEUED';
  progressPercent: number;
  status: JobStatus | DocumentStatus;
}

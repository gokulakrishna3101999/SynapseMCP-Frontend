import { api, TOKEN_STORAGE_KEY } from './api';
import type { DocumentListItem, DocumentStatusResponse, UploadResponse } from '../types/document';
import type { AxiosProgressEvent } from 'axios';

export const documentService = {
  upload: (file: File, onUploadProgress: (event: AxiosProgressEvent) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    return api
      .post<UploadResponse>('/documents/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress,
      })
      .then((r) => r.data);
  },

  getStatus: (documentId: string) =>
    api.get<DocumentStatusResponse>(`/documents/${documentId}/status`).then((r) => r.data),

  list: () => api.get<DocumentListItem[]>('/documents').then((r) => r.data),

  remove: (documentId: string) => api.delete(`/documents/${documentId}`),

  /** EventSource can't send an Authorization header, so the token travels as a query param (server-side opt-in, JwtAuthenticationFilter). */
  progressStreamUrl: (documentId: string) => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY) ?? '';
    return `/api/v1/documents/${documentId}/progress-stream?token=${encodeURIComponent(token)}`;
  },
};

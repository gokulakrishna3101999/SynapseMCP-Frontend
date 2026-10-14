import { api } from './api';
import type { McpKeyCreateRequest, McpKeyCreatedResponse, McpKeySummary } from '../types/mcp';

export const mcpKeyService = {
  list: () => api.get<McpKeySummary[]>('/keys/mcp').then((r) => r.data),
  create: (request: McpKeyCreateRequest) => api.post<McpKeyCreatedResponse>('/keys/mcp', request).then((r) => r.data),
  revoke: (id: string) => api.delete(`/keys/mcp/${id}`),
};

export interface McpKeyCreateRequest {
  name?: string;
}

export interface McpKeyCreatedResponse {
  id: string;
  name: string;
  key: string;
  createdAt: string;
}

export interface McpKeySummary {
  id: string;
  name: string;
  keyPrefix: string;
  revoked: boolean;
  createdAt: string;
  lastUsedAt: string | null;
}

export interface ChatTurn {
  role: 'user' | 'assistant';
  text: string;
}

export interface ChatRequest {
  query: string;
  /** The backend never persists this - used in-memory for this one request only, then discarded. */
  history: ChatTurn[];
}

export interface Citation {
  documentId: string;
  documentName: string;
  chunkId: string;
  snippet: string;
  similarityScore: number;
}

export interface WebSource {
  title: string;
  url: string;
}

export type ChatSource = 'LOCAL_KB' | 'WEB_SEARCH' | 'NONE';

export interface ChatResponse {
  answer: string;
  source: ChatSource;
  confidenceScore: number;
  citations: Citation[];
  webSources: WebSource[];
}

/** A transient, client-side-only chat turn - never persisted server-side (architecture.md invariant). */
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  response?: ChatResponse;
  pending?: boolean;
  error?: string;
}

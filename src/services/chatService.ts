import { api } from './api';
import type { ChatRequest, ChatResponse } from '../types/chat';

export const chatService = {
  ask: (request: ChatRequest) => api.post<ChatResponse>('/chat', request).then((r) => r.data),
};

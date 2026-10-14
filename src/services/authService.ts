import { api } from './api';
import type { AuthResponse, SigninRequest, SignupRequest } from '../types/auth';

export const authService = {
  signup: (request: SignupRequest) => api.post<AuthResponse>('/auth/signup', request).then((r) => r.data),
  signin: (request: SigninRequest) => api.post<AuthResponse>('/auth/signin', request).then((r) => r.data),
};

import axios from 'axios';
import type { ApiProblem } from '../types/auth';

export const TOKEN_STORAGE_KEY = 'synapse_token';

export const api = axios.create({
  baseURL: '/api/v1',
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_STORAGE_KEY);
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/** Fires on any 401 except the initial signin attempt itself (a wrong password must not redirect). */
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const isAuthEndpoint = (error.config?.url ?? '').includes('/auth/');
    if (error.response?.status === 401 && !isAuthEndpoint) {
      localStorage.removeItem(TOKEN_STORAGE_KEY);
      window.dispatchEvent(new CustomEvent('synapse:unauthorized'));
    }
    return Promise.reject(error);
  },
);

/** Normalizes any Axios/API failure into the RFC 7807 `detail` message, falling back sensibly. */
export function extractErrorMessage(err: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (axios.isAxiosError<ApiProblem>(err)) {
    const problem = err.response?.data;
    if (problem?.errors && Object.keys(problem.errors).length > 0) {
      return Object.values(problem.errors).join(' ');
    }
    if (problem?.detail) {
      return problem.detail;
    }
    if (err.message) {
      return err.message;
    }
  }
  return fallback;
}

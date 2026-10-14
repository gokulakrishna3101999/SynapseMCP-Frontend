import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { authService } from '../services/authService';
import { TOKEN_STORAGE_KEY } from '../services/api';
import type { SigninRequest, SignupRequest, UserInfo } from '../types/auth';

const USER_STORAGE_KEY = 'synapse_user';
const KB_STORAGE_KEY = 'synapse_kb_id';

interface AuthState {
  user: UserInfo | null;
  knowledgeBaseId: string | null;
  isAuthenticated: boolean;
}

interface AuthContextValue extends AuthState {
  signup: (request: SignupRequest) => Promise<void>;
  signin: (request: SigninRequest) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

function readStoredUser(): UserInfo | null {
  const raw = localStorage.getItem(USER_STORAGE_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as UserInfo;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>(() => ({
    user: readStoredUser(),
    knowledgeBaseId: localStorage.getItem(KB_STORAGE_KEY),
    isAuthenticated: Boolean(localStorage.getItem(TOKEN_STORAGE_KEY)),
  }));

  const applyAuthResponse = useCallback((response: { token: string; user: UserInfo; knowledgeBaseId: string }) => {
    localStorage.setItem(TOKEN_STORAGE_KEY, response.token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(response.user));
    localStorage.setItem(KB_STORAGE_KEY, response.knowledgeBaseId);
    setState({ user: response.user, knowledgeBaseId: response.knowledgeBaseId, isAuthenticated: true });
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    localStorage.removeItem(KB_STORAGE_KEY);
    setState({ user: null, knowledgeBaseId: null, isAuthenticated: false });
  }, []);

  useEffect(() => {
    const onUnauthorized = () => logout();
    window.addEventListener('synapse:unauthorized', onUnauthorized);
    return () => window.removeEventListener('synapse:unauthorized', onUnauthorized);
  }, [logout]);

  const signup = useCallback(async (request: SignupRequest) => {
    const response = await authService.signup(request);
    applyAuthResponse(response);
  }, [applyAuthResponse]);

  const signin = useCallback(async (request: SigninRequest) => {
    const response = await authService.signin(request);
    applyAuthResponse(response);
  }, [applyAuthResponse]);

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, signup, signin, logout }),
    [state, signup, signin, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return ctx;
}

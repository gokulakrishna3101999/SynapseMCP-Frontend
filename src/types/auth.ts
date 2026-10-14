export interface SignupRequest {
  email: string;
  password: string;
  fullName: string;
}

export interface SigninRequest {
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  email: string;
  fullName: string;
}

export interface AuthResponse {
  token: string;
  user: UserInfo;
  knowledgeBaseId: string;
}

/** Shape of the RFC 7807 error body every backend error renders as (GlobalExceptionHandler). */
export interface ApiProblem {
  type?: string;
  title?: string;
  status: number;
  detail: string;
  instance?: string;
  code: string;
  errors?: Record<string, string>;
}

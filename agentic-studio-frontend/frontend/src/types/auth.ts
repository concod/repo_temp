// Types for authentication-related API responses and data structures

export interface LoginResponse {
  status: string;
  token: string;
  detail: string;
  name: string;
  picture: string;
  email: string;
  role: string;
  is_admin: boolean;
}

export interface LoginError {
  detail: string;
}

export interface GoogleCredentialResponse {
  credential: string;
}

export interface AuthData {
  token: string;
  name: string;
  picture: string;
  email: string;
}

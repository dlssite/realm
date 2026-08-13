import { API_BASE } from '@/lib/api';
/**
 * Auth API client.
 * Handles register, login, logout, and current-user fetch.
 */

import type {
  RegisterPayload,
  LoginPayload,
  AuthResponse,
  MeResponse,
} from '../types';

const BASE = `${API_BASE}/api/v1/auth`;

function jsonHeaders(): HeadersInit {
  return { 'Content-Type': 'application/json' };
}

function authHeaders(token: string): HeadersInit {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

/** Register a new user + workspace in one shot */
export async function register(payload: RegisterPayload): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Registration failed');
  return data as AuthResponse;
}

/** Authenticate with email + password */
export async function login(payload: LoginPayload): Promise<AuthResponse> {
  const res = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: jsonHeaders(),
    body: JSON.stringify(payload),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Login failed');
  return data as AuthResponse;
}

/** Invalidate the current session */
export async function logout(token: string): Promise<void> {
  await fetch(`${BASE}/logout`, {
    method: 'POST',
    headers: authHeaders(token),
  });
}

/** Fetch the currently authenticated user and their default workspace */
export async function fetchMe(token: string): Promise<MeResponse> {
  const res = await fetch(`${BASE}/me`, { headers: authHeaders(token) });
  const data = await res.json();
  if (!res.ok) throw new Error(data?.error?.message ?? 'Failed to fetch current user');
  return data as MeResponse;
}

/** GitHub auth via server-side OAuth (GitHub App) */

const API_BASE = import.meta.env.VITE_CARDFORGE_API_URL || '/api';

export interface AuthUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

export interface AuthSession {
  session_token: string;
  user: AuthUser;
  expires_at: string;
}

const sessionHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  'Content-Type': 'application/json',
});

/** Initiate GitHub OAuth — returns the URL to redirect to */
export const initiateGitHubAuth = async (returnTo?: string): Promise<string> => {
  const params = returnTo ? `?return_to=${encodeURIComponent(returnTo)}` : '';
  const res = await fetch(`${API_BASE}/auth/github${params}`);
  if (!res.ok) throw new Error('Failed to initiate GitHub auth');
  const data = await res.json();
  return data.authorization_url;
};

/** Exchange OAuth callback params for a session */
export const handleGitHubCallback = async (code: string, state: string): Promise<AuthSession> => {
  const res = await fetch(`${API_BASE}/auth/github/callback?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}`);
  if (!res.ok) throw new Error('GitHub authentication failed');
  return res.json();
};

/** Get current user from session token */
export const getMe = async (sessionToken: string): Promise<AuthUser> => {
  const res = await fetch(`${API_BASE}/auth/me`, { headers: sessionHeaders(sessionToken) });
  if (!res.ok) throw new Error('Session expired');
  return res.json();
};

/** Log out and destroy session */
export const logout = async (sessionToken: string): Promise<void> => {
  await fetch(`${API_BASE}/auth/logout`, {
    method: 'POST',
    headers: sessionHeaders(sessionToken),
  });
};

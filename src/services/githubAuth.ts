/**
 * GitHub OAuth — Authorization Code with PKCE, driven entirely from the browser.
 *
 * The client id is public (embedded in the bundle); there is no secret here.
 * The only server touch is the token exchange: GitHub's token endpoint has no
 * CORS and still requires the client secret even with PKCE, so the code is
 * relayed through the stateless CardForge proxy (`VITE_CARDFORGE_API_URL`),
 * which injects the secret and returns the token. Everything else hits
 * api.github.com directly.
 *
 * Flow:
 *   1. login()       → redirect to github.com/login/oauth/authorize
 *   2. GitHub redirects back to /auth/callback?code=&state=
 *   3. completeLogin(code, state) → relay exchange → store token
 */

const PROXY_BASE = import.meta.env.VITE_CARDFORGE_API_URL || '/api';
const CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID || '';
const SCOPES = ['repo'];

const TOKEN_KEY = 'cardforge_gh_token';
const VERIFIER_KEY = 'cardforge_pkce_verifier';
const STATE_KEY = 'cardforge_pkce_state';
const RETURN_KEY = 'cardforge_return_to';

export const isClientIdConfigured = () => !!CLIENT_ID;

// Includes the Vite base path (e.g. /cardsapi.designer/) so it matches the
// OAuth App's registered callback when served from a Pages subpath.
const redirectUri = () => `${window.location.origin}${import.meta.env.BASE_URL}auth/callback`;

// ── token persistence ─────────────────────────────────────────────────────--

export const getStoredToken = (): string | null => localStorage.getItem(TOKEN_KEY);
export const storeToken = (token: string) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// ── PKCE helpers ───────────────────────────────────────────────────────────--

const base64Url = (bytes: Uint8Array): string => {
  let s = '';
  bytes.forEach((b) => (s += String.fromCharCode(b)));
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
};

const randomString = (bytes = 32): string => base64Url(crypto.getRandomValues(new Uint8Array(bytes)));

const sha256 = async (text: string): Promise<Uint8Array> =>
  new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text)));

// ── flow ───────────────────────────────────────────────────────────────────--

/** Step 1 — redirect to GitHub. The page navigates away (promise won't resolve). */
export const login = async (returnTo: string = window.location.pathname): Promise<void> => {
  if (!CLIENT_ID) {
    throw new Error('VITE_GITHUB_CLIENT_ID is not configured. Register a GitHub OAuth App and set it.');
  }
  const verifier = randomString(32);
  const challenge = base64Url(await sha256(verifier));
  const state = randomString(16);

  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  sessionStorage.setItem(RETURN_KEY, returnTo);

  const params = new URLSearchParams({
    client_id: CLIENT_ID,
    redirect_uri: redirectUri(),
    scope: SCOPES.join(' '),
    state,
    code_challenge: challenge,
    code_challenge_method: 'S256',
  });
  window.location.href = `https://github.com/login/oauth/authorize?${params.toString()}`;
};

export const consumeReturnTo = (): string => {
  const r = sessionStorage.getItem(RETURN_KEY) || '/';
  sessionStorage.removeItem(RETURN_KEY);
  return r;
};

/** Step 3 — validate state and exchange the code for a token (via the relay). */
export const completeLogin = async (code: string, state: string): Promise<string> => {
  const expectedState = sessionStorage.getItem(STATE_KEY);
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  if (!expectedState || !verifier || state !== expectedState) {
    throw new Error('OAuth state mismatch — refusing to exchange code.');
  }

  const res = await fetch(`${PROXY_BASE}/auth/github/exchange`, {
    method: 'POST',
    headers: { Accept: 'application/json', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: CLIENT_ID,
      code,
      redirect_uri: redirectUri(),
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new Error(`GitHub token exchange failed: ${res.status}`);
  const json = (await res.json()) as { access_token?: string; error?: string; error_description?: string };
  if (json.error || !json.access_token) {
    throw new Error(json.error_description || json.error || 'No access token returned');
  }
  storeToken(json.access_token);
  return json.access_token;
};

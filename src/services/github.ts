/** GitHub auth-only + CardForge API client */

const GITHUB_API = 'https://api.github.com';

export interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

const authHeaders = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
});

/** Verify a GitHub PAT and return the authenticated user */
export const getUser = async (token: string): Promise<GitHubUser> => {
  const res = await fetch(`${GITHUB_API}/user`, { headers: authHeaders(token) });
  if (!res.ok) throw new Error('Invalid GitHub token');
  return res.json();
};

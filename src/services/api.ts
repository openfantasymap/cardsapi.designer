/**
 * CardForge API client
 *
 * All persistence (save/load projects, list repos) goes through the backend.
 * The frontend only handles GitHub authentication (PAT → user identity).
 * The backend uses the forwarded token to interact with GitHub on behalf of the user.
 */

import { CardProject } from '@/types/card';

/** Base URL — configure via env or default to relative path */
const API_BASE = import.meta.env.VITE_CARDFORGE_API_URL || '/api';

const apiHeaders = (githubToken: string) => ({
  Authorization: `Bearer ${githubToken}`,
  'Content-Type': 'application/json',
});

// ── Repos ───────────────────────────────────────────────

export interface RepoSummary {
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  default_branch: string;
}

/** List repos the authenticated user can push to (proxied via backend) */
export const listRepos = async (token: string): Promise<RepoSummary[]> => {
  const res = await fetch(`${API_BASE}/repos`, { headers: apiHeaders(token) });
  if (!res.ok) throw new Error('Failed to list repos');
  return res.json();
};

// ── Projects ────────────────────────────────────────────

export interface SaveProjectResponse {
  path: string;
  fileCount: number;
}

/** Save a full project (template + data + cards) to a repo via the backend */
export const saveProject = async (
  token: string,
  repo: string,
  project: CardProject,
  branch?: string
): Promise<SaveProjectResponse> => {
  const res = await fetch(`${API_BASE}/projects/${project.id}/save`, {
    method: 'POST',
    headers: apiHeaders(token),
    body: JSON.stringify({ repo, branch, project }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Save failed');
  }
  return res.json();
};

/** Load a project from a repo via the backend */
export const loadProject = async (
  token: string,
  repo: string,
  projectId: string
): Promise<CardProject> => {
  const res = await fetch(
    `${API_BASE}/projects/${projectId}/load?repo=${encodeURIComponent(repo)}`,
    { headers: apiHeaders(token) }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Load failed');
  }
  return res.json();
};

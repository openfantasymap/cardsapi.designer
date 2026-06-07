/**
 * Direct GitHub API client.
 *
 * Once the user has an access token (via the PKCE OAuth flow), the browser
 * talks to api.github.com directly — there is no application backend in the
 * data path. This module ports the repo/contents/Git-Data operations that used
 * to live in the Python `github_client`.
 */

const API = 'https://api.github.com';

const headers = (token: string) => ({
  Authorization: `Bearer ${token}`,
  Accept: 'application/vnd.github+json',
  'X-GitHub-Api-Version': '2022-11-28',
  'Content-Type': 'application/json',
});

// ── binary <-> base64 / text helpers ─────────────────────────────────────────

export const textToBytes = (s: string): Uint8Array => new TextEncoder().encode(s);
export const bytesToText = (b: Uint8Array): string => new TextDecoder().decode(b);

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return btoa(binary);
};

export const base64ToBytes = (b64: string): Uint8Array => {
  const binary = atob(b64.replace(/\n/g, ''));
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
};

// ── User ──────────────────────────────────────────────────────────────────--

export interface GitHubUser {
  login: string;
  name: string | null;
  avatar_url: string;
}

export const getUser = async (token: string): Promise<GitHubUser> => {
  const res = await fetch(`${API}/user`, { headers: headers(token) });
  if (!res.ok) throw new Error('Failed to fetch GitHub user (token invalid?)');
  const u = await res.json();
  return { login: u.login, name: u.name ?? null, avatar_url: u.avatar_url };
};

// ── Repos ───────────────────────────────────────────────────────────────────

export interface RepoInfo {
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

const toRepoInfo = (r: any): RepoInfo => ({
  full_name: r.full_name,
  name: r.name,
  owner: r.owner?.login,
  private: r.private,
  default_branch: r.default_branch,
  html_url: r.html_url,
});

export const getRepo = async (
  token: string,
  fullName: string,
): Promise<RepoInfo | null> => {
  const res = await fetch(`${API}/repos/${fullName}`, { headers: headers(token) });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to read repo ${fullName}`);
  return toRepoInfo(await res.json());
};

export const createRepo = async (
  token: string,
  opts: { name: string; private?: boolean; description?: string; auto_init?: boolean },
): Promise<RepoInfo> => {
  const res = await fetch(`${API}/user/repos`, {
    method: 'POST',
    headers: headers(token),
    body: JSON.stringify({
      name: opts.name,
      private: opts.private ?? true,
      description: opts.description ?? '',
      // auto_init creates an initial commit so the repo has a default branch we
      // can commit onto immediately.
      auto_init: opts.auto_init ?? true,
    }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `Failed to create repo ${opts.name}`);
  }
  return toRepoInfo(await res.json());
};

/** Change an existing repo's visibility. Returns null if the repo doesn't exist yet. */
export const setRepoVisibility = async (
  token: string,
  fullName: string,
  isPublic: boolean,
): Promise<RepoInfo | null> => {
  const res = await fetch(`${API}/repos/${fullName}`, {
    method: 'PATCH',
    headers: headers(token),
    body: JSON.stringify({ private: !isPublic }),
  });
  if (res.status === 404) return null;
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'Failed to change repository visibility');
  }
  return toRepoInfo(await res.json());
};

/** Return the repo (owner/name), creating it private + auto-initialized if absent. */
export const ensureRepo = async (
  token: string,
  owner: string,
  name: string,
  opts: { private?: boolean; description?: string } = {},
): Promise<RepoInfo> => {
  const existing = await getRepo(token, `${owner}/${name}`);
  if (existing) return existing;
  return createRepo(token, { name, auto_init: true, ...opts });
};

// ── Contents ──────────────────────────────────────────────────────────────--

export interface FileResult {
  bytes: Uint8Array;
  sha: string;
}

/** Read a file's content. Returns null on 404. */
export const getFile = async (
  token: string,
  fullName: string,
  path: string,
  ref?: string,
): Promise<FileResult | null> => {
  const q = ref ? `?ref=${encodeURIComponent(ref)}` : '';
  const res = await fetch(`${API}/repos/${fullName}/contents/${path}${q}`, {
    headers: headers(token),
  });
  if (res.status === 404) return null;
  if (!res.ok) throw new Error(`Failed to read ${path} from ${fullName}`);
  const data = await res.json();
  return { bytes: base64ToBytes(data.content), sha: data.sha };
};

export const getFileText = async (
  token: string,
  fullName: string,
  path: string,
  ref?: string,
): Promise<string | null> => {
  const f = await getFile(token, fullName, path, ref);
  return f ? bytesToText(f.bytes) : null;
};

export interface DirEntry {
  name: string;
  path: string;
  type: 'file' | 'dir' | string;
}

/** List a directory's entries. Returns [] if the path/repo doesn't exist. */
export const getDir = async (token: string, fullName: string, path: string): Promise<DirEntry[]> => {
  const res = await fetch(`${API}/repos/${fullName}/contents/${path}`, { headers: headers(token) });
  if (res.status === 404) return [];
  if (!res.ok) throw new Error(`Failed to list ${path} in ${fullName}`);
  const data = await res.json();
  return Array.isArray(data) ? data.map((d: any) => ({ name: d.name, path: d.path, type: d.type })) : [];
};

// ── Atomic multi-file commit (Git Data API) ───────────────────────────────--

export interface CommitFile {
  path: string;
  bytes: Uint8Array;
}

/**
 * Commit multiple files atomically: create blobs → tree → commit → advance ref.
 * Returns the new commit SHA. Mirrors the old server-side implementation.
 */
export const commitFiles = async (
  token: string,
  fullName: string,
  branch: string | undefined,
  files: CommitFile[],
  message: string,
): Promise<string> => {
  const h = headers(token);

  // Resolve branch to the repo default if not given.
  if (!branch) {
    const repo = await getRepo(token, fullName);
    if (!repo) throw new Error(`Repo ${fullName} not found`);
    branch = repo.default_branch;
  }

  const refRes = await fetch(`${API}/repos/${fullName}/git/ref/heads/${branch}`, { headers: h });
  if (!refRes.ok) throw new Error(`Failed to read branch ${branch}`);
  const baseCommitSha = (await refRes.json()).object.sha;

  const commitRes = await fetch(`${API}/repos/${fullName}/git/commits/${baseCommitSha}`, { headers: h });
  if (!commitRes.ok) throw new Error('Failed to read base commit');
  const baseTreeSha = (await commitRes.json()).tree.sha;

  // Create a blob per file.
  const tree: Array<{ path: string; mode: string; type: string; sha: string }> = [];
  for (const file of files) {
    const blobRes = await fetch(`${API}/repos/${fullName}/git/blobs`, {
      method: 'POST',
      headers: h,
      body: JSON.stringify({ content: bytesToBase64(file.bytes), encoding: 'base64' }),
    });
    if (!blobRes.ok) throw new Error(`Failed to upload ${file.path}`);
    tree.push({ path: file.path, mode: '100644', type: 'blob', sha: (await blobRes.json()).sha });
  }

  const treeRes = await fetch(`${API}/repos/${fullName}/git/trees`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ base_tree: baseTreeSha, tree }),
  });
  if (!treeRes.ok) throw new Error('Failed to create tree');
  const newTreeSha = (await treeRes.json()).sha;

  const newCommitRes = await fetch(`${API}/repos/${fullName}/git/commits`, {
    method: 'POST',
    headers: h,
    body: JSON.stringify({ message, tree: newTreeSha, parents: [baseCommitSha] }),
  });
  if (!newCommitRes.ok) throw new Error('Failed to create commit');
  const newCommitSha = (await newCommitRes.json()).sha;

  const patchRes = await fetch(`${API}/repos/${fullName}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers: h,
    body: JSON.stringify({ sha: newCommitSha }),
  });
  if (!patchRes.ok) throw new Error('Failed to advance branch');

  return newCommitSha;
};

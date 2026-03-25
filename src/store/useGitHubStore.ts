import { create } from 'zustand';
import type { RepoSummary } from '@/services/api';
import type { AuthUser } from '@/services/github';

interface GitHubStore {
  sessionToken: string | null;
  user: AuthUser | null;
  repos: RepoSummary[];
  selectedRepo: string | null;
  loading: boolean;

  setSession: (token: string, user: AuthUser) => void;
  setUser: (user: AuthUser | null) => void;
  setRepos: (repos: RepoSummary[]) => void;
  setSelectedRepo: (repo: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

const SESSION_KEY = 'cardforge_session_token';
const REPO_KEY = 'cardforge_github_repo';

export const useGitHubStore = create<GitHubStore>((set) => ({
  sessionToken: localStorage.getItem(SESSION_KEY),
  user: null,
  repos: [],
  selectedRepo: localStorage.getItem(REPO_KEY),
  loading: false,

  setSession: (token, user) => {
    localStorage.setItem(SESSION_KEY, token);
    set({ sessionToken: token, user });
  },
  setUser: (user) => set({ user }),
  setRepos: (repos) => set({ repos }),
  setSelectedRepo: (repo) => {
    if (repo) localStorage.setItem(REPO_KEY, repo);
    else localStorage.removeItem(REPO_KEY);
    set({ selectedRepo: repo });
  },
  setLoading: (loading) => set({ loading }),
  logout: () => {
    localStorage.removeItem(SESSION_KEY);
    localStorage.removeItem(REPO_KEY);
    set({ sessionToken: null, user: null, repos: [], selectedRepo: null });
  },
}));

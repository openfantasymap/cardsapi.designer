import { create } from 'zustand';
import type { RepoSummary } from '@/services/api';

interface GitHubUser {
  login: string;
  avatar_url: string;
  name: string | null;
}

interface GitHubStore {
  token: string | null;
  user: GitHubUser | null;
  repos: RepoSummary[];
  selectedRepo: string | null;
  loading: boolean;

  setToken: (token: string | null) => void;
  setUser: (user: GitHubUser | null) => void;
  setRepos: (repos: RepoSummary[]) => void;
  setSelectedRepo: (repo: string | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

const STORAGE_KEY = 'cardforge_github_token';
const REPO_KEY = 'cardforge_github_repo';

export const useGitHubStore = create<GitHubStore>((set) => ({
  token: localStorage.getItem(STORAGE_KEY),
  user: null,
  repos: [],
  selectedRepo: localStorage.getItem(REPO_KEY),
  loading: false,

  setToken: (token) => {
    if (token) localStorage.setItem(STORAGE_KEY, token);
    else localStorage.removeItem(STORAGE_KEY);
    set({ token });
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
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(REPO_KEY);
    set({ token: null, user: null, repos: [], selectedRepo: null });
  },
}));

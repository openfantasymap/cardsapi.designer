import { create } from 'zustand';
import type { GitHubUser } from '@/services/githubApi';

/**
 * GitHub auth state. We hold the user's *own* GitHub access token (obtained via
 * the PKCE OAuth flow) and talk to api.github.com directly — there is no server
 * session. The token is persisted in localStorage.
 */
interface GitHubStore {
  token: string | null;
  user: GitHubUser | null;
  loading: boolean;

  setAuth: (token: string, user: GitHubUser) => void;
  setUser: (user: GitHubUser | null) => void;
  setLoading: (loading: boolean) => void;
  logout: () => void;
}

const TOKEN_KEY = 'cardforge_gh_token';

export const useGitHubStore = create<GitHubStore>((set) => ({
  token: localStorage.getItem(TOKEN_KEY),
  user: null,
  loading: false,

  setAuth: (token, user) => {
    localStorage.setItem(TOKEN_KEY, token);
    set({ token, user });
  },
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  logout: () => {
    localStorage.removeItem(TOKEN_KEY);
    set({ token: null, user: null });
  },
}));

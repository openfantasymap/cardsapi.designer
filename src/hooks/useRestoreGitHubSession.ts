import { useEffect } from 'react';
import { useGitHubStore } from '@/store/useGitHubStore';
import { getUser } from '@/services/githubApi';

/** Validate the stored GitHub token on mount and populate the user (once). */
export const useRestoreGitHubSession = () => {
  const { token, user, setUser, setLoading, logout } = useGitHubStore();
  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      getUser(token)
        .then((u) => setUser(u))
        .catch(() => logout())
        .finally(() => setLoading(false));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);
};

import { useEffect, useRef } from 'react';
import { useGitHubStore } from '@/store/useGitHubStore';
import { handleGitHubCallback } from '@/services/github';
import { listRepos } from '@/services/api';
import { toast } from 'sonner';

/**
 * Watches for OAuth callback params (code & state) in the URL.
 * When found, exchanges them for a session and cleans up the URL.
 */
export const GitHubCallbackHandler = () => {
  const { setSession, setRepos, setLoading } = useGitHubStore();
  const processed = useRef(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (!code || !state || processed.current) return;
    processed.current = true;

    setLoading(true);

    handleGitHubCallback(code, state)
      .then(async (session) => {
        setSession(session.session_token, session.user);
        const repos = await listRepos(session.session_token);
        setRepos(repos);
        toast.success(`Signed in as ${session.user.login}`);
      })
      .catch(() => {
        toast.error('GitHub authentication failed');
      })
      .finally(() => {
        // Clean callback params from URL
        const url = new URL(window.location.href);
        url.searchParams.delete('code');
        url.searchParams.delete('state');
        window.history.replaceState({}, '', url.pathname + url.search);
        setLoading(false);
      });
  }, []);

  return null;
};

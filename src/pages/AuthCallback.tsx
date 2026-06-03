import { useEffect, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { completeLogin, consumeReturnTo } from '@/services/githubAuth';
import { getUser } from '@/services/githubApi';
import { useGitHubStore } from '@/store/useGitHubStore';
import { Loader2, Github } from 'lucide-react';
import { toast } from 'sonner';

/**
 * Handles the GitHub OAuth redirect: exchanges ?code for a token (via the
 * relay), loads the user, stores the session, and returns to where login
 * started.
 */
const AuthCallback = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { setAuth } = useGitHubStore();
  const [error, setError] = useState<string | null>(null);
  const done = useRef(false);

  useEffect(() => {
    if (done.current) return;
    done.current = true;

    const code = params.get('code');
    const state = params.get('state');
    const oauthError = params.get('error_description') || params.get('error');

    if (oauthError) {
      setError(oauthError);
      return;
    }
    if (!code || !state) {
      setError('Missing OAuth parameters.');
      return;
    }

    completeLogin(code, state)
      .then(async (token) => {
        const user = await getUser(token);
        setAuth(token, user);
        toast.success(`Signed in as ${user.login}`);
        navigate(consumeReturnTo(), { replace: true });
      })
      .catch((e) => setError(e instanceof Error ? e.message : String(e)));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="max-w-sm w-full text-center space-y-4">
        <Github className="mx-auto text-foreground" size={32} />
        {error ? (
          <>
            <h1 className="font-display text-lg font-semibold text-foreground">Sign-in failed</h1>
            <p className="text-sm text-destructive">{error}</p>
            <button
              className="text-xs text-primary hover:underline"
              onClick={() => navigate('/', { replace: true })}
            >
              Back to CardForge
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-center gap-2 text-muted-foreground">
              <Loader2 className="animate-spin" size={18} /> Completing sign-in…
            </div>
            <p className="text-xs text-muted-foreground">Exchanging your GitHub authorization code.</p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthCallback;

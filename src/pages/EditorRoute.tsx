import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProjectStore } from '@/store/useProjectStore';
import { useGitHubStore } from '@/store/useGitHubStore';
import { useRestoreGitHubSession } from '@/hooks/useRestoreGitHubSession';
import { CardEditor } from '@/components/CardEditor';
import { listProjects, loadProject } from '@/services/projects';
import { login } from '@/services/githubAuth';
import { useAutoSaveStore } from '@/store/autosave';
import { Loader2, Github } from 'lucide-react';

type State = 'resolving' | 'ready' | 'notfound';

/** /e/:slug — open a project for editing, loading it from GitHub if needed. */
const EditorRoute = () => {
  useRestoreGitHubSession();
  const { slug } = useParams<{ slug: string }>();
  const { token, user } = useGitHubStore();
  const { projects, setActiveProject, upsertProject } = useProjectStore();
  const [state, setState] = useState<State>('resolving');

  useEffect(() => {
    let cancelled = false;

    // 1. Already in the local store?
    const local = projects.find((p) => p.slug === slug);
    if (local) {
      setActiveProject(local.id);
      setState('ready');
      return;
    }

    // 2. Need GitHub to resolve. If a token exists but the user is still being
    //    restored, wait — the effect re-runs once `user` is set.
    if (!token) {
      setState('notfound');
      return;
    }
    if (!user) return;

    setState('resolving');
    (async () => {
      try {
        const entries = await listProjects(token, user.login);
        const entry = entries.find((e) => e.slug === slug);
        if (!entry) {
          if (!cancelled) setState('notfound');
          return;
        }
        const project = await loadProject(token, entry.repo);
        if (cancelled) return;
        upsertProject(project);
        useAutoSaveStore.getState().markSaved(project);
        setActiveProject(project.id);
        setState('ready');
      } catch {
        if (!cancelled) setState('notfound');
      }
    })();

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug, token, user?.login]);

  if (state === 'ready') return <CardEditor />;

  if (state === 'resolving') {
    return (
      <div className="min-h-screen flex items-center justify-center text-muted-foreground">
        <Loader2 className="animate-spin mr-2" size={18} /> Opening {slug}…
      </div>
    );
  }

  // not found
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-8">
      <div className="max-w-sm w-full text-center space-y-3">
        <h1 className="font-display text-lg font-semibold text-foreground">Can't open “{slug}”</h1>
        <p className="text-sm text-muted-foreground">
          {user
            ? 'No project with that slug was found in your GitHub library.'
            : 'Sign in to load this project from your GitHub repositories.'}
        </p>
        <div className="flex items-center justify-center gap-2 pt-1">
          {!user && (
            <button
              onClick={() => login(`/e/${slug}`)}
              className="inline-flex items-center gap-2 text-xs rounded-md border border-border px-3 py-1.5 hover:border-primary/50"
            >
              <Github size={14} /> Sign in with GitHub
            </button>
          )}
          <Link to="/" className="text-xs text-primary hover:underline">← Back to dashboard</Link>
        </div>
      </div>
    </div>
  );
};

export default EditorRoute;

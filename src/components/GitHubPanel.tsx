import { useState } from 'react';
import { useGitHubStore } from '@/store/useGitHubStore';
import { useProjectStore } from '@/store/useProjectStore';
import { login } from '@/services/githubAuth';
import { saveProject, loadProject, repoNameForProject } from '@/services/projects';
import { useAutoSaveStore } from '@/store/autosave';
import { Button } from '@/components/ui/button';
import { Github, LogOut, Save, Loader2, Download, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export const GitHubPanel = () => {
  const { token, user, loading, logout } = useGitHubStore();
  const { projects, activeProjectId, upsertProject } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const [saving, setSaving] = useState(false);
  const [reloading, setReloading] = useState(false);

  const repoName = project ? repoNameForProject(project.id) : '';
  const fullName = user && project ? `${user.login}/${repoName}` : '';

  const handleLogin = async () => {
    try {
      await login(window.location.pathname + window.location.search);
    } catch (e) {
      toast.error((e as Error).message || 'Failed to start GitHub login');
    }
  };

  const handleSave = async () => {
    if (!token || !user || !project) return;
    setSaving(true);
    try {
      const result = await saveProject(token, user.login, project);
      useAutoSaveStore.getState().markSaved(project);
      toast.success(`Saved ${result.fileCount} files to ${result.repo}`, {
        action: { label: 'Open', onClick: () => window.open(result.htmlUrl, '_blank') },
      });
    } catch (err) {
      toast.error((err as Error).message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleReload = async () => {
    if (!token || !fullName) return;
    setReloading(true);
    try {
      const loaded = await loadProject(token, fullName);
      upsertProject(loaded);
      useAutoSaveStore.getState().markSaved(loaded);
      toast.success(`Reloaded ${loaded.name} from GitHub`);
    } catch (err) {
      toast.error((err as Error).message || 'Reload failed');
    } finally {
      setReloading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="animate-spin text-primary" size={24} />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="max-w-sm w-full space-y-4">
          <div className="text-center">
            <Github className="mx-auto mb-3 text-foreground" size={32} />
            <h3 className="font-display text-sm font-semibold text-foreground">Connect to GitHub</h3>
            <p className="text-muted-foreground text-xs mt-1">
              Sign in to store this project in its own GitHub repository.
            </p>
          </div>
          <Button onClick={handleLogin} className="w-full gap-2 text-xs">
            <Github size={14} /> Sign in with GitHub
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      <div className="flex items-center gap-3">
        <img src={user.avatar_url} alt={user.login} className="w-8 h-8 rounded-full border border-border" />
        <div className="flex-1 min-w-0">
          <p className="font-display text-xs font-semibold text-foreground truncate">{user.name || user.login}</p>
          <p className="text-muted-foreground text-xs">@{user.login}</p>
        </div>
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={logout}>
          <LogOut size={14} />
        </Button>
      </div>

      {project && (
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            This project lives in its own {project.isPublic ? 'public' : 'private'} repo:
          </p>
          <a
            href={fullName ? `https://github.com/${fullName}` : '#'}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-primary hover:underline"
          >
            <Github size={12} /> {fullName} <ExternalLink size={10} />
          </a>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <code>project.json</code> + per-sheet <code>template / data.csv / data.json / card_N.html</code></li>
            <li>• <code>images/</code> — uploaded images as real files</li>
            {project.sheets.some((s) => s.template.elements.some((e) => e.tcgType || e.tcgProperty)) && (
              <li>• <code>cards.jsonld</code> — TCG annotations</li>
            )}
          </ul>
          <div className="flex gap-2">
            <Button onClick={handleSave} disabled={saving} className="flex-1 gap-2 text-xs">
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? 'Saving…' : 'Save to GitHub'}
            </Button>
            <Button onClick={handleReload} disabled={reloading} variant="outline" className="gap-2 text-xs" title="Reload from GitHub">
              {reloading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

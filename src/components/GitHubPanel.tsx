import { useEffect, useState } from 'react';
import { useGitHubStore } from '@/store/useGitHubStore';
import { useProjectStore } from '@/store/useProjectStore';
import { getMe, initiateGitHubAuth, logout as apiLogout } from '@/services/github';
import { listRepos, saveProject } from '@/services/api';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Github, LogOut, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export const GitHubPanel = () => {
  const { sessionToken, user, repos, selectedRepo, loading, setSession, setUser, setRepos, setSelectedRepo, setLoading, logout } = useGitHubStore();
  const { projects, activeProjectId } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (sessionToken && !user) {
      setLoading(true);
      getMe(sessionToken)
        .then((u) => {
          setUser(u);
          return listRepos(sessionToken);
        })
        .then((r) => setRepos(r))
        .catch(() => {
          toast.error('Session expired. Please log in again.');
          logout();
        })
        .finally(() => setLoading(false));
    }
  }, [sessionToken]);

  const handleLogin = async () => {
    try {
      const url = await initiateGitHubAuth(window.location.href);
      window.location.href = url;
    } catch {
      toast.error('Failed to start GitHub login');
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      await apiLogout(sessionToken).catch(() => {});
    }
    logout();
    toast.success('Logged out');
  };

  const handleSave = async () => {
    if (!sessionToken || !selectedRepo || !project) return;
    setSaving(true);
    try {
      const result = await saveProject(sessionToken, selectedRepo, project);
      toast.success(`Saved ${result.fileCount} files to ${selectedRepo}/${result.path}`);
    } catch (err: any) {
      toast.error(err.message || 'Save failed');
    } finally {
      setSaving(false);
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
              Sign in with your GitHub account to save projects to repositories.
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
        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive" onClick={handleLogout}>
          <LogOut size={14} />
        </Button>
      </div>

      <div>
        <Label className="text-xs text-muted-foreground">Repository</Label>
        <Select value={selectedRepo || ''} onValueChange={setSelectedRepo}>
          <SelectTrigger className="text-xs h-8 mt-1">
            <SelectValue placeholder="Select a repo" />
          </SelectTrigger>
          <SelectContent>
            {repos.map((r) => (
              <SelectItem key={r.full_name} value={r.full_name} className="text-xs">
                {r.full_name} {r.private ? '🔒' : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {selectedRepo && project && (
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Will save to <code className="text-primary">cardforge/{project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}/</code>
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            {project.sheets.map((s) => (
              <li key={s.id}>• <code>{s.name}/</code> — template + data + cards</li>
            ))}
          </ul>
          <Button onClick={handleSave} disabled={saving} className="w-full gap-2 text-xs">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? 'Saving…' : 'Save to GitHub'}
          </Button>
        </div>
      )}
    </div>
  );
};

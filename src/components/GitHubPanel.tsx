import { useEffect, useState } from 'react';
import { useGitHubStore } from '@/store/useGitHubStore';
import { useProjectStore } from '@/store/useProjectStore';
import { getUser, listRepos, saveProjectToRepo } from '@/services/github';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Github, LogOut, Save, Loader2, ExternalLink } from 'lucide-react';
import { toast } from 'sonner';

export const GitHubPanel = () => {
  const { token, user, repos, selectedRepo, loading, setToken, setUser, setRepos, setSelectedRepo, setLoading, logout } = useGitHubStore();
  const { projects, activeProjectId } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const [patInput, setPatInput] = useState('');
  const [saving, setSaving] = useState(false);

  // Authenticate on mount if token exists
  useEffect(() => {
    if (token && !user) {
      setLoading(true);
      getUser(token)
        .then((u) => {
          setUser(u);
          return listRepos(token);
        })
        .then((r) => setRepos(r))
        .catch(() => {
          toast.error('GitHub token is invalid or expired');
          logout();
        })
        .finally(() => setLoading(false));
    }
  }, [token]);

  const handleLogin = async () => {
    const t = patInput.trim();
    if (!t) return;
    setLoading(true);
    try {
      const u = await getUser(t);
      setToken(t);
      setUser(u);
      const r = await listRepos(t);
      setRepos(r);
      setPatInput('');
      toast.success(`Logged in as ${u.login}`);
    } catch {
      toast.error('Invalid token. Make sure it has repo scope.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!token || !selectedRepo || !project) return;
    setSaving(true);
    try {
      const result = await saveProjectToRepo(token, selectedRepo, project);
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
              Enter a Personal Access Token with <code className="text-primary">repo</code> scope to save your projects.
            </p>
          </div>
          <div>
            <Label className="text-xs text-muted-foreground">Personal Access Token</Label>
            <Input
              type="password"
              placeholder="ghp_..."
              value={patInput}
              onChange={(e) => setPatInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
              className="text-xs h-8 mt-1"
            />
          </div>
          <Button onClick={handleLogin} className="w-full gap-2 text-xs">
            <Github size={14} /> Connect
          </Button>
          <a
            href="https://github.com/settings/tokens/new?scopes=repo&description=CardForge"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-1 text-xs text-muted-foreground hover:text-primary transition-colors"
          >
            <ExternalLink size={10} /> Create a token on GitHub
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-4 gap-4">
      {/* User info */}
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

      {/* Repo selector */}
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

      {/* Save */}
      {selectedRepo && project && (
        <div className="border-t border-border pt-4 space-y-3">
          <p className="text-xs text-muted-foreground">
            Will save to <code className="text-primary">cardforge/{project.name.replace(/[^a-zA-Z0-9-_]/g, '_')}/</code>
          </p>
          <ul className="text-xs text-muted-foreground space-y-1">
            <li>• <code>template.json</code> — card template</li>
            <li>• <code>data.csv</code> — spreadsheet data</li>
            <li>• <code>cards/*.html</code> — rendered cards</li>
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

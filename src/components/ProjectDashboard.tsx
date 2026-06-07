import { useEffect, useMemo, useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useGitHubStore } from '@/store/useGitHubStore';
import { GitHubAuthButton } from '@/components/GitHubAuthButton';
import { listProjects, type IndexEntry } from '@/services/projects';
import { builtinTemplates, fetchGlobalTemplates, fetchPersonalTemplates, instantiate, type TemplateEntry } from '@/services/templates';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, Layers, Trash2, ArrowRight, Globe, Github, Loader2, RefreshCw, Download } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

export const ProjectDashboard = () => {
  const navigate = useNavigate();
  const { projects, createProject, deleteProject } = useProjectStore();
  const { token, user } = useGitHubStore();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [desc, setDesc] = useState('');
  const [selected, setSelected] = useState<TemplateEntry | null>(null); // null = Blank

  const builtins = useMemo(() => builtinTemplates(), []);
  const [globalT, setGlobalT] = useState<TemplateEntry[]>([]);
  const [personalT, setPersonalT] = useState<TemplateEntry[]>([]);
  const starters = globalT.length ? globalT : builtins; // global overrides built-ins when available

  const [remote, setRemote] = useState<IndexEntry[]>([]);
  const [syncing, setSyncing] = useState(false);

  const localIds = new Set(projects.map((p) => p.id));
  const remoteOnly = remote.filter((e) => !localIds.has(e.id));

  const syncFromGitHub = async () => {
    if (!token || !user) return;
    setSyncing(true);
    try {
      setRemote(await listProjects(token, user.login));
    } catch (err) {
      toast.error((err as Error).message || 'Failed to load projects from GitHub');
    } finally {
      setSyncing(false);
    }
  };

  // Auto-sync the index once we're connected.
  useEffect(() => {
    if (token && user) syncFromGitHub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, user?.login]);

  // Load the shared (global) template library, and personal templates when connected.
  useEffect(() => {
    fetchGlobalTemplates().then(setGlobalT);
  }, []);
  useEffect(() => {
    if (token && user) fetchPersonalTemplates(token, user.login).then(setPersonalT);
    else setPersonalT([]);
  }, [token, user?.login]);

  const pickTemplate = (entry: TemplateEntry | null) => {
    setSelected(entry);
    if (entry && !name.trim()) setName(entry.label);
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    const seed = selected ? instantiate(selected) : undefined;
    const id = createProject(name.trim(), desc.trim(), seed);
    const slug = useProjectStore.getState().projects.find((p) => p.id === id)?.slug ?? '';
    setName('');
    setDesc('');
    setSelected(null);
    setOpen(false);
    navigate(`/e/${slug}`);
  };

  // Open a project (local or from GitHub) by navigating to its slug URL;
  // /e/:slug resolves + loads it.
  const handleOpenRemote = (entry: IndexEntry) => navigate(`/e/${entry.slug}`);

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">
              Card<span className="text-primary">Forge</span>
            </h1>
            <p className="text-muted-foreground mt-1 font-body text-sm">
              Trading card creation workshop
            </p>
          </div>
          <div className="flex items-center gap-3">
            {user && (
              <Button variant="outline" size="sm" className="gap-2 text-xs" onClick={syncFromGitHub} disabled={syncing}>
                {syncing ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />} Sync
              </Button>
            )}
            <GitHubAuthButton />
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="gap-2">
                  <Plus size={16} /> New Project
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Create Project</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <Input
                    placeholder="Project name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                  />
                  <Textarea
                    placeholder="Description (optional)"
                    value={desc}
                    onChange={(e) => setDesc(e.target.value)}
                    rows={2}
                  />

                  <div>
                    <p className="text-xs font-display font-semibold text-muted-foreground uppercase tracking-wider mb-2">Start from</p>
                    <div className="grid grid-cols-2 gap-2 max-h-56 overflow-y-auto pr-1">
                      {/* Blank */}
                      <button
                        type="button"
                        onClick={() => pickTemplate(null)}
                        className={`text-left rounded-md border p-2.5 transition-colors ${selected === null ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                      >
                        <span className="text-xs font-display font-semibold text-foreground">Blank</span>
                        <span className="block text-[11px] text-muted-foreground mt-0.5">Empty card.</span>
                      </button>
                      {/* Starter (global, or built-in fallback) */}
                      {starters.map((t) => (
                        <button
                          key={`s-${t.id}`}
                          type="button"
                          onClick={() => pickTemplate(t)}
                          className={`text-left rounded-md border p-2.5 transition-colors ${selected?.id === t.id && selected?.group === t.group ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                        >
                          <span className="text-xs font-display font-semibold text-foreground truncate block">{t.label}</span>
                          <span className="block text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.description}</span>
                        </button>
                      ))}
                      {/* Personal */}
                      {personalT.map((t) => (
                        <button
                          key={`p-${t.id}`}
                          type="button"
                          onClick={() => pickTemplate(t)}
                          className={`text-left rounded-md border p-2.5 transition-colors ${selected?.id === t.id && selected?.group === 'personal' ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'}`}
                        >
                          <span className="text-xs font-display font-semibold text-foreground truncate block">{t.label} <span className="text-primary">★</span></span>
                          <span className="block text-[11px] text-muted-foreground mt-0.5 line-clamp-2">{t.description || 'Your template'}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button onClick={handleCreate} className="w-full">Create</Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {projects.length === 0 && remoteOnly.length === 0 ? (
          <div className="text-center py-24 animate-fade-in">
            <Layers size={48} className="mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-lg">No projects yet</p>
            <p className="text-muted-foreground text-sm mt-1">
              {user ? 'Create your first card project to get started' : 'Create one, or sign in to load projects from GitHub'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-fade-in">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group bg-card border border-border rounded-lg p-5 hover:border-primary/40 hover:shadow-glow transition-all cursor-pointer"
                onClick={() => navigate(`/e/${project.slug}`)}
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-semibold text-foreground truncate">
                      {project.name}
                    </h3>
                    {project.description && (
                      <p className="text-muted-foreground text-xs mt-1 line-clamp-2">
                        {project.description}
                      </p>
                    )}
                    <p className="text-muted-foreground text-xs mt-2 font-display">
                      {project.sheets.length} template{project.sheets.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                  <div className="flex gap-1 ml-2">
                    {project.isPublic && (
                      <Link
                        to={`/p/${project.slug}`}
                        onClick={(e) => e.stopPropagation()}
                        className="h-7 w-7 flex items-center justify-center text-primary opacity-0 group-hover:opacity-100 hover:text-primary/80"
                        title={`View public page (/p/${project.slug})`}
                      >
                        <Globe size={14} />
                      </Link>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive"
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteProject(project.id);
                      }}
                    >
                      <Trash2 size={14} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 opacity-0 group-hover:opacity-100 text-primary"
                    >
                      <ArrowRight size={14} />
                    </Button>
                  </div>
                </div>
              </div>
            ))}

            {/* Projects that exist on GitHub but aren't open locally yet. */}
            {remoteOnly.map((entry) => (
              <button
                key={entry.repo}
                onClick={() => handleOpenRemote(entry)}
                className="group text-left bg-card/50 border border-dashed border-border rounded-lg p-5 hover:border-primary/40 transition-all"
              >
                <div className="flex items-start justify-between">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-display text-sm font-semibold text-foreground truncate flex items-center gap-1.5">
                      <Github size={13} className="text-muted-foreground" /> {entry.name}
                    </h3>
                    {entry.description && (
                      <p className="text-muted-foreground text-xs mt-1 line-clamp-2">{entry.description}</p>
                    )}
                    <p className="text-muted-foreground text-xs mt-2 font-mono truncate">{entry.repo}</p>
                  </div>
                  <div className="ml-2 text-muted-foreground group-hover:text-primary">
                    <Download size={14} />
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

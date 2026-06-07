import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useHistoryStore } from '@/store/history';
import { useAutoSaveStore } from '@/store/autosave';
import { slugify } from '@/types/card';
import { CardCanvas } from '@/components/CardCanvas';
import { ElementPanel } from '@/components/ElementPanel';
import { SpreadsheetPanel } from '@/components/SpreadsheetPanel';
import { CardPreviewGrid } from '@/components/CardPreviewGrid';
import { AssetsPanel } from '@/components/AssetsPanel';
import { GitHubPanel } from '@/components/GitHubPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowLeft, Upload, Github, Plus, X, Download, FileJson, FileText, RotateCcw, Globe, Copy, Check, Undo2, Redo2, CopyPlus, SquareStack, Image as ImageIcon, Loader2, Cloud, CloudOff, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from '@/components/ui/dropdown-menu';
import { exportProjectJson, exportProjectZip, exportProjectPdfRemote } from '@/services/export';
import { exportProjectImages, exportProjectPdf as exportProjectPdfLocalGenerated } from '@/services/render';
import { savePersonalTemplate } from '@/services/templates';
import { repoNameForProject } from '@/services/projects';
import { setRepoVisibility } from '@/services/githubApi';
import { useGitHubStore } from '@/store/useGitHubStore';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const CardEditor = () => {
  const {
    projects, activeProjectId, activeSheetId, activeFace,
    setActiveProject, setActiveSheet, setActiveFace,
    addSheet, duplicateSheet, removeSheet, renameSheet,
    updateTemplateBackground, enableBackTemplate, removeBackTemplate, togglePublic, updateSlug,
    editingProjectBack, editProjectBack, exitProjectBack,
  } = useProjectStore();
  const { undo, redo, past, future } = useHistoryStore();
  const { status: saveStatus, saveNow } = useAutoSaveStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const sheet = project?.sheets.find((s) => s.id === activeSheetId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState('');
  const [copied, setCopied] = useState(false);
  const [tab, setTab] = useState('design');

  // Undo / redo keyboard shortcuts (skip while typing in a field).
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = document.activeElement;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if ((e.metaKey || e.ctrlKey) && (e.key === 'z' || e.key === 'Z')) {
        e.preventDefault();
        if (e.shiftKey) redo(); else undo();
      } else if ((e.metaKey || e.ctrlKey) && (e.key === 'y' || e.key === 'Y')) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undo, redo]);

  const handleSlugEdit = () => {
    setSlugValue(project?.slug ?? '');
    setEditingSlug(true);
  };

  const handleSlugSave = () => {
    if (activeProjectId && slugValue.trim()) {
      const ok = updateSlug(activeProjectId, slugValue.trim());
      if (!ok) toast.error('Slug already taken or invalid');
    }
    setEditingSlug(false);
  };

  const handleCopyUrl = () => {
    if (!project?.slug) return;
    navigator.clipboard.writeText(`${window.location.origin}/p/${project.slug}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  if (!project) return null;

  const handleBgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !activeProjectId) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateTemplateBackground(activeProjectId, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAddSheet = () => {
    if (!activeProjectId) return;
    const name = `Card ${project.sheets.length + 1}`;
    addSheet(activeProjectId, name);
  };

  const handleStartRename = (sheetId: string, currentName: string) => {
    setRenamingSheetId(sheetId);
    setRenameValue(currentName);
  };

  const handleFinishRename = () => {
    if (renamingSheetId && renameValue.trim() && activeProjectId) {
      renameSheet(activeProjectId, renamingSheetId, renameValue.trim());
    }
    setRenamingSheetId(null);
  };

  // Toggle the app's public flag AND the GitHub repo's visibility.
  const handleTogglePublic = async () => {
    if (!activeProjectId || !project) return;
    const next = !project.isPublic;
    togglePublic(activeProjectId); // optimistic
    const gh = useGitHubStore.getState();
    if (!gh.token || !gh.user) return; // not signed in — local flag only (applied on first save)
    try {
      const repo = await setRepoVisibility(gh.token, `${gh.user.login}/${repoNameForProject(project.id)}`, next);
      if (repo === null) toast.message(`Will be created ${next ? 'public' : 'private'} on first save`);
      else toast.success(`Repository is now ${next ? 'public' : 'private'}`);
    } catch (e: any) {
      togglePublic(activeProjectId); // revert on failure
      toast.error(e.message || 'Failed to change repository visibility');
    }
  };

  const handleSaveTemplate = async () => {
    const gh = useGitHubStore.getState();
    if (!gh.token || !gh.user) { toast.error('Sign in to save a template'); return; }
    if (!sheet) return;
    const label = window.prompt('Template name', `${project.name} template`);
    if (!label || !label.trim()) return;
    try {
      await savePersonalTemplate(gh.token, gh.user.login, {
        id: slugify(label.trim()),
        label: label.trim(),
        description: project.description || '',
        template: sheet.template,
        rows: sheet.rows.slice(0, 3),
        iconStylesheets: project.iconStylesheets,
      });
      toast.success('Saved to your templates');
    } catch (e: any) {
      toast.error(e.message || 'Failed to save template');
    }
  };

  const handleToggleBack = () => {
    if (!activeProjectId) return;
    if (sheet?.backTemplate) {
      removeBackTemplate(activeProjectId);
      toast.success('Back template removed');
    } else {
      enableBackTemplate(activeProjectId);
      setActiveFace('back');
      toast.success('Back template enabled');
    }
  };

  return (
    <div className="fixed inset-0 overflow-hidden flex flex-col bg-background">
      <header className="h-12 border-b border-border flex items-center px-4 gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveProject(null)}>
          <ArrowLeft size={16} />
        </Button>
        <div className="flex flex-col justify-center min-w-0">
          <h2 className="font-display text-sm font-semibold text-foreground truncate leading-tight">
            {project.name}
          </h2>
          {editingSlug ? (
            <input
              className="text-xs font-mono text-muted-foreground bg-transparent border-b border-border outline-none w-36 leading-tight"
              value={slugValue}
              onChange={(e) => setSlugValue(e.target.value)}
              onBlur={handleSlugSave}
              onKeyDown={(e) => { if (e.key === 'Enter') handleSlugSave(); if (e.key === 'Escape') setEditingSlug(false); }}
              autoFocus
            />
          ) : (
            <button
              onClick={handleSlugEdit}
              className="text-xs font-mono text-muted-foreground hover:text-foreground text-left leading-tight truncate"
              title="Click to edit slug"
            >
              /p/{project.slug}
            </button>
          )}
        </div>
        <div className="ml-auto flex gap-2 items-center">
          {/* Auto-save status (click = save now) */}
          <button
            onClick={() => saveNow()}
            title="Auto-save to GitHub — click to save now"
            className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
          >
            {saveStatus === 'saving' && (<><Loader2 size={12} className="animate-spin" /> Saving…</>)}
            {saveStatus === 'saved' && (<><Check size={12} className="text-green-500" /> Saved</>)}
            {saveStatus === 'dirty' && (<><Cloud size={12} /> Unsaved…</>)}
            {saveStatus === 'error' && (<span className="flex items-center gap-1 text-destructive"><AlertCircle size={12} /> Retry save</span>)}
            {(saveStatus === 'offline' || saveStatus === 'idle') && (<><CloudOff size={12} /> {saveStatus === 'offline' ? 'Local only' : 'Saved'}</>)}
          </button>
          <div className="border-l border-border h-6" />

          {/* Undo / redo */}
          <div className="flex items-center gap-0.5">
            <Button variant="ghost" size="icon" className="h-8 w-8 disabled:opacity-40" title="Undo (⌘Z)" disabled={past.length === 0} onClick={undo}>
              <Undo2 size={15} />
            </Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 disabled:opacity-40" title="Redo (⇧⌘Z)" disabled={future.length === 0} onClick={redo}>
              <Redo2 size={15} />
            </Button>
          </div>
          <div className="border-l border-border h-6" />

          {/* Public toggle + copy URL */}
          <div className="flex items-center gap-1.5">
            <Globe size={12} className={project.isPublic ? 'text-primary' : 'text-muted-foreground'} />
            <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="public-toggle">Public</Label>
            <Switch
              id="public-toggle"
              checked={!!project.isPublic}
              onCheckedChange={handleTogglePublic}
              className="scale-75"
            />
            {project.isPublic && (
              <button onClick={handleCopyUrl} className="text-muted-foreground hover:text-foreground" title="Copy public URL">
                {copied ? <Check size={12} className="text-green-500" /> : <Copy size={12} />}
              </button>
            )}
          </div>

          <div className="border-l border-border h-6" />

          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload size={12} /> Template BG
          </Button>

          {/* Back template toggle */}
          <Button
            variant={sheet?.backTemplate ? 'default' : 'outline'}
            size="sm"
            className="gap-1 text-xs"
            onClick={handleToggleBack}
          >
            <RotateCcw size={12} /> {sheet?.backTemplate ? 'Remove Back' : 'Add Back'}
          </Button>

          {/* Global card back editor */}
          <Button
            variant={editingProjectBack ? 'default' : 'outline'}
            size="sm"
            className="gap-1 text-xs"
            title="Design the shared card back (used as the default when adding a back to a sheet)"
            onClick={() => { if (editingProjectBack) { exitProjectBack(); } else { setTab('design'); editProjectBack(activeProjectId!); } }}
          >
            <SquareStack size={12} /> Card Back
          </Button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <Download size={12} /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => { exportProjectJson(project); toast.success('JSON exported'); }}>
                <FileJson size={14} className="mr-2" /> JSON
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => { await exportProjectZip(project); toast.success('ZIP exported'); }}>
                <Download size={14} className="mr-2" /> ZIP (JSON + HTML)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.promise(exportProjectImages(project), {
                loading: 'Rendering images…', success: 'Images downloaded', error: (e) => e?.message || 'Render failed',
              })}>
                <ImageIcon size={14} className="mr-2" /> Images (PNG)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => toast.promise(exportProjectPdfLocalGenerated(project), {
                loading: 'Rendering PDF…', success: 'PDF downloaded', error: (e) => e?.message || 'Render failed',
              })}>
                <FileText size={14} className="mr-2" /> PDF (local)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={async () => {
                try {
                  await exportProjectPdfRemote(project);
                  toast.success('PDF exported');
                } catch (err: any) {
                  toast.error(err.message || 'Remote PDF failed');
                }
              }}>
                <FileText size={14} className="mr-2" /> PDF (remote — high fidelity)
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSaveTemplate}>
                <SquareStack size={14} className="mr-2" /> Save as template…
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1 text-xs">
                <Github size={12} /> GitHub
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>GitHub</SheetTitle>
              </SheetHeader>
              <GitHubPanel />
            </SheetContent>
          </Sheet>
        </div>
      </header>

      {/* Sheet tabs */}
      <div className="border-b border-border px-4 flex items-center gap-1 h-9 overflow-x-auto">
        {project.sheets.map((s) => (
          <div key={s.id} className="flex items-center">
            {renamingSheetId === s.id ? (
              <Input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                onBlur={handleFinishRename}
                onKeyDown={(e) => e.key === 'Enter' && handleFinishRename()}
                className="text-xs h-6 w-24 px-1"
                autoFocus
              />
            ) : (
              <Button
                variant={activeSheetId === s.id ? 'default' : 'ghost'}
                size="sm"
                className="text-xs h-7 px-3 gap-1"
                onClick={() => setActiveSheet(s.id)}
                onDoubleClick={() => handleStartRename(s.id, s.name)}
              >
                {s.name}
                {project.sheets.length > 1 && activeSheetId === s.id && (
                  <X
                    size={10}
                    className="ml-1 hover:text-destructive"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeSheet(activeProjectId!, s.id);
                    }}
                  />
                )}
              </Button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="icon" className="h-7 w-7" title="Add sheet" onClick={handleAddSheet}>
          <Plus size={12} />
        </Button>
        {activeSheetId && (
          <Button variant="ghost" size="icon" className="h-7 w-7" title="Duplicate sheet" onClick={() => duplicateSheet(activeProjectId!, activeSheetId)}>
            <CopyPlus size={12} />
          </Button>
        )}
      </div>

      {/* Global-back editing banner */}
      {editingProjectBack && (
        <div className="bg-primary/10 border-b border-primary/30 px-4 py-1.5 flex items-center gap-2 text-xs">
          <SquareStack size={12} className="text-primary shrink-0" />
          <span className="text-foreground">
            Editing the <strong>global card back</strong> — used as the default when you add a back to a sheet.
          </span>
          <Button variant="ghost" size="sm" className="ml-auto h-6 text-xs" onClick={exitProjectBack}>Done</Button>
        </div>
      )}

      {sheet && (
        <Tabs value={tab} onValueChange={setTab} className="flex-1 min-h-0 flex flex-col overflow-hidden">
          <div className="border-b border-border px-4 flex items-center">
            <TabsList className="h-9 bg-transparent p-0 gap-4">
              <TabsTrigger value="design" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-xs font-display">
                Design
              </TabsTrigger>
              <TabsTrigger value="data" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-xs font-display">
                Spreadsheet
              </TabsTrigger>
              <TabsTrigger value="preview" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-xs font-display">
                Preview ({sheet.rows.length})
              </TabsTrigger>
              <TabsTrigger value="assets" className="data-[state=active]:bg-transparent data-[state=active]:text-primary data-[state=active]:shadow-none text-xs font-display">
                Assets ({Object.keys(project.assets ?? {}).length})
              </TabsTrigger>
            </TabsList>

            {/* Front/Back face toggle — only in Design tab context */}
            {sheet.backTemplate && !editingProjectBack && (
              <div className="ml-auto flex gap-1">
                <button
                  onClick={() => setActiveFace('front')}
                  className={`text-xs font-display px-3 py-1 rounded transition-colors ${activeFace === 'front' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  Front
                </button>
                <button
                  onClick={() => setActiveFace('back')}
                  className={`text-xs font-display px-3 py-1 rounded transition-colors ${activeFace === 'back' ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
                >
                  Back
                </button>
              </div>
            )}
          </div>

          <TabsContent value="design" className="flex-1 data-[state=active]:flex overflow-hidden mt-0 min-h-0">
            <CardCanvas />
            <ElementPanel />
          </TabsContent>

          <TabsContent value="data" className="flex-1 min-h-0 data-[state=active]:flex overflow-hidden mt-0 items-start">
            <SpreadsheetPanel />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 min-h-0 data-[state=active]:flex overflow-hidden mt-0 items-start">
            <CardPreviewGrid />
          </TabsContent>

          <TabsContent value="assets" className="flex-1 min-h-0 data-[state=active]:flex overflow-hidden mt-0 items-start">
            <AssetsPanel />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

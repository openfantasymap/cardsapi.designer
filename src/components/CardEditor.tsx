import { useState, useRef, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { useHistoryStore } from '@/store/history';
import { slugify } from '@/types/card';
import { CardCanvas } from '@/components/CardCanvas';
import { ElementPanel } from '@/components/ElementPanel';
import { SpreadsheetPanel } from '@/components/SpreadsheetPanel';
import { CardPreviewGrid } from '@/components/CardPreviewGrid';
import { GitHubPanel } from '@/components/GitHubPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowLeft, Upload, Github, Plus, X, Download, FileJson, FileText, RotateCcw, Globe, Copy, Check, Undo2, Redo2, CopyPlus } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportProjectJson, exportProjectZip, exportProjectPdfLocal, exportProjectPdfRemote } from '@/services/export';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';

export const CardEditor = () => {
  const {
    projects, activeProjectId, activeSheetId, activeFace,
    setActiveProject, setActiveSheet, setActiveFace,
    addSheet, duplicateSheet, removeSheet, renameSheet,
    updateTemplateBackground, enableBackTemplate, removeBackTemplate, togglePublic, updateSlug,
  } = useProjectStore();
  const { undo, redo, past, future } = useHistoryStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const sheet = project?.sheets.find((s) => s.id === activeSheetId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [editingSlug, setEditingSlug] = useState(false);
  const [slugValue, setSlugValue] = useState('');
  const [copied, setCopied] = useState(false);

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
    <div className="h-screen overflow-hidden flex flex-col bg-background">
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
              onCheckedChange={() => activeProjectId && togglePublic(activeProjectId)}
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
              <DropdownMenuItem onClick={() => {
                try {
                  exportProjectPdfLocal(project);
                } catch (err: any) {
                  toast.error(err.message || 'Local PDF failed');
                }
              }}>
                <FileText size={14} className="mr-2" /> PDF (local — print/save)
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

      {sheet && (
        <Tabs defaultValue="design" className="flex-1 min-h-0 flex flex-col overflow-hidden">
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
            </TabsList>

            {/* Front/Back face toggle — only in Design tab context */}
            {sheet.backTemplate && (
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

          <TabsContent value="design" className="flex-1 flex overflow-hidden mt-0 min-h-0">
            <CardCanvas />
            <ElementPanel />
          </TabsContent>

          <TabsContent value="data" className="flex-1 flex overflow-hidden mt-0 items-start">
            <SpreadsheetPanel />
          </TabsContent>

          <TabsContent value="preview" className="flex-1 flex overflow-hidden mt-0 items-start">
            <CardPreviewGrid />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

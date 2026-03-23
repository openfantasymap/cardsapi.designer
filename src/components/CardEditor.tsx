import { useState, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { CardCanvas } from '@/components/CardCanvas';
import { ElementPanel } from '@/components/ElementPanel';
import { SpreadsheetPanel } from '@/components/SpreadsheetPanel';
import { CardPreviewGrid } from '@/components/CardPreviewGrid';
import { GitHubPanel } from '@/components/GitHubPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { ArrowLeft, Upload, Github, Plus, X, Download, FileJson, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { exportProjectJson, exportProjectZip, exportProjectPdf } from '@/services/export';
import { useGitHubStore } from '@/store/useGitHubStore';

export const CardEditor = () => {
  const { projects, activeProjectId, activeSheetId, setActiveProject, setActiveSheet, addSheet, removeSheet, renameSheet, updateTemplateBackground } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const sheet = project?.sheets.find((s) => s.id === activeSheetId);
  const fileRef = useRef<HTMLInputElement>(null);
  const [renamingSheetId, setRenamingSheetId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState('');

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

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="h-12 border-b border-border flex items-center px-4 gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setActiveProject(null)}>
          <ArrowLeft size={16} />
        </Button>
        <h2 className="font-display text-sm font-semibold text-foreground truncate">
          {project.name}
        </h2>
        <div className="ml-auto flex gap-2">
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleBgUpload} />
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload size={12} /> Template BG
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
              <DropdownMenuItem onClick={async () => {
                try {
                  const token = useGitHubStore.getState().token;
                  await exportProjectPdf(project, token || undefined);
                  toast.success('PDF exported');
                } catch (err: any) {
                  toast.error(err.message || 'PDF export failed');
                }
              }}>
                <FileText size={14} className="mr-2" /> PDF (via backend)
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
        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={handleAddSheet}>
          <Plus size={12} />
        </Button>
      </div>

      {sheet && (
        <Tabs defaultValue="design" className="flex-1 flex flex-col overflow-hidden">
          <div className="border-b border-border px-4">
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

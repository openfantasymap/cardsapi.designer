import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { CardCanvas } from '@/components/CardCanvas';
import { ElementPanel } from '@/components/ElementPanel';
import { SpreadsheetPanel } from '@/components/SpreadsheetPanel';
import { CardPreviewGrid } from '@/components/CardPreviewGrid';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ArrowLeft, Upload } from 'lucide-react';
import { useRef } from 'react';

export const CardEditor = () => {
  const { projects, activeProjectId, setActiveProject, updateTemplateBackground } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const fileRef = useRef<HTMLInputElement>(null);

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
        </div>
      </header>

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
              Preview ({project.rows.length})
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="design" className="flex-1 flex overflow-hidden mt-0">
          <CardCanvas />
          <ElementPanel />
        </TabsContent>

        <TabsContent value="data" className="flex-1 flex overflow-hidden mt-0">
          <SpreadsheetPanel />
        </TabsContent>

        <TabsContent value="preview" className="flex-1 flex overflow-hidden mt-0">
          <CardPreviewGrid />
        </TabsContent>
      </Tabs>
    </div>
  );
};

import { useProjectStore } from '@/store/useProjectStore';
import { CardCanvas } from '@/components/CardCanvas';
import { ElementPanel } from '@/components/ElementPanel';
import { Button } from '@/components/ui/button';
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
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleBgUpload}
          />
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => fileRef.current?.click()}>
            <Upload size={12} /> Template BG
          </Button>
        </div>
      </header>
      <div className="flex flex-1 overflow-hidden">
        <CardCanvas />
        <ElementPanel />
      </div>
    </div>
  );
};

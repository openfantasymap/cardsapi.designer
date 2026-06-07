import { useRef, useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { CardElement } from '@/types/card';
import { Button } from '@/components/ui/button';
import { Upload, Trash2, Copy, ImagePlus, Check } from 'lucide-react';
import { toast } from 'sonner';

const generateId = () => Math.random().toString(36).slice(2, 10);
const sanitize = (name: string) => name.replace(/[^a-zA-Z0-9._-]/g, '_');

/**
 * Project asset library. Upload image files (drag-drop or picker); reference
 * them from the spreadsheet by filename and bind an image element to that
 * column ({{art}}), or drop one in directly as an image element.
 */
export const AssetsPanel = () => {
  const { projects, activeProjectId, addAssets, removeAsset, addElement, setSelectedElement } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragOver, setDragOver] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);

  if (!project || !activeProjectId) return null;
  const assets = project.assets ?? {};
  const names = Object.keys(assets).sort();

  const ingest = (files: FileList | File[]) => {
    const images = Array.from(files).filter((f) => f.type.startsWith('image/'));
    if (!images.length) return;
    const existing = new Set(Object.keys(assets));
    Promise.all(
      images.map(
        (file) =>
          new Promise<{ name: string; dataUrl: string }>((resolve) => {
            const reader = new FileReader();
            reader.onload = () => {
              let name = sanitize(file.name);
              while (existing.has(name)) {
                const dot = name.lastIndexOf('.');
                name = dot > 0 ? `${name.slice(0, dot)}_1${name.slice(dot)}` : `${name}_1`;
              }
              existing.add(name);
              resolve({ name, dataUrl: reader.result as string });
            };
            reader.readAsDataURL(file);
          }),
      ),
    ).then((entries) => {
      addAssets(activeProjectId, entries);
      toast.success(`Added ${entries.length} asset${entries.length !== 1 ? 's' : ''}`);
    });
  };

  const copyName = (name: string) => {
    navigator.clipboard.writeText(name);
    setCopied(name);
    setTimeout(() => setCopied((c) => (c === name ? null : c)), 1200);
  };

  const addAsImage = (name: string) => {
    const el: CardElement = {
      id: generateId(), type: 'image', tag: name, x: 20, y: 20, width: 160, height: 200,
      style: { imageUrl: name },
    };
    addElement(activeProjectId, el);
    setSelectedElement(el.id);
    toast.success(`Added ${name} to the card`);
  };

  return (
    <div className="flex-1 min-h-0 overflow-auto p-6">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => { if (e.target.files) ingest(e.target.files); e.target.value = ''; }}
      />

      <div
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => { e.preventDefault(); setDragOver(false); ingest(e.dataTransfer.files); }}
        onClick={() => inputRef.current?.click()}
        className={`mb-5 rounded-lg border-2 border-dashed p-8 text-center cursor-pointer transition-colors ${
          dragOver ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/40'
        }`}
      >
        <Upload className="mx-auto mb-2 text-muted-foreground" size={24} />
        <p className="text-sm text-foreground">Drop images here or click to upload</p>
        <p className="text-xs text-muted-foreground mt-1">
          Reference an asset by its filename in a column, then bind an image element to <code className="text-primary">{'{{column}}'}</code>.
        </p>
      </div>

      {names.length === 0 ? (
        <p className="text-center text-sm text-muted-foreground py-10">No assets yet.</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
          {names.map((name) => (
            <div key={name} className="group rounded-lg border border-border overflow-hidden bg-card">
              <div className="aspect-square bg-muted/30 flex items-center justify-center overflow-hidden">
                <img src={assets[name]} alt={name} className="max-w-full max-h-full object-contain" />
              </div>
              <div className="p-2">
                <p className="text-[11px] font-mono truncate text-foreground" title={name}>{name}</p>
                <div className="flex items-center gap-1 mt-1">
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Copy filename" onClick={() => copyName(name)}>
                    {copied === name ? <Check size={11} className="text-green-500" /> : <Copy size={11} />}
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6" title="Add to card as image" onClick={() => addAsImage(name)}>
                    <ImagePlus size={11} />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-6 w-6 ml-auto hover:text-destructive" title="Delete asset" onClick={() => removeAsset(activeProjectId, name)}>
                    <Trash2 size={11} />
                  </Button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

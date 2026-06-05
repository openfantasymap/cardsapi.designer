import { useState, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { CardElement, TCG_SCHEMA_CLASSES, TCG_SCHEMA_PROPERTIES } from '@/types/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { FontPicker } from '@/components/FontPicker';
import {
  Type, Diamond, Trash2, Minus, SeparatorVertical, FileImage, Image as ImageIcon, Eye,
  Copy, Bold, Italic, AlignLeft, AlignCenter, AlignRight,
  ChevronsUp, ChevronUp, ChevronDown, ChevronsDown, Upload, X,
} from 'lucide-react';

const generateId = () => Math.random().toString(36).slice(2, 10);

/** A small uppercase section header used to group the panel. */
const SectionLabel = ({ children }: { children: React.ReactNode }) => (
  <h3 className="font-display text-[11px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">{children}</h3>
);

export const ElementPanel = () => {
  const {
    projects, activeProjectId, activeSheetId, selectedElementId, activeFace, editingProjectBack,
    addElement, updateElement, removeElement, duplicateElement, reorderElement, setSelectedElement,
  } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const sheet = project?.sheets.find((s) => s.id === activeSheetId);
  const template = editingProjectBack ? project?.back : activeFace === 'back' ? sheet?.backTemplate : sheet?.template;
  const selectedElement = template?.elements.find((el) => el.id === selectedElementId);
  const [newTag, setNewTag] = useState('');
  const svgRef = useRef<HTMLInputElement>(null);
  const imgRef = useRef<HTMLInputElement>(null);
  const replaceImgRef = useRef<HTMLInputElement>(null);
  const columns: string[] = Array.from(new Set((sheet?.rows ?? []).flatMap((r) => Object.keys(r))));

  if (!template || !activeProjectId) return null;

  const setStyle = (patch: Partial<CardElement['style']>) => {
    if (!selectedElement) return;
    updateElement(activeProjectId, selectedElement.id, { style: { ...selectedElement.style, ...patch } });
  };

  const handleAddElement = (type: CardElement['type'], dataUrl?: string) => {
    const defaults: Record<string, { w: number; h: number }> = {
      text: { w: 200, h: 32 }, icon: { w: 40, h: 40 }, hline: { w: 200, h: 2 },
      vline: { w: 2, h: 100 }, svg: { w: 60, h: 60 }, image: { w: 160, h: 200 },
    };
    const d = defaults[type] ?? { w: 80, h: 80 };
    const tag = newTag.trim() || `{{${type}}}`;
    const element: CardElement = {
      id: generateId(), type, tag, x: 20, y: 20 + template.elements.length * 40, width: d.w, height: d.h,
      style: {
        fontSize: type === 'text' ? 14 : 24, color: 'hsl(210 20% 92%)',
        strokeWidth: (type === 'hline' || type === 'vline') ? 2 : undefined,
        svgData: type === 'svg' ? dataUrl : undefined,
        imageUrl: type === 'image' ? dataUrl : undefined,
      },
    };
    addElement(activeProjectId, element);
    setSelectedElement(element.id);
    setNewTag('');
  };

  // Read a picked file as a data URL and hand it to `done` (then clear the input).
  const readFile = (e: React.ChangeEvent<HTMLInputElement>, done: (dataUrl: string) => void) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => done(reader.result as string);
    reader.readAsDataURL(file);
  };

  const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => readFile(e, (d) => handleAddElement('svg', d));
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => readFile(e, (d) => handleAddElement('image', d));
  const handleReplaceSvg = (e: React.ChangeEvent<HTMLInputElement>) => readFile(e, (d) => setStyle({ svgData: d }));
  const handleReplaceImage = (e: React.ChangeEvent<HTMLInputElement>) => readFile(e, (d) => setStyle({ imageUrl: d }));

  const iconMap: Record<string, React.ReactNode> = {
    text: <Type size={12} />, icon: <Diamond size={12} />, hline: <Minus size={12} />,
    vline: <SeparatorVertical size={12} />, svg: <FileImage size={12} />, image: <ImageIcon size={12} />,
  };

  const num = (v: number | undefined, fallback: number) => (v === undefined ? fallback : v);
  const isText = selectedElement?.type === 'text';
  const isLine = selectedElement?.type === 'hline' || selectedElement?.type === 'vline';

  return (
    <div className="w-72 min-w-[18rem] shrink-0 h-full bg-card border-l border-border p-4 overflow-y-auto flex flex-col gap-5">
      {/* Add */}
      <div>
        <SectionLabel>Add Element</SectionLabel>
        <Input placeholder="Tag, e.g. {{name}}" value={newTag} onChange={(e) => setNewTag(e.target.value)} className="text-xs h-8" />
        <p className="text-[11px] text-muted-foreground mt-1 mb-2 leading-snug">
          Bind to a spreadsheet column with <code className="text-primary">{'{{column}}'}</code>, or leave blank for static content.
        </p>
        <input ref={imgRef} type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
        <input ref={svgRef} type="file" accept=".svg,image/svg+xml" className="hidden" onChange={handleSvgUpload} />
        <div className="grid grid-cols-2 gap-2">
          <Button variant="default" size="sm" className="gap-1 text-xs" onClick={() => imgRef.current?.click()}><ImageIcon size={12} /> Image</Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleAddElement('text')}><Type size={12} /> Text</Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => svgRef.current?.click()}><FileImage size={12} /> SVG</Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleAddElement('icon')}><Diamond size={12} /> Icon</Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleAddElement('hline')}><Minus size={12} /> H-Line</Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleAddElement('vline')}><SeparatorVertical size={12} /> V-Line</Button>
        </div>
        <p className="text-[11px] text-muted-foreground mt-1.5 leading-snug">
          <strong>Image</strong> uploads a file. For per-card art, set its tag to a column like <code className="text-primary">{'{{art}}'}</code>.
        </p>
      </div>

      {/* Layers list */}
      <div>
        <SectionLabel>Elements ({template.elements.length})</SectionLabel>
        <div className="space-y-1">
          {/* topmost first */}
          {[...template.elements].reverse().map((el) => (
            <div
              key={el.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                selectedElementId === el.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-muted-foreground'
              }`}
              onClick={() => setSelectedElement(el.id)}
            >
              {iconMap[el.type] ?? <Diamond size={12} />}
              <span className="flex-1 truncate font-display">{el.tag}</span>
              {el.visibleIfField && <Eye size={10} className="text-primary shrink-0" />}
              <Button variant="ghost" size="icon" className="h-5 w-5 hover:text-destructive" onClick={(e) => { e.stopPropagation(); removeElement(activeProjectId, el.id); }}>
                <Trash2 size={10} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {selectedElement && (
        <>
          {/* Layer actions */}
          <div className="border-t border-border pt-4">
            <SectionLabel>Layer</SectionLabel>
            <div className="flex gap-1">
              <Button variant="outline" size="icon" className="h-8 w-8" title="Bring to front" onClick={() => reorderElement(activeProjectId, selectedElement.id, 'front')}><ChevronsUp size={14} /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" title="Forward" onClick={() => reorderElement(activeProjectId, selectedElement.id, 'forward')}><ChevronUp size={14} /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" title="Backward" onClick={() => reorderElement(activeProjectId, selectedElement.id, 'backward')}><ChevronDown size={14} /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8" title="Send to back" onClick={() => reorderElement(activeProjectId, selectedElement.id, 'back')}><ChevronsDown size={14} /></Button>
              <div className="flex-1" />
              <Button variant="outline" size="icon" className="h-8 w-8" title="Duplicate (⌘D)" onClick={() => duplicateElement(activeProjectId, selectedElement.id)}><Copy size={14} /></Button>
              <Button variant="outline" size="icon" className="h-8 w-8 hover:text-destructive" title="Delete (Del)" onClick={() => removeElement(activeProjectId, selectedElement.id)}><Trash2 size={14} /></Button>
            </div>
          </div>

          {/* Geometry */}
          <div className="border-t border-border pt-4 space-y-3">
            <SectionLabel>Position &amp; Size</SectionLabel>
            <div>
              <Label className="text-xs text-muted-foreground">Tag</Label>
              <Input value={selectedElement.tag} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { tag: e.target.value })} className="text-xs h-8 mt-1" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div><Label className="text-xs text-muted-foreground">X</Label><Input type="number" value={Math.round(selectedElement.x)} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { x: +e.target.value })} className="text-xs h-8 mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">Y</Label><Input type="number" value={Math.round(selectedElement.y)} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { y: +e.target.value })} className="text-xs h-8 mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">W</Label><Input type="number" value={selectedElement.width} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { width: +e.target.value })} className="text-xs h-8 mt-1" /></div>
              <div><Label className="text-xs text-muted-foreground">H</Label><Input type="number" value={selectedElement.height} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { height: +e.target.value })} className="text-xs h-8 mt-1" /></div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Rotation (°)</Label>
              <Input type="number" value={selectedElement.style.rotation || 0} onChange={(e) => setStyle({ rotation: +e.target.value })} className="text-xs h-8 mt-1" />
            </div>
          </div>

          {/* Typography */}
          {(isText || selectedElement.type === 'icon') && (
            <div className="border-t border-border pt-4 space-y-3">
              <SectionLabel>Typography</SectionLabel>
              <div>
                <Label className="text-xs text-muted-foreground">Font Size</Label>
                <Input type="number" value={num(selectedElement.style.fontSize, 14)} onChange={(e) => setStyle({ fontSize: +e.target.value })} className="text-xs h-8 mt-1" />
              </div>
              {isText && (
                <>
                  <div>
                    <Label className="text-xs text-muted-foreground">Font</Label>
                    <div className="mt-1">
                      <FontPicker value={selectedElement.style.fontFamily} onChange={(f) => setStyle({ fontFamily: f })} />
                    </div>
                  </div>
                  <div className="flex gap-1">
                    {([['left', AlignLeft], ['center', AlignCenter], ['right', AlignRight]] as const).map(([a, Icon]) => (
                      <Button key={a} variant={(selectedElement.style.textAlign || 'left') === a ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setStyle({ textAlign: a })}><Icon size={14} /></Button>
                    ))}
                    <div className="flex-1" />
                    <Button variant={selectedElement.style.fontWeight === 'bold' ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setStyle({ fontWeight: selectedElement.style.fontWeight === 'bold' ? 'normal' : 'bold' })}><Bold size={14} /></Button>
                    <Button variant={selectedElement.style.fontStyle === 'italic' ? 'default' : 'outline'} size="icon" className="h-8 w-8" onClick={() => setStyle({ fontStyle: selectedElement.style.fontStyle === 'italic' ? 'normal' : 'italic' })}><Italic size={14} /></Button>
                  </div>
                </>
              )}
            </div>
          )}

          {isLine && (
            <div className="border-t border-border pt-4">
              <Label className="text-xs text-muted-foreground">Stroke Width</Label>
              <Input type="number" value={num(selectedElement.style.strokeWidth, 2)} onChange={(e) => setStyle({ strokeWidth: +e.target.value })} className="text-xs h-8 mt-1" />
            </div>
          )}

          {/* Appearance */}
          <div className="border-t border-border pt-4 space-y-3">
            <SectionLabel>Appearance</SectionLabel>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">{isLine ? 'Line color' : 'Color'}</Label>
                <Input type="color" value={selectedElement.style.color || '#dee2e6'} onChange={(e) => setStyle({ color: e.target.value })} className="h-8 mt-1 p-1 cursor-pointer" />
              </div>
              {!isLine && (
                <div>
                  <Label className="text-xs text-muted-foreground">Fill</Label>
                  <Input type="color" value={selectedElement.style.backgroundColor || '#000000'} onChange={(e) => setStyle({ backgroundColor: e.target.value })} className="h-8 mt-1 p-1 cursor-pointer" />
                </div>
              )}
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Opacity ({Math.round(num(selectedElement.style.opacity, 1) * 100)}%)</Label>
              <input type="range" min={0} max={1} step={0.05} value={num(selectedElement.style.opacity, 1)} onChange={(e) => setStyle({ opacity: +e.target.value })} className="w-full mt-2 accent-primary" />
            </div>
            {!isLine && (
              <>
                <div className="grid grid-cols-2 gap-2">
                  <div><Label className="text-xs text-muted-foreground">Border W</Label><Input type="number" min={0} value={num(selectedElement.style.borderWidth, 0)} onChange={(e) => setStyle({ borderWidth: +e.target.value })} className="text-xs h-8 mt-1" /></div>
                  <div><Label className="text-xs text-muted-foreground">Border color</Label><Input type="color" value={selectedElement.style.borderColor || '#000000'} onChange={(e) => setStyle({ borderColor: e.target.value })} className="h-8 mt-1 p-1 cursor-pointer" /></div>
                </div>
                <div className="grid grid-cols-2 gap-2 items-end">
                  <div><Label className="text-xs text-muted-foreground">Radius</Label><Input type="number" min={0} value={num(selectedElement.style.borderRadius, 0)} onChange={(e) => setStyle({ borderRadius: +e.target.value })} className="text-xs h-8 mt-1" /></div>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground h-8 cursor-pointer">
                    <input type="checkbox" checked={!!selectedElement.style.shadow} onChange={(e) => setStyle({ shadow: e.target.checked })} className="accent-primary" /> Shadow
                  </label>
                </div>
              </>
            )}
          </div>

          {/* Data binding */}
          <div className="border-t border-border pt-4 space-y-3">
            <SectionLabel>Data</SectionLabel>
            <div>
              <Label className="text-xs text-muted-foreground">Visible if field (non-empty)</Label>
              <Select value={selectedElement.visibleIfField || '__none__'} onValueChange={(v) => updateElement(activeProjectId, selectedElement.id, { visibleIfField: v === '__none__' ? '' : v })}>
                <SelectTrigger className="text-xs h-8 mt-1"><SelectValue placeholder="Always visible" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">Always visible</SelectItem>
                  {columns.map((col) => <SelectItem key={col} value={col} className="text-xs">{col}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            {selectedElement.type === 'svg' && (
              <div>
                <Label className="text-xs text-muted-foreground">Replace SVG</Label>
                <input type="file" accept=".svg" className="text-xs mt-1 file:text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-muted-foreground" onChange={handleReplaceSvg} />
              </div>
            )}
            {selectedElement.type === 'image' && (
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Image</Label>
                <input ref={replaceImgRef} type="file" accept="image/*" className="hidden" onChange={handleReplaceImage} />
                <div className="flex items-center gap-2">
                  {selectedElement.style.imageUrl ? (
                    <img src={selectedElement.style.imageUrl} alt="" className="h-10 w-10 rounded object-cover border border-border shrink-0" />
                  ) : (
                    <div className="h-10 w-10 rounded border border-dashed border-border flex items-center justify-center text-[10px] text-muted-foreground shrink-0">none</div>
                  )}
                  <Button variant="outline" size="sm" className="gap-1 text-xs flex-1" onClick={() => replaceImgRef.current?.click()}><Upload size={12} /> Upload</Button>
                  {selectedElement.style.imageUrl && (
                    <Button variant="ghost" size="icon" className="h-8 w-8 hover:text-destructive shrink-0" title="Clear image" onClick={() => setStyle({ imageUrl: '' })}><X size={14} /></Button>
                  )}
                </div>
                <Input placeholder="…or paste an image URL" value={selectedElement.style.imageUrl || ''} onChange={(e) => setStyle({ imageUrl: e.target.value })} className="text-xs h-8" />
                <p className="text-[11px] text-muted-foreground leading-snug">
                  A bound tag like <code className="text-primary">{'{{art}}'}</code> overrides this with each card's value.
                </p>
              </div>
            )}
          </div>

          {/* TCG annotations */}
          <div className="border-t border-border pt-4 space-y-3">
            <SectionLabel>TCG Schema</SectionLabel>
            <div>
              <Label className="text-xs text-muted-foreground">Type</Label>
              <Select value={selectedElement.tcgType || '__none__'} onValueChange={(v) => updateElement(activeProjectId, selectedElement.id, { tcgType: (v === '__none__' ? '' : v) as any })}>
                <SelectTrigger className="text-xs h-8 mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">None</SelectItem>
                  {TCG_SCHEMA_CLASSES.map((cls) => <SelectItem key={cls.uri} value={cls.uri} className="text-xs">{cls.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Property</Label>
              <Select value={selectedElement.tcgProperty || '__none__'} onValueChange={(v) => updateElement(activeProjectId, selectedElement.id, { tcgProperty: (v === '__none__' ? '' : v) as any })}>
                <SelectTrigger className="text-xs h-8 mt-1"><SelectValue placeholder="None" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">None</SelectItem>
                  {TCG_SCHEMA_PROPERTIES.filter((p) => !selectedElement.tcgType || p.domain === '__any__' || p.domain === selectedElement.tcgType).map((prop) => (
                    <SelectItem key={prop.uri} value={prop.uri} className="text-xs">{prop.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

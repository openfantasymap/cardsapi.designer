import { useState, useRef } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { CardElement } from '@/types/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Type, Diamond, Trash2, Minus, SeparatorVertical, FileImage } from 'lucide-react';

const generateId = () => Math.random().toString(36).slice(2, 10);

export const ElementPanel = () => {
  const { projects, activeProjectId, selectedElementId, addElement, updateElement, removeElement, setSelectedElement } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const template = project?.template;
  const selectedElement = template?.elements.find((el) => el.id === selectedElementId);
  const [newTag, setNewTag] = useState('');
  const svgRef = useRef<HTMLInputElement>(null);

  if (!template || !activeProjectId) return null;

  const handleAddElement = (type: CardElement['type'], svgData?: string) => {
    const defaults: Record<string, { w: number; h: number }> = {
      text: { w: 200, h: 32 },
      icon: { w: 40, h: 40 },
      hline: { w: 200, h: 2 },
      vline: { w: 2, h: 100 },
      svg: { w: 60, h: 60 },
      image: { w: 80, h: 80 },
    };
    const d = defaults[type] ?? { w: 80, h: 80 };
    const tag = newTag.trim() || `{{${type}}}`;
    const element: CardElement = {
      id: generateId(),
      type,
      tag,
      x: 20,
      y: 20 + template.elements.length * 40,
      width: d.w,
      height: d.h,
      style: {
        fontSize: type === 'text' ? 14 : 24,
        color: 'hsl(210 20% 92%)',
        strokeWidth: (type === 'hline' || type === 'vline') ? 2 : undefined,
        svgData,
      },
    };
    addElement(activeProjectId, element);
    setSelectedElement(element.id);
    setNewTag('');
  };

  const handleSvgUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      handleAddElement('svg', reader.result as string);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleReplaceSvg = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !selectedElement) return;
    const reader = new FileReader();
    reader.onload = () => {
      updateElement(activeProjectId, selectedElement.id, {
        style: { ...selectedElement.style, svgData: reader.result as string },
      });
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const iconMap: Record<string, React.ReactNode> = {
    text: <Type size={12} />,
    icon: <Diamond size={12} />,
    hline: <Minus size={12} />,
    vline: <SeparatorVertical size={12} />,
    svg: <FileImage size={12} />,
    image: <FileImage size={12} />,
  };

  return (
    <div className="w-72 bg-card border-l border-border p-4 overflow-y-auto flex flex-col gap-5">
      <div>
        <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Add Element
        </h3>
        <div className="flex gap-2 mb-2">
          <Input
            placeholder="Tag name e.g. {{name}}"
            value={newTag}
            onChange={(e) => setNewTag(e.target.value)}
            className="text-xs h-8"
          />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleAddElement('text')}>
            <Type size={12} /> Text
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleAddElement('icon')}>
            <Diamond size={12} /> Icon
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleAddElement('hline')}>
            <Minus size={12} /> H-Line
          </Button>
          <Button variant="outline" size="sm" className="gap-1 text-xs" onClick={() => handleAddElement('vline')}>
            <SeparatorVertical size={12} /> V-Line
          </Button>
        </div>
        <input ref={svgRef} type="file" accept=".svg" className="hidden" onChange={handleSvgUpload} />
        <Button variant="outline" size="sm" className="w-full gap-1 text-xs mt-2" onClick={() => svgRef.current?.click()}>
          <FileImage size={12} /> Upload SVG
        </Button>
        <Button variant="outline" size="sm" className="w-full gap-1 text-xs mt-1" onClick={() => handleAddElement('image')}>
          <ImageIcon size={12} /> Image URL
        </Button>
      </div>

      <div>
        <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
          Elements ({template.elements.length})
        </h3>
        <div className="space-y-1">
          {template.elements.map((el) => (
            <div
              key={el.id}
              className={`flex items-center gap-2 px-2 py-1.5 rounded text-xs cursor-pointer transition-colors ${
                selectedElementId === el.id ? 'bg-accent text-accent-foreground' : 'hover:bg-muted text-muted-foreground'
              }`}
              onClick={() => setSelectedElement(el.id)}
            >
              {iconMap[el.type] ?? <Diamond size={12} />}
              <span className="flex-1 truncate font-display">{el.tag}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:text-destructive"
                onClick={(e) => { e.stopPropagation(); removeElement(activeProjectId, el.id); }}
              >
                <Trash2 size={10} />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {selectedElement && (
        <div className="border-t border-border pt-4">
          <h3 className="font-display text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-3">
            Properties
          </h3>
          <div className="space-y-3">
            <div>
              <Label className="text-xs text-muted-foreground">Tag</Label>
              <Input
                value={selectedElement.tag}
                onChange={(e) => updateElement(activeProjectId, selectedElement.id, { tag: e.target.value })}
                className="text-xs h-8 mt-1"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">X</Label>
                <Input type="number" value={Math.round(selectedElement.x)} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { x: +e.target.value })} className="text-xs h-8 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Y</Label>
                <Input type="number" value={Math.round(selectedElement.y)} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { y: +e.target.value })} className="text-xs h-8 mt-1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input type="number" value={selectedElement.width} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { width: +e.target.value })} className="text-xs h-8 mt-1" />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Input type="number" value={selectedElement.height} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { height: +e.target.value })} className="text-xs h-8 mt-1" />
              </div>
            </div>

            {(selectedElement.type === 'text' || selectedElement.type === 'icon') && (
              <div>
                <Label className="text-xs text-muted-foreground">Font Size</Label>
                <Input type="number" value={selectedElement.style.fontSize || 14} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { style: { ...selectedElement.style, fontSize: +e.target.value } })} className="text-xs h-8 mt-1" />
              </div>
            )}

            {(selectedElement.type === 'hline' || selectedElement.type === 'vline') && (
              <div>
                <Label className="text-xs text-muted-foreground">Stroke Width</Label>
                <Input type="number" value={selectedElement.style.strokeWidth || 2} onChange={(e) => updateElement(activeProjectId, selectedElement.id, { style: { ...selectedElement.style, strokeWidth: +e.target.value } })} className="text-xs h-8 mt-1" />
              </div>
            )}

            <div>
              <Label className="text-xs text-muted-foreground">Color</Label>
              <Input
                type="color"
                value={selectedElement.style.color || '#dee2e6'}
                onChange={(e) => updateElement(activeProjectId, selectedElement.id, { style: { ...selectedElement.style, color: e.target.value } })}
                className="h-8 mt-1 p-1 cursor-pointer"
              />
            </div>

            {selectedElement.type === 'svg' && (
              <div>
                <Label className="text-xs text-muted-foreground">Replace SVG</Label>
                <input type="file" accept=".svg" className="text-xs mt-1 file:text-xs file:mr-2 file:rounded file:border-0 file:bg-muted file:px-2 file:py-1 file:text-muted-foreground" onChange={handleReplaceSvg} />
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

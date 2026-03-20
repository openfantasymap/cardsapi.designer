import { useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { CardElement } from '@/types/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Type, Diamond, Trash2, Plus } from 'lucide-react';

const generateId = () => Math.random().toString(36).slice(2, 10);

export const ElementPanel = () => {
  const { projects, activeProjectId, selectedElementId, addElement, updateElement, removeElement, setSelectedElement } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const template = project?.template;
  const selectedElement = template?.elements.find((el) => el.id === selectedElementId);
  const [newTag, setNewTag] = useState('');

  if (!template || !activeProjectId) return null;

  const handleAddElement = (type: 'text' | 'icon') => {
    const tag = newTag.trim() || (type === 'text' ? '{{field}}' : '{{icon}}');
    const element: CardElement = {
      id: generateId(),
      type,
      tag,
      x: 20,
      y: 20 + template.elements.length * 40,
      width: type === 'text' ? 200 : 40,
      height: type === 'text' ? 32 : 40,
      style: {
        fontSize: type === 'text' ? 14 : 24,
        color: 'hsl(210 20% 92%)',
      },
    };
    addElement(activeProjectId, element);
    setSelectedElement(element.id);
    setNewTag('');
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
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => handleAddElement('text')}>
            <Type size={12} /> Text
          </Button>
          <Button variant="outline" size="sm" className="flex-1 gap-1 text-xs" onClick={() => handleAddElement('icon')}>
            <Diamond size={12} /> Icon
          </Button>
        </div>
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
              {el.type === 'text' ? <Type size={12} /> : <Diamond size={12} />}
              <span className="flex-1 truncate font-display">{el.tag}</span>
              <Button
                variant="ghost"
                size="icon"
                className="h-5 w-5 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  removeElement(activeProjectId, el.id);
                }}
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
                <Input
                  type="number"
                  value={Math.round(selectedElement.x)}
                  onChange={(e) => updateElement(activeProjectId, selectedElement.id, { x: +e.target.value })}
                  className="text-xs h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Y</Label>
                <Input
                  type="number"
                  value={Math.round(selectedElement.y)}
                  onChange={(e) => updateElement(activeProjectId, selectedElement.id, { y: +e.target.value })}
                  className="text-xs h-8 mt-1"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  type="number"
                  value={selectedElement.width}
                  onChange={(e) => updateElement(activeProjectId, selectedElement.id, { width: +e.target.value })}
                  className="text-xs h-8 mt-1"
                />
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Input
                  type="number"
                  value={selectedElement.height}
                  onChange={(e) => updateElement(activeProjectId, selectedElement.id, { height: +e.target.value })}
                  className="text-xs h-8 mt-1"
                />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Font Size</Label>
              <Input
                type="number"
                value={selectedElement.style.fontSize || 14}
                onChange={(e) =>
                  updateElement(activeProjectId, selectedElement.id, {
                    style: { ...selectedElement.style, fontSize: +e.target.value },
                  })
                }
                className="text-xs h-8 mt-1"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

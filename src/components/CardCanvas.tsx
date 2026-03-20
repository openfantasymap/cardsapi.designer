import { useRef, useState, useCallback } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { CardElement } from '@/types/card';

const renderElement = (el: CardElement, value?: string) => {
  const display = value ?? el.tag;

  switch (el.type) {
    case 'text':
      return (
        <div
          className="w-full h-full flex items-center font-display truncate px-1"
          style={{
            fontSize: el.style.fontSize || 14,
            fontWeight: el.style.fontWeight || 'normal',
            color: el.style.color || 'hsl(210 20% 92%)',
          }}
        >
          {display}
        </div>
      );
    case 'icon':
      return (
        <div className="w-full h-full flex items-center justify-center" style={{ fontSize: el.style.fontSize || 24, color: el.style.color || 'hsl(var(--primary))' }}>
          ◆
        </div>
      );
    case 'hline':
      return (
        <div className="w-full h-full flex items-center">
          <div className="w-full" style={{ height: el.style.strokeWidth || 2, backgroundColor: el.style.color || 'hsl(210 20% 92%)' }} />
        </div>
      );
    case 'vline':
      return (
        <div className="w-full h-full flex justify-center">
          <div className="h-full" style={{ width: el.style.strokeWidth || 2, backgroundColor: el.style.color || 'hsl(210 20% 92%)' }} />
        </div>
      );
    case 'svg':
      return el.style.svgData ? (
        <img src={el.style.svgData} alt={el.tag} className="w-full h-full object-contain" draggable={false} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs">SVG</div>
      );
    default:
      return null;
  }
};

export { renderElement };

export const CardCanvas = () => {
  const { projects, activeProjectId, selectedElementId, setSelectedElement, updateElement } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const template = project?.template;
  const canvasRef = useRef<HTMLDivElement>(null);
  const [dragging, setDragging] = useState<{ id: string; offsetX: number; offsetY: number } | null>(null);

  const handleMouseDown = useCallback(
    (e: React.MouseEvent, el: CardElement) => {
      e.stopPropagation();
      setSelectedElement(el.id);
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      setDragging({ id: el.id, offsetX: e.clientX - rect.left - el.x, offsetY: e.clientY - rect.top - el.y });
    },
    [setSelectedElement]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!dragging || !activeProjectId || !canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = Math.max(0, e.clientX - rect.left - dragging.offsetX);
      const y = Math.max(0, e.clientY - rect.top - dragging.offsetY);
      updateElement(activeProjectId, dragging.id, { x, y });
    },
    [dragging, activeProjectId, updateElement]
  );

  const handleMouseUp = useCallback(() => setDragging(null), []);

  if (!template) return null;

  return (
    <div className="flex items-center justify-center flex-1 p-8">
      <div
        ref={canvasRef}
        className="relative border-2 border-border rounded-lg overflow-hidden select-none"
        style={{
          width: template.width,
          height: template.height,
          backgroundColor: template.backgroundColor,
          backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
        }}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onClick={() => setSelectedElement(null)}
      >
        {template.elements.map((el) => (
          <div
            key={el.id}
            className={`absolute cursor-move transition-shadow ${
              selectedElementId === el.id
                ? 'ring-2 ring-primary ring-offset-1 ring-offset-transparent'
                : 'hover:ring-1 hover:ring-muted-foreground/30'
            }`}
            style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
            onMouseDown={(e) => handleMouseDown(e, el)}
          >
            {renderElement(el)}
          </div>
        ))}
      </div>
    </div>
  );
};

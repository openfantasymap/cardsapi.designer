import { useEffect, useState } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { renderElement } from '@/components/CardCanvas';
import { CardTemplate, CardRow } from '@/types/card';
import { loadStylesheets, MANA_CSS } from '@/lib/icons';
import { usesManaTokens } from '@/lib/mana';

const RenderCard = ({ template, row, scale, assets }: { template: CardTemplate; row: CardRow; scale: number; assets?: Record<string, string> }) => (
  <div
    className="relative origin-top-left"
    style={{
      width: template.width,
      height: template.height,
      backgroundColor: template.backgroundColor,
      backgroundImage: template.backgroundImage ? `url(${assets?.[template.backgroundImage] ?? template.backgroundImage})` : undefined,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      transform: `scale(${scale})`,
    }}
  >
    {template.elements.map((el) => {
      if (el.visibleIfField) {
        const fieldVal = row[el.visibleIfField];
        if (!fieldVal || fieldVal.trim() === '') return null;
      }
      const tagMatch = el.tag.match(/^\{\{(.+)\}\}$/);
      const tagName = tagMatch ? tagMatch[1].trim() : null;
      const value = tagName ? row[tagName] ?? el.tag : undefined;
      return (
        <div
          key={el.id}
          className="absolute"
          style={{ left: el.x, top: el.y, width: el.width, height: el.height, transform: el.style.rotation ? `rotate(${el.style.rotation}deg)` : undefined }}
        >
          {renderElement(el, value, assets)}
        </div>
      );
    })}
  </div>
);

export const CardPreviewGrid = () => {
  const { projects, activeProjectId, activeSheetId } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const sheet = project?.sheets.find((s) => s.id === activeSheetId);
  const template = sheet?.template;
  const backTemplate = sheet?.backTemplate;
  const rows = sheet?.rows ?? [];
  const [showBack, setShowBack] = useState(false);

  useEffect(() => {
    if (template && usesManaTokens(template, rows)) loadStylesheets([MANA_CSS]);
  }, [template, rows]);

  if (!template) return null;

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Add data in the spreadsheet to preview cards.</p>
      </div>
    );
  }

  const scale = 0.45;
  const activeTemplate = showBack && backTemplate ? backTemplate : template;

  return (
    <div className="flex-1 overflow-auto p-6">
      {backTemplate && (
        <div className="flex gap-2 mb-4">
          <button
            onClick={() => setShowBack(false)}
            className={`text-xs font-display px-3 py-1 rounded transition-colors ${!showBack ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            Front
          </button>
          <button
            onClick={() => setShowBack(true)}
            className={`text-xs font-display px-3 py-1 rounded transition-colors ${showBack ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground hover:text-foreground'}`}
          >
            Back
          </button>
        </div>
      )}
      <div className="flex flex-wrap gap-4">
        {rows.map((row, i) => (
          <div
            key={i}
            className="rounded-lg overflow-hidden border border-border"
            style={{ width: activeTemplate.width * scale, height: activeTemplate.height * scale }}
          >
            <RenderCard template={activeTemplate} row={row} scale={scale} assets={project?.assets} />
          </div>
        ))}
      </div>
    </div>
  );
};

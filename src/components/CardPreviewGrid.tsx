import { useProjectStore } from '@/store/useProjectStore';
import { renderElement } from '@/components/CardCanvas';

export const CardPreviewGrid = () => {
  const { projects, activeProjectId } = useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const template = project?.template;
  const rows = project?.rows ?? [];

  if (!template) return null;

  if (rows.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-muted-foreground text-sm">Add data in the spreadsheet to preview cards.</p>
      </div>
    );
  }

  const scale = 0.45;

  return (
    <div className="flex-1 overflow-auto p-6">
      <div className="flex flex-wrap gap-4">
        {rows.map((row, i) => (
          <div
            key={i}
            className="rounded-lg overflow-hidden border border-border"
            style={{ width: template.width * scale, height: template.height * scale }}
          >
            <div
              className="relative origin-top-left"
              style={{
                width: template.width,
                height: template.height,
                backgroundColor: template.backgroundColor,
                backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                transform: `scale(${scale})`,
              }}
            >
              {template.elements.map((el) => {
                // Data-driven visibility: skip if conditioned on a field that's empty
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
                    {renderElement(el, value)}
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

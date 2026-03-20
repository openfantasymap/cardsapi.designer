import { useProjectStore } from '@/store/useProjectStore';

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
                const tagMatch = el.tag.match(/^\{\{(.+)\}\}$/);
                const tagName = tagMatch ? tagMatch[1].trim() : null;
                const value = tagName ? row[tagName] ?? el.tag : el.tag;

                return (
                  <div
                    key={el.id}
                    className="absolute"
                    style={{ left: el.x, top: el.y, width: el.width, height: el.height }}
                  >
                    {el.type === 'text' && (
                      <div
                        className="w-full h-full flex items-center font-display truncate px-1"
                        style={{
                          fontSize: el.style.fontSize || 14,
                          fontWeight: el.style.fontWeight || 'normal',
                          color: el.style.color || 'hsl(210 20% 92%)',
                        }}
                      >
                        {value}
                      </div>
                    )}
                    {el.type === 'icon' && (
                      <div className="w-full h-full flex items-center justify-center text-primary" style={{ fontSize: el.style.fontSize || 24 }}>
                        ◆
                      </div>
                    )}
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

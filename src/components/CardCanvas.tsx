import { useRef, useState, useCallback, useEffect } from 'react';
import { useProjectStore } from '@/store/useProjectStore';
import { CardElement } from '@/types/card';
import { cssFontFamily, loadGoogleFonts } from '@/lib/fonts';
import { loadStylesheets, templateHasIcons, iconCssUrls, MANA_CSS } from '@/lib/icons';
import { hasManaTokens, manaToHtml, usesManaTokens } from '@/lib/mana';
import { ZoomIn, ZoomOut, Maximize } from 'lucide-react';

const renderElement = (el: CardElement, value?: string, assets?: Record<string, string>) => {
  const display = value ?? el.tag;
  const s = el.style;
  const box: React.CSSProperties = {
    opacity: s.opacity ?? 1,
    backgroundColor: s.backgroundColor || undefined,
    borderRadius: s.borderRadius ? `${s.borderRadius}px` : undefined,
    border: s.borderWidth ? `${s.borderWidth}px solid ${s.borderColor || '#000'}` : undefined,
    boxShadow: s.shadow ? '0 2px 6px rgba(0,0,0,0.45)' : undefined,
  };

  switch (el.type) {
    case 'text': {
      const textStyle: React.CSSProperties = {
        ...box,
        fontSize: s.fontSize || 14,
        fontWeight: s.fontWeight || 'normal',
        fontStyle: s.fontStyle || 'normal',
        fontFamily: cssFontFamily(s.fontFamily) || undefined,
        textAlign: s.textAlign || 'left',
        justifyContent: s.textAlign === 'center' ? 'center' : s.textAlign === 'right' ? 'flex-end' : 'flex-start',
        color: s.color || 'hsl(210 20% 92%)',
      };
      // Render {1}{R}-style mana tokens inline as symbols.
      return hasManaTokens(display) ? (
        <div className="w-full h-full flex items-center truncate px-1" style={textStyle} dangerouslySetInnerHTML={{ __html: manaToHtml(display) }} />
      ) : (
        <div className="w-full h-full flex items-center truncate px-1" style={textStyle}>{display}</div>
      );
    }
    case 'icon': {
      const iconStyle: React.CSSProperties = { ...box, fontSize: s.fontSize || 24, color: s.color || 'hsl(var(--primary))' };
      if (hasManaTokens(display)) {
        // {1}{R} → a row of mana symbols.
        return <div className="w-full h-full flex items-center justify-center gap-0.5" style={iconStyle} dangerouslySetInnerHTML={{ __html: manaToHtml(display) }} />;
      }
      // Otherwise a single icon-font class (bind the tag to a column for per-card icons).
      const cls = display && !/\{\{.+\}\}/.test(display) ? display : '';
      return (
        <div className="w-full h-full flex items-center justify-center" style={iconStyle}>
          {cls ? <i className={cls} /> : <span className="opacity-40 text-xs">◆</span>}
        </div>
      );
    }
    case 'hline':
      return (
        <div className="w-full h-full flex items-center" style={box}>
          <div className="w-full" style={{ height: s.strokeWidth || 2, backgroundColor: s.color || 'hsl(210 20% 92%)' }} />
        </div>
      );
    case 'vline':
      return (
        <div className="w-full h-full flex justify-center" style={box}>
          <div className="h-full" style={{ width: s.strokeWidth || 2, backgroundColor: s.color || 'hsl(210 20% 92%)' }} />
        </div>
      );
    case 'svg':
      return s.svgData ? (
        <img src={s.svgData} alt={el.tag} className="w-full h-full object-contain" draggable={false} style={box} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs" style={box}>SVG</div>
      );
    case 'image': {
      const raw = value !== undefined && value !== el.tag ? value : s.imageUrl;
      const url = (raw && assets?.[raw]) || raw; // resolve asset filename → data URL/path
      return url ? (
        <img src={url} alt={el.tag} className="w-full h-full object-cover" draggable={false} style={{ borderRadius: s.borderRadius ? `${s.borderRadius}px` : '0.25rem', ...box }} />
      ) : (
        <div className="w-full h-full flex items-center justify-center text-muted-foreground text-xs border border-dashed border-muted-foreground/30 rounded" style={box}>IMG</div>
      );
    }
    default:
      return null;
  }
};

export { renderElement };

const HANDLES = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'] as const;
type Handle = (typeof HANDLES)[number];
const SNAP = 6; // template px
const MIN = 8;

interface Gesture {
  type: 'move' | 'resize';
  handle?: Handle;
  startClientX: number;
  startClientY: number;
  origX: number;
  origY: number;
  origW: number;
  origH: number;
  /** Becomes true once the pointer travels past DRAG_THRESHOLD, so a plain
   *  click selects without moving/snapping the element. */
  activated?: boolean;
}

const DRAG_THRESHOLD = 3; // screen px

/** Snap one axis: align an element's left/center/right (or top/mid/bottom) to targets. */
const snapAxis = (pos: number, size: number, targets: number[]): { pos: number; guide: number | null } => {
  const offsets = [0, size / 2, size];
  let best: { d: number; pos: number; guide: number } | null = null;
  for (const off of offsets) {
    for (const t of targets) {
      const d = Math.abs(pos + off - t);
      if (d <= SNAP && (!best || d < best.d)) best = { d, pos: t - off, guide: t };
    }
  }
  return best ? { pos: best.pos, guide: best.guide } : { pos, guide: null };
};

export const CardCanvas = () => {
  const { projects, activeProjectId, activeSheetId, selectedElementId, activeFace, editingProjectBack, setSelectedElement, updateElement, removeElement, duplicateElement } =
    useProjectStore();
  const project = projects.find((p) => p.id === activeProjectId);
  const sheet = project?.sheets.find((s) => s.id === activeSheetId);
  const template = editingProjectBack ? project?.back : activeFace === 'back' ? sheet?.backTemplate : sheet?.template;

  const containerRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const gestureRef = useRef<Gesture | null>(null);
  const [zoom, setZoom] = useState(1);
  const [guides, setGuides] = useState<{ x: number[]; y: number[] }>({ x: [], y: [] });

  const selected = template?.elements.find((el) => el.id === selectedElementId) || null;

  // Fit the template into the visible area.
  const fit = useCallback(() => {
    if (!template || !containerRef.current) return;
    const { clientWidth, clientHeight } = containerRef.current;
    const z = Math.min((clientWidth - 64) / template.width, (clientHeight - 64) / template.height);
    setZoom(Math.max(0.25, Math.min(2, z)));
  }, [template]);

  // Auto-fit when the active template changes.
  useEffect(() => {
    fit();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [template?.id, template?.width, template?.height]);

  // Load any Google Fonts + icon libraries used by the current template.
  useEffect(() => {
    if (!template) return;
    loadGoogleFonts(template.elements.map((el) => el.style.fontFamily));
    if (templateHasIcons(template)) loadStylesheets(iconCssUrls(project?.iconStylesheets));
    if (usesManaTokens(template, sheet?.rows ?? [])) loadStylesheets([MANA_CSS]);
  }, [template, project?.iconStylesheets, sheet?.rows]);

  // ── keyboard ─────────────────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const t = document.activeElement;
      if (t && ['INPUT', 'TEXTAREA', 'SELECT'].includes(t.tagName)) return;
      if (!activeProjectId || !selected) return;

      if (e.key === 'Escape') return setSelectedElement(null);
      if ((e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        return removeElement(activeProjectId, selected.id);
      }
      if ((e.metaKey || e.ctrlKey) && (e.key === 'd' || e.key === 'D')) {
        e.preventDefault();
        return duplicateElement(activeProjectId, selected.id);
      }
      const step = e.shiftKey ? 10 : 1;
      const nudges: Record<string, [number, number]> = {
        ArrowLeft: [-step, 0], ArrowRight: [step, 0], ArrowUp: [0, -step], ArrowDown: [0, step],
      };
      const n = nudges[e.key];
      if (n) {
        e.preventDefault();
        updateElement(activeProjectId, selected.id, { x: Math.max(0, selected.x + n[0]), y: Math.max(0, selected.y + n[1]) });
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [activeProjectId, selected, setSelectedElement, removeElement, duplicateElement, updateElement]);

  // ── pointer drag / resize ──────────────────────────────────────────────────
  const beginGesture = (e: React.PointerEvent, el: CardElement, handle?: Handle) => {
    e.stopPropagation();
    e.preventDefault();
    setSelectedElement(el.id);
    gestureRef.current = {
      type: handle ? 'resize' : 'move',
      handle,
      startClientX: e.clientX,
      startClientY: e.clientY,
      origX: el.x, origY: el.y, origW: el.width, origH: el.height,
    };
  };

  useEffect(() => {
    const onMove = (e: PointerEvent) => {
      const g = gestureRef.current;
      if (!g || !activeProjectId || !template || !selected) return;
      // Ignore sub-threshold movement so a click selects without nudging/snapping.
      if (!g.activated) {
        if (Math.abs(e.clientX - g.startClientX) < DRAG_THRESHOLD && Math.abs(e.clientY - g.startClientY) < DRAG_THRESHOLD) return;
        g.activated = true;
      }
      const dx = (e.clientX - g.startClientX) / zoom;
      const dy = (e.clientY - g.startClientY) / zoom;

      if (g.type === 'move') {
        let x = Math.max(0, Math.min(template.width - g.origW, g.origX + dx));
        let y = Math.max(0, Math.min(template.height - g.origH, g.origY + dy));
        const others = template.elements.filter((el) => el.id !== selected.id);
        const xTargets = [0, template.width / 2, template.width, ...others.flatMap((el) => [el.x, el.x + el.width / 2, el.x + el.width])];
        const yTargets = [0, template.height / 2, template.height, ...others.flatMap((el) => [el.y, el.y + el.height / 2, el.y + el.height])];
        const sx = snapAxis(x, g.origW, xTargets);
        const sy = snapAxis(y, g.origH, yTargets);
        x = sx.pos; y = sy.pos;
        setGuides({ x: sx.guide !== null ? [sx.guide] : [], y: sy.guide !== null ? [sy.guide] : [] });
        updateElement(activeProjectId, selected.id, { x, y });
      } else {
        const h = g.handle!;
        let { origX: x, origY: y, origW: w, origH: hgt } = g;
        if (h.includes('e')) w = g.origW + dx;
        if (h.includes('s')) hgt = g.origH + dy;
        if (h.includes('w')) { w = g.origW - dx; x = g.origX + dx; }
        if (h.includes('n')) { hgt = g.origH - dy; y = g.origY + dy; }
        if (w < MIN) { if (h.includes('w')) x = g.origX + g.origW - MIN; w = MIN; }
        if (hgt < MIN) { if (h.includes('n')) y = g.origY + g.origH - MIN; hgt = MIN; }
        updateElement(activeProjectId, selected.id, { x: Math.round(x), y: Math.round(y), width: Math.round(w), height: Math.round(hgt) });
      }
    };
    const onUp = () => {
      gestureRef.current = null;
      setGuides({ x: [], y: [] });
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    return () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
  }, [activeProjectId, template, selected, zoom, updateElement]);

  if (!template) {
    return (
      <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm">
        {activeFace === 'back' ? 'No back template. Enable it from the header.' : null}
      </div>
    );
  }

  // Handles are sized in screen px (counter-scaled) and centred on each edge/corner.
  const hs = 10 / zoom; // handle size in template px → ~10px on screen
  const o = hs / 2; // centre offset
  const handlePos: Record<Handle, React.CSSProperties> = {
    nw: { left: -o, top: -o, cursor: 'nwse-resize' },
    n: { left: '50%', top: -o, marginLeft: -o, cursor: 'ns-resize' },
    ne: { right: -o, top: -o, cursor: 'nesw-resize' },
    e: { right: -o, top: '50%', marginTop: -o, cursor: 'ew-resize' },
    se: { right: -o, bottom: -o, cursor: 'nwse-resize' },
    s: { left: '50%', bottom: -o, marginLeft: -o, cursor: 'ns-resize' },
    sw: { left: -o, bottom: -o, cursor: 'nesw-resize' },
    w: { left: -o, top: '50%', marginTop: -o, cursor: 'ew-resize' },
  };

  return (
    <div ref={containerRef} data-tour="canvas" className="flex-1 min-w-0 min-h-0 overflow-auto bg-muted/20 relative grid place-items-center p-8">
      {/* zoom controls */}
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1 rounded-md border border-border bg-card/90 backdrop-blur px-1 py-0.5 shadow-sm">
        <button className="p-1.5 hover:text-primary text-muted-foreground" title="Zoom out" onClick={() => setZoom((z) => Math.max(0.25, +(z - 0.1).toFixed(2)))}>
          <ZoomOut size={14} />
        </button>
        <button className="text-xs tabular-nums w-10 text-center text-foreground" title="Reset to 100%" onClick={() => setZoom(1)}>
          {Math.round(zoom * 100)}%
        </button>
        <button className="p-1.5 hover:text-primary text-muted-foreground" title="Zoom in" onClick={() => setZoom((z) => Math.min(2, +(z + 0.1).toFixed(2)))}>
          <ZoomIn size={14} />
        </button>
        <button className="p-1.5 hover:text-primary text-muted-foreground" title="Fit to view" onClick={fit}>
          <Maximize size={14} />
        </button>
      </div>

      <div style={{ width: template.width * zoom, height: template.height * zoom }}>
        <div
          ref={stageRef}
          className="relative border-2 border-border rounded-lg overflow-hidden select-none"
          style={{
            width: template.width,
            height: template.height,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            backgroundColor: template.backgroundColor,
            backgroundImage: template.backgroundImage ? `url(${template.backgroundImage})` : undefined,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
          }}
          onPointerDown={() => setSelectedElement(null)}
        >
          {template.elements.map((el) => {
            const isSel = selectedElementId === el.id;
            return (
              <div
                key={el.id}
                className={`absolute ${isSel ? 'cursor-move' : 'cursor-pointer hover:ring-1 hover:ring-muted-foreground/40'}`}
                style={{ left: el.x, top: el.y, width: el.width, height: el.height, transform: el.style.rotation ? `rotate(${el.style.rotation}deg)` : undefined }}
                onPointerDown={(e) => beginGesture(e, el)}
              >
                {renderElement(el, undefined, project?.assets)}
                {isSel && (
                  <>
                    <div className="absolute inset-0 ring-2 ring-primary pointer-events-none" />
                    {HANDLES.map((h) => (
                      <div
                        key={h}
                        onPointerDown={(e) => beginGesture(e, el, h)}
                        className="absolute bg-primary border border-background"
                        style={{ width: hs, height: hs, ...handlePos[h] }}
                      />
                    ))}
                  </>
                )}
              </div>
            );
          })}

          {/* alignment guides */}
          {guides.x.map((gx, i) => (
            <div key={`gx${i}`} className="absolute top-0 bottom-0 pointer-events-none" style={{ left: gx, width: 1, background: 'hsl(var(--primary))' }} />
          ))}
          {guides.y.map((gy, i) => (
            <div key={`gy${i}`} className="absolute left-0 right-0 pointer-events-none" style={{ top: gy, height: 1, background: 'hsl(var(--primary))' }} />
          ))}
        </div>
      </div>
    </div>
  );
};

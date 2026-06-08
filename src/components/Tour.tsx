import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';

export interface TourStep {
  /** CSS selector of the element to spotlight (omit for a centered intro/step). */
  selector?: string;
  title: string;
  body: string;
}

/**
 * Minimal, dependency-free coach-mark tour. Spotlights `[data-tour]` targets
 * (box-shadow cutout + ring) and shows a tooltip with Back/Next/Done. Click the
 * dimmed area or → to advance, ← to go back, Esc to close.
 */
export const Tour = ({ steps, open, onClose }: { steps: TourStep[]; open: boolean; onClose: () => void }) => {
  const [i, setI] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);

  useEffect(() => {
    if (open) setI(0);
  }, [open]);

  // Measure the current target (and keep it positioned on scroll/resize).
  useEffect(() => {
    if (!open) return;
    const measure = () => {
      const sel = steps[i]?.selector;
      const el = sel ? (document.querySelector(sel) as HTMLElement | null) : null;
      if (el) {
        el.scrollIntoView({ block: 'nearest', inline: 'nearest' });
        setRect(el.getBoundingClientRect());
      } else {
        setRect(null);
      }
    };
    measure();
    const t = setTimeout(measure, 200);
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      clearTimeout(t);
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open, i, steps]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      else if (e.key === 'ArrowRight') setI((v) => Math.min(steps.length - 1, v + 1));
      else if (e.key === 'ArrowLeft') setI((v) => Math.max(0, v - 1));
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, steps.length, onClose]);

  if (!open || steps.length === 0) return null;

  const step = steps[i];
  const last = i === steps.length - 1;
  const next = () => (last ? onClose() : setI((v) => v + 1));

  const TT_W = 300;
  const TT_H = 168;
  const pad = 10;
  let ttStyle: React.CSSProperties;
  if (rect) {
    const below = rect.bottom + TT_H + pad < window.innerHeight;
    const top = below ? rect.bottom + pad : Math.max(pad, rect.top - TT_H - pad);
    const left = Math.min(Math.max(pad, rect.left), window.innerWidth - TT_W - pad);
    ttStyle = { top, left, width: TT_W };
  } else {
    ttStyle = { top: '50%', left: '50%', width: TT_W, transform: 'translate(-50%, -50%)' };
  }

  return (
    <div className="fixed inset-0 z-[60]">
      {rect ? (
        <div
          className="ring-2 ring-primary rounded-md"
          style={{
            position: 'fixed',
            top: rect.top - 6,
            left: rect.left - 6,
            width: rect.width + 12,
            height: rect.height + 12,
            boxShadow: '0 0 0 9999px rgba(0,0,0,0.6)',
            pointerEvents: 'none',
            transition: 'all .15s ease',
          }}
        />
      ) : (
        <div className="fixed inset-0 bg-black/60" />
      )}

      {/* click the dim to advance */}
      <div className="fixed inset-0" onClick={next} />

      <div
        className="fixed z-[62] rounded-lg border border-border bg-popover text-popover-foreground shadow-2xl p-4"
        style={ttStyle}
        onClick={(e) => e.stopPropagation()}
      >
        <button onClick={onClose} className="absolute top-2.5 right-2.5 text-muted-foreground hover:text-foreground" aria-label="Close tour">
          <X size={14} />
        </button>
        <p className="text-[11px] font-display uppercase tracking-wider text-primary mb-1">
          {i + 1} / {steps.length}
        </p>
        <h3 className="font-display text-sm font-semibold text-foreground pr-5">{step.title}</h3>
        <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed">{step.body}</p>
        <div className="flex items-center gap-2 mt-3">
          {i > 0 && (
            <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setI((v) => Math.max(0, v - 1))}>
              Back
            </Button>
          )}
          <button onClick={onClose} className="text-[11px] text-muted-foreground hover:text-foreground mr-auto">
            Skip
          </button>
          <Button size="sm" className="h-7 text-xs" onClick={next}>
            {last ? 'Done' : 'Next'}
          </Button>
        </div>
      </div>
    </div>
  );
};

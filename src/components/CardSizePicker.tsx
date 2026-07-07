import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { CARD_SIZE_PRESETS, CUSTOM_SIZE_ID, DEFAULT_CARD_SIZE, matchCardSize } from '@/lib/cardSizes';

interface CardSizePickerProps {
  /** Starting dimensions; the matching preset is auto-selected, else "Custom". */
  initial: { width: number; height: number };
  /** Fires with the resolved dimensions whenever the user changes the size. */
  onChange: (size: { width: number; height: number }) => void;
}

/**
 * Card-size chooser: a dropdown of common presets (Poker, Tarot, …) plus a
 * "Custom…" option with width/height inputs. Self-contained — it seeds its own
 * state from `initial` on mount, so remount it (via `key`) to reset it.
 */
export function CardSizePicker({ initial, onChange }: CardSizePickerProps) {
  const initialMatch = matchCardSize(initial.width, initial.height);
  const [sizeId, setSizeId] = useState(initialMatch?.id ?? CUSTOM_SIZE_ID);
  const [customW, setCustomW] = useState(initial.width);
  const [customH, setCustomH] = useState(initial.height);

  const emit = (id: string, w: number, h: number) => {
    if (id === CUSTOM_SIZE_ID) {
      onChange({ width: Math.max(1, Math.round(w)), height: Math.max(1, Math.round(h)) });
    } else {
      const preset = CARD_SIZE_PRESETS.find((s) => s.id === id) ?? DEFAULT_CARD_SIZE;
      onChange({ width: preset.width, height: preset.height });
    }
  };

  const handleSelect = (id: string) => {
    setSizeId(id);
    emit(id, customW, customH);
  };

  return (
    <div>
      <Select value={sizeId} onValueChange={handleSelect}>
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {CARD_SIZE_PRESETS.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              <span className="font-medium">{s.label}</span>
              <span className="text-muted-foreground"> — {s.hint}</span>
            </SelectItem>
          ))}
          <SelectItem value={CUSTOM_SIZE_ID}>Custom…</SelectItem>
        </SelectContent>
      </Select>
      {sizeId === CUSTOM_SIZE_ID && (
        <div className="grid grid-cols-2 gap-2 mt-2">
          <div>
            <Label className="text-[11px] text-muted-foreground">Width (px)</Label>
            <Input
              type="number"
              min={1}
              value={customW}
              onChange={(e) => { const w = +e.target.value; setCustomW(w); emit(CUSTOM_SIZE_ID, w, customH); }}
            />
          </div>
          <div>
            <Label className="text-[11px] text-muted-foreground">Height (px)</Label>
            <Input
              type="number"
              min={1}
              value={customH}
              onChange={(e) => { const h = +e.target.value; setCustomH(h); emit(CUSTOM_SIZE_ID, customW, h); }}
            />
          </div>
        </div>
      )}
    </div>
  );
}

/**
 * Common physical card-size presets, expressed in pixels.
 *
 * Dimensions follow the app's implicit print convention of **150 dpi** — the same
 * one the starter layouts use (375×525 px = 2.5″×3.5″; see `src/lib/cardPresets.ts`).
 * The card model (`CardTemplate.width`/`height`) stores raw CSS pixels, so these
 * presets are just convenient pixel sizes with a real-world label.
 */

export interface CardSizePreset {
  id: string;
  /** Short name shown in the dropdown. */
  label: string;
  /** Physical size + typical games, shown as a hint. */
  hint: string;
  width: number;
  height: number;
}

const DPI = 150;
/** Convert inches → pixels at the app's print convention. */
const inch = (w: number, h: number) => ({ width: Math.round(w * DPI), height: Math.round(h * DPI) });

export const CARD_SIZE_PRESETS: CardSizePreset[] = [
  { id: 'poker', label: 'Poker / Standard', hint: '2.5 × 3.5 in — MTG, Pokémon, most TCGs', ...inch(2.5, 3.5) },
  { id: 'bridge', label: 'Bridge', hint: '2.25 × 3.5 in — slim playing cards', ...inch(2.25, 3.5) },
  { id: 'tarot', label: 'Tarot', hint: '2.75 × 4.75 in — oversized', ...inch(2.75, 4.75) },
  { id: 'mini', label: 'Mini', hint: '1.75 × 2.5 in — small / European', ...inch(1.75, 2.5) },
  { id: 'jumbo', label: 'Jumbo', hint: '3.5 × 5.5 in — large format', ...inch(3.5, 5.5) },
  { id: 'square', label: 'Square', hint: '2.5 × 2.5 in', ...inch(2.5, 2.5) },
];

/** Sentinel id for the "enter your own dimensions" option. */
export const CUSTOM_SIZE_ID = 'custom';

/** Default preset (standard poker size — matches the built-in starter layouts). */
export const DEFAULT_CARD_SIZE = CARD_SIZE_PRESETS[0];

/** Find the preset whose dimensions match, if any (used to reflect a starter's size). */
export const matchCardSize = (width: number, height: number): CardSizePreset | undefined =>
  CARD_SIZE_PRESETS.find((s) => s.width === width && s.height === height);

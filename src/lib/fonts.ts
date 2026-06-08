/**
 * Google Fonts support — a curated catalog plus on-demand loading.
 *
 * Fonts are loaded by injecting a single combined css2 stylesheet `<link>`
 * (deduped), so previewing/using many families costs few requests. The picker
 * stores a bare family name (e.g. "Bebas Neue"); `cssFontFamily` turns it into
 * a quoted CSS value with a generic fallback.
 */

/** Curated, popular Google Fonts grouped loosely by use — good for card design. */
export const GOOGLE_FONTS: string[] = [
  // Sans
  'Roboto', 'Open Sans', 'Lato', 'Montserrat', 'Poppins', 'Inter', 'Nunito',
  'Raleway', 'Work Sans', 'Oswald', 'Rubik', 'Kanit', 'Barlow', 'DM Sans',
  'Manrope', 'Josefin Sans', 'Quicksand', 'Archivo', 'Exo 2', 'Teko',
  // Serif
  'Merriweather', 'Playfair Display', 'Lora', 'PT Serif', 'Roboto Slab',
  'Crimson Text', 'EB Garamond', 'Bitter', 'Cormorant Garamond',
  'Libre Baskerville', 'Spectral', 'Cardo', 'Cinzel', 'Cinzel Decorative',
  // Display / fantasy — great for cards
  'Bebas Neue', 'Anton', 'Abril Fatface', 'Righteous', 'Bangers', 'Fredoka',
  'Alfa Slab One', 'Staatliches', 'Russo One', 'Bungee', 'Orbitron',
  'Audiowide', 'Monoton', 'Press Start 2P', 'MedievalSharp', 'UnifrakturCook',
  'Pirata One', 'Almendra', 'IM Fell English SC', 'Uncial Antiqua', 'Grenze Gotisch',
  // Handwriting
  'Dancing Script', 'Caveat', 'Shadows Into Light', 'Indie Flower', 'Satisfy',
  'Great Vibes', 'Sacramento', 'Kalam', 'Permanent Marker', 'Amatic SC',
  // Mono
  'Roboto Mono', 'Source Code Pro', 'JetBrains Mono', 'Fira Code',
  'IBM Plex Mono', 'Space Mono', 'Inconsolata',
];

const GOOGLE_FONTS_SET = new Set(GOOGLE_FONTS);
const loaded = new Set<string>();

const familyParam = (family: string) =>
  'family=' + encodeURIComponent(family).replace(/%20/g, '+');

/** Inject a combined stylesheet for any not-yet-loaded known Google families. */
export const loadGoogleFonts = (families: Array<string | undefined>): void => {
  if (typeof document === 'undefined') return;
  const fresh = Array.from(
    new Set(families.filter((f): f is string => !!f && GOOGLE_FONTS_SET.has(f) && !loaded.has(f))),
  );
  if (!fresh.length) return;
  fresh.forEach((f) => loaded.add(f));
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  // crossorigin makes the stylesheet's cssRules readable so html-to-image can
  // embed the fonts when rasterising to PNG/PDF.
  link.crossOrigin = 'anonymous';
  link.href = `https://fonts.googleapis.com/css2?${fresh.map(familyParam).join('&')}&display=swap`;
  document.head.appendChild(link);
};

/** Load the whole catalog (used by the picker for live previews). */
export const loadAllGoogleFonts = (): void => loadGoogleFonts(GOOGLE_FONTS);

/** css2 stylesheet href for the known Google families in `families`, or null. */
export const googleFontsHref = (families: Array<string | undefined>): string | null => {
  const fams = Array.from(
    new Set(families.filter((f): f is string => !!f && GOOGLE_FONTS_SET.has(f))),
  );
  if (!fams.length) return null;
  return `https://fonts.googleapis.com/css2?${fams.map(familyParam).join('&')}&display=swap`;
};

/** A bare family name → quoted CSS value + fallback. Legacy comma values pass through. */
export const cssFontFamily = (family?: string): string => {
  if (!family) return '';
  if (family.includes(',')) return family;
  return `'${family}', sans-serif`;
};

/**
 * Icon-font support for `icon` elements.
 *
 * An icon element renders an `<i class="…">` whose class comes from the
 * element's resolved value — so binding its tag to a spreadsheet column makes
 * the glyph change per card (e.g. a column of `ra ra-fire`, `ra ra-water`).
 *
 * Font Awesome (Free) and RPG-Awesome are loaded by default; projects can add
 * more libraries via `CardProject.iconStylesheets`. See docs/icons.md.
 */
import type { CardTemplate } from '@/types/card';

/** Always-available icon libraries (CDN). */
export const BUILTIN_ICON_CSS: string[] = [
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css',
  'https://cdnjs.cloudflare.com/ajax/libs/rpg-awesome/0.2.0/css/rpg-awesome.min.css',
];

const loaded = new Set<string>();

/** Inject any not-yet-loaded icon stylesheets into the document. */
export const loadStylesheets = (urls: Array<string | undefined>): void => {
  if (typeof document === 'undefined') return;
  for (const url of urls) {
    if (!url || loaded.has(url)) continue;
    loaded.add(url);
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = url;
    document.head.appendChild(link);
  }
};

export const templateHasIcons = (t?: CardTemplate): boolean =>
  !!t && t.elements.some((el) => el.type === 'icon');

/** All icon stylesheet URLs for a project (built-ins + its extras). */
export const iconCssUrls = (extra: string[] = []): string[] => [...BUILTIN_ICON_CSS, ...extra];

/** `<link>` tags for the given icon stylesheet URLs (for standalone HTML). */
export const iconCssLinks = (urls: string[]): string =>
  urls.map((u) => `<link rel="stylesheet" href="${u}">`).join('');

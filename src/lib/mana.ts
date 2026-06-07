/**
 * Scryfall-style mana syntax: `{1}{R}`, `{W/U}`, `{2/G}`, `{T}`, `{X}` …
 *
 * Tokens are turned into Mana-font glyphs (`<i class="ms ms-r ms-cost">`); the
 * surrounding text is HTML-escaped and kept (so rules text like
 * `{T}: Add {G}{G}` renders symbols inline). `{{column}}` data-bindings are not
 * treated as tokens. Requires the Mana font — callers auto-load it when tokens
 * are present (see lib/icons MANA_CSS).
 */
import type { CardTemplate, CardRow } from '@/types/card';

const TOKEN = /\{([^{}]+)\}/g;
const TOKEN_TEST = /\{[^{}]+\}/;
const isBinding = (s: string) => /^\{\{.+\}\}$/.test(s);

const escapeHtml = (s: string) =>
  s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/** Map a token's inner text to a Mana-font class suffix. */
const tokenToClass = (raw: string): string => {
  const s = raw.trim().toUpperCase();
  if (s === 'T' || s === 'TAP') return 'ms-tap';
  if (s === 'Q' || s === 'UNTAP') return 'ms-untap';
  const norm = s.toLowerCase().replace(/[^a-z0-9]/g, ''); // {W/U}->wu, {2/R}->2r, {1}->1
  return 'ms-' + (norm || 'multicolor');
};

/** True if the string contains a mana token (and isn't a pure {{binding}}). */
export const hasManaTokens = (s: unknown): s is string =>
  typeof s === 'string' && TOKEN_TEST.test(s) && !isBinding(s);

/** Convert a mana string to HTML (symbols + escaped text). */
export const manaToHtml = (s: string, cost = true): string => {
  let out = '';
  let last = 0;
  let m: RegExpExecArray | null;
  TOKEN.lastIndex = 0;
  while ((m = TOKEN.exec(s))) {
    out += escapeHtml(s.slice(last, m.index));
    out += `<i class="ms ${tokenToClass(m[1])}${cost ? ' ms-cost' : ''}"></i>`;
    last = m.index + m[0].length;
  }
  out += escapeHtml(s.slice(last));
  return out;
};

/** Whether any element tag or row value in a template uses mana tokens. */
export const usesManaTokens = (template: CardTemplate, rows: CardRow[] = []): boolean => {
  const strings: unknown[] = [
    ...template.elements.map((e) => e.tag),
    ...rows.flatMap((r) => Object.values(r)),
  ];
  return strings.some((v) => hasManaTokens(v));
};

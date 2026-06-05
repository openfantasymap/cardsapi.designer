/**
 * Pure builders for the files that represent a project: per-card HTML, CSV,
 * and TCG JSON-LD. Shared by the GitHub persistence layer (writes them into
 * each project repo) and the ZIP / local-PDF exporters, so the on-disk layout
 * and the downloadable bundle stay identical.
 */

import { CardProject, CardTemplate, CardElement, CardRow } from '@/types/card';
import { cssFontFamily, googleFontsHref } from '@/lib/fonts';

/** Resolve a `{{field}}` tag against a row; non-tag strings pass through. */
export const resolveTag = (tag: string, row: CardRow): string => {
  const m = tag.match(/^\{\{(.+)\}\}$/);
  return m ? row[m[1].trim()] ?? tag : tag;
};

/** Shared decoration (fill, opacity, border, radius, shadow) for any element box. */
const boxCss = (s: CardElement['style']): string =>
  (s.opacity != null && s.opacity !== 1 ? `opacity:${s.opacity};` : '') +
  (s.backgroundColor ? `background-color:${s.backgroundColor};` : '') +
  (s.borderRadius ? `border-radius:${s.borderRadius}px;` : '') +
  (s.borderWidth ? `border:${s.borderWidth}px solid ${s.borderColor || '#000'};` : '') +
  (s.shadow ? 'box-shadow:0 2px 6px rgba(0,0,0,0.45);' : '');

const elementHtml = (el: CardElement, row: CardRow): string => {
  if (el.visibleIfField) {
    const v = row[el.visibleIfField];
    if (!v || v.trim() === '') return '';
  }

  const s = el.style;
  const tagMatch = el.tag.match(/^\{\{(.+)\}\}$/);
  const value = tagMatch ? row[tagMatch[1].trim()] ?? el.tag : el.tag;
  const rotation = s.rotation ? `transform:rotate(${s.rotation}deg);` : '';
  const pos = `position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;`;
  const box = boxCss(s);

  if (el.type === 'image') {
    const src = tagMatch ? value : s.imageUrl || '';
    return `<img src="${src}" style="${pos}object-fit:cover;${box}${rotation}" />`;
  }
  if (el.type === 'hline') {
    return `<div style="${pos}height:0;border-top:${s.strokeWidth || 2}px solid ${s.color || '#fff'};${rotation}"></div>`;
  }
  if (el.type === 'vline') {
    return `<div style="${pos}width:0;border-left:${s.strokeWidth || 2}px solid ${s.color || '#fff'};${rotation}"></div>`;
  }
  if (el.type === 'svg') {
    return `<div style="${pos}${box}${rotation}">${s.svgData ? `<img src="${s.svgData}" style="width:100%;height:100%;object-fit:contain;" />` : ''}</div>`;
  }
  // text / icon
  const align = s.textAlign || 'left';
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return (
    `<div style="${pos}display:flex;align-items:center;justify-content:${justify};` +
    `font-size:${s.fontSize || 14}px;font-weight:${s.fontWeight || 'normal'};font-style:${s.fontStyle || 'normal'};` +
    (s.fontFamily ? `font-family:${cssFontFamily(s.fontFamily)};` : '') +
    `text-align:${align};color:${s.color || '#fff'};overflow:hidden;${box}${rotation}">${value}</div>`
  );
};

/** Inline markup for one card (used for grids/PDF — no <html> wrapper). */
export const cardInnerHtml = (template: CardTemplate, row: CardRow): string => {
  const els = template.elements.map((el) => elementHtml(el, row)).join('\n    ');
  const bg = template.backgroundImage
    ? `background-image:url('${template.backgroundImage}');background-size:cover;background-position:center;`
    : '';
  return `<div style="position:relative;width:${template.width}px;height:${template.height}px;background-color:${template.backgroundColor};${bg}overflow:hidden;">\n    ${els}\n</div>`;
};

/** A full standalone HTML document for a single card. */
export const buildCardHtml = (template: CardTemplate, row: CardRow): string => {
  const href = googleFontsHref(template.elements.map((el) => el.style.fontFamily));
  const fontLink = href ? `<link rel="stylesheet" href="${href}">` : '';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">${fontLink}<style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#111;}</style></head>
<body>
  ${cardInnerHtml(template, row)}
</body></html>`;
};

/** Convert spreadsheet rows to a CSV string. */
export const buildCsv = (rows: CardRow[]): string => {
  if (rows.length === 0) return '';
  const cols = [...new Set(rows.flatMap((r) => Object.keys(r)))];
  const escape = (v: string) => `"${(v ?? '').replace(/"/g, '""')}"`;
  const header = cols.map(escape).join(',');
  const body = rows.map((r) => cols.map((c) => escape(r[c] ?? '')).join(',')).join('\n');
  return `${header}\n${body}`;
};

/** TCG JSON-LD for the project, or null if no elements carry annotations. */
export const buildJsonLd = (project: CardProject): Record<string, unknown> | null => {
  const hasAnnotations = project.sheets.some((s) =>
    s.template.elements.some((el) => el.tcgType || el.tcgProperty),
  );
  if (!hasAnnotations) return null;

  const cards: Record<string, string>[] = [];
  for (const sheet of project.sheets) {
    for (const row of sheet.rows) {
      const card: Record<string, string> = { '@type': 'tcg:Card' };
      for (const el of sheet.template.elements) {
        if (el.tcgProperty) {
          const v = resolveTag(el.tag, row);
          if (v && v !== el.tag) card[el.tcgProperty] = v;
        }
      }
      cards.push(card);
    }
  }

  return {
    '@context': { tcg: 'https://tcg-schema.org/core#', schema: 'https://schema.org/' },
    '@graph': cards,
  };
};

const sheetFolder = (name: string) => name.replace(/\s+/g, '_');

/**
 * All non-image files that represent a project, as `{ path, text }` entries.
 * Image binaries are produced separately by `extractAssets`.
 */
export const buildProjectTextFiles = (project: CardProject): Array<{ path: string; text: string }> => {
  const files: Array<{ path: string; text: string }> = [];

  files.push({ path: 'project.json', text: JSON.stringify(project, null, 2) });

  // Global shared card back (if defined).
  if (project.back) {
    files.push({ path: 'back/template.json', text: JSON.stringify(project.back, null, 2) });
  }

  for (const sheet of project.sheets) {
    const folder = sheetFolder(sheet.name);
    files.push({ path: `${folder}/template.json`, text: JSON.stringify(sheet.template, null, 2) });
    if (sheet.backTemplate) {
      files.push({ path: `${folder}/back_template.json`, text: JSON.stringify(sheet.backTemplate, null, 2) });
    }
    if (sheet.rows.length > 0) files.push({ path: `${folder}/data.csv`, text: buildCsv(sheet.rows) });
    files.push({ path: `${folder}/data.json`, text: JSON.stringify(sheet.rows, null, 2) });
    sheet.rows.forEach((row, i) => {
      files.push({ path: `${folder}/card_${i + 1}.html`, text: buildCardHtml(sheet.template, row) });
    });
  }

  const ld = buildJsonLd(project);
  if (ld) files.push({ path: 'cards.jsonld', text: JSON.stringify(ld, null, 2) });

  return files;
};

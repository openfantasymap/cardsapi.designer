/**
 * Pure builders for the files that represent a project: per-card HTML, CSV,
 * and TCG JSON-LD. Shared by the GitHub persistence layer (writes them into
 * each project repo) and the ZIP / local-PDF exporters, so the on-disk layout
 * and the downloadable bundle stay identical.
 */

import { CardProject, CardTemplate, CardElement, CardRow } from '@/types/card';
import { cssFontFamily, googleFontsHref } from '@/lib/fonts';
import { templateHasIcons, iconCssUrls, iconCssLinks, MANA_CSS } from '@/lib/icons';
import { hasManaTokens, manaToHtml, usesManaTokens } from '@/lib/mana';

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

const elementHtml = (el: CardElement, row: CardRow, assets?: Record<string, string>): string => {
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
    const raw = tagMatch ? value : s.imageUrl || '';
    const src = (raw && assets?.[raw]) || raw; // resolve asset filename → data URL/path
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
  if (el.type === 'icon') {
    // {1}{R}-style mana tokens → a row of symbols; otherwise a single icon class.
    const inner = hasManaTokens(value) ? manaToHtml(value) : `<i class="${/\{\{.+\}\}/.test(value) ? '' : value}"></i>`;
    return `<div style="${pos}display:flex;align-items:center;justify-content:center;gap:2px;font-size:${s.fontSize || 24}px;color:${s.color || '#fff'};${box}${rotation}">${inner}</div>`;
  }
  // text
  const align = s.textAlign || 'left';
  const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
  return (
    `<div style="${pos}display:flex;align-items:center;justify-content:${justify};` +
    `font-size:${s.fontSize || 14}px;font-weight:${s.fontWeight || 'normal'};font-style:${s.fontStyle || 'normal'};` +
    (s.fontFamily ? `font-family:${cssFontFamily(s.fontFamily)};` : '') +
    `text-align:${align};color:${s.color || '#fff'};overflow:hidden;${box}${rotation}">${hasManaTokens(value) ? manaToHtml(value) : value}</div>`
  );
};

/** Inline markup for one card (used for grids/PDF — no <html> wrapper). */
export const cardInnerHtml = (template: CardTemplate, row: CardRow, assets?: Record<string, string>): string => {
  const els = template.elements.map((el) => elementHtml(el, row, assets)).join('\n    ');
  const bgRaw = template.backgroundImage;
  const bgSrc = (bgRaw && assets?.[bgRaw]) || bgRaw;
  const bg = bgSrc
    ? `background-image:url('${bgSrc}');background-size:cover;background-position:center;`
    : '';
  return `<div style="position:relative;width:${template.width}px;height:${template.height}px;background-color:${template.backgroundColor};${bg}overflow:hidden;">\n    ${els}\n</div>`;
};

/** A full standalone HTML document for a single card. */
export const buildCardHtml = (
  template: CardTemplate,
  row: CardRow,
  extraIconCss: string[] = [],
  assets?: Record<string, string>,
): string => {
  const href = googleFontsHref(template.elements.map((el) => el.style.fontFamily));
  const fontLink = href ? `<link rel="stylesheet" href="${href}">` : '';
  const iconLinks = templateHasIcons(template) ? iconCssLinks(iconCssUrls(extraIconCss)) : '';
  const manaLink = usesManaTokens(template, row ? [row] : []) ? `<link rel="stylesheet" href="${MANA_CSS}">` : '';
  return `<!DOCTYPE html>
<html><head><meta charset="utf-8">${fontLink}${iconLinks}${manaLink}<style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#111;}</style></head>
<body>
  ${cardInnerHtml(template, row, assets)}
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

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

/**
 * A self-contained static gallery page for the whole project. Cards are
 * pre-rendered (front + back) into a responsive grid with a search box, with the
 * needed font/icon/Mana CSS links. Image/asset references are whatever the
 * project carries — repo-relative paths when built from a saved project, or
 * inline data URLs for the ZIP — so the page works on GitHub Pages, when cloned,
 * or opened directly.
 */
export const buildGalleryHtml = (project: CardProject): string => {
  const scale = 0.6;
  const assets = project.assets;

  const faces: CardTemplate[] = project.sheets.flatMap((s) => [s.template, ...(s.backTemplate ? [s.backTemplate] : [])]);
  if (project.back) faces.push(project.back);
  const fontHref = googleFontsHref(faces.flatMap((t) => t.elements.map((e) => e.style.fontFamily)));
  const fontLink = fontHref ? `<link rel="stylesheet" href="${fontHref}">` : '';
  const iconLinks = faces.some((t) => templateHasIcons(t)) ? iconCssLinks(iconCssUrls(project.iconStylesheets ?? [])) : '';
  const manaUsed = project.sheets.some(
    (s) => usesManaTokens(s.template, s.rows) || (s.backTemplate ? usesManaTokens(s.backTemplate, s.rows) : false),
  );
  const manaLink = manaUsed ? `<link rel="stylesheet" href="${MANA_CSS}">` : '';

  const tile = (t: CardTemplate, row: CardRow, caption: string): string => {
    const search = esc(Object.values(row).join(' ').toLowerCase());
    return (
      `<figure class="card" data-search="${search}">` +
      `<div class="scaler" style="width:${Math.round(t.width * scale)}px;height:${Math.round(t.height * scale)}px;">` +
      `<div style="transform:scale(${scale});transform-origin:top left;">${cardInnerHtml(t, row, assets)}</div></div>` +
      `<figcaption>${esc(caption)}</figcaption></figure>`
    );
  };

  const sections = project.sheets
    .map((sheet) => {
      const back = sheet.backTemplate ?? project.back;
      const rows = sheet.rows.length ? sheet.rows : [{}];
      const cards = rows
        .map((row, i) => {
          const name = Object.values(row).find((v) => v && v.trim()) || `Card ${i + 1}`;
          let html = tile(sheet.template, row, name);
          if (back) html += tile(back, row, `${name} (back)`);
          return html;
        })
        .join('\n');
      return `<section><h2>${esc(sheet.name)}</h2><div class="grid">${cards}</div></section>`;
    })
    .join('\n');

  return `<!DOCTYPE html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>${esc(project.name)} — cards</title>
${fontLink}${iconLinks}${manaLink}
<style>
  :root { color-scheme: dark; }
  body { margin: 0; background: #0f1115; color: #e7e9ee; font-family: system-ui, sans-serif; }
  header { padding: 24px 28px 8px; }
  h1 { margin: 0; font-size: 22px; }
  p.desc { margin: 6px 0 0; color: #9aa3b2; font-size: 14px; max-width: 60ch; }
  .toolbar { padding: 12px 28px; position: sticky; top: 0; background: #0f1115; z-index: 5; }
  #q { width: 100%; max-width: 360px; padding: 8px 12px; border-radius: 8px; border: 1px solid #2a2f3a; background: #161a22; color: #e7e9ee; font-size: 14px; }
  section { padding: 8px 28px 24px; }
  h2 { font-size: 13px; text-transform: uppercase; letter-spacing: .08em; color: #9aa3b2; }
  .grid { display: flex; flex-wrap: wrap; gap: 16px; }
  figure.card { margin: 0; }
  .scaler { overflow: hidden; border-radius: 10px; border: 1px solid #2a2f3a; background: #161a22; }
  figcaption { margin-top: 6px; font-size: 12px; color: #9aa3b2; max-width: 100%; }
  footer { padding: 24px 28px; color: #6b7280; font-size: 12px; }
</style></head>
<body>
  <header>
    <h1>${esc(project.name)}</h1>
    ${project.description ? `<p class="desc">${esc(project.description)}</p>` : ''}
  </header>
  <div class="toolbar"><input id="q" type="search" placeholder="Search cards…" autocomplete="off"></div>
  ${sections}
  <footer>Generated by CardForge.</footer>
  <script>
    var q = document.getElementById('q');
    q && q.addEventListener('input', function () {
      var v = q.value.trim().toLowerCase();
      document.querySelectorAll('.card').forEach(function (c) {
        c.style.display = (!v || (c.dataset.search || '').indexOf(v) !== -1) ? '' : 'none';
      });
    });
  </script>
</body></html>`;
};

/**
 * All non-image files that represent a project, as `{ path, text }` entries.
 * Image binaries are produced separately by `extractAssets`.
 */
export const buildProjectTextFiles = (project: CardProject): Array<{ path: string; text: string }> => {
  const files: Array<{ path: string; text: string }> = [];

  files.push({ path: 'project.json', text: JSON.stringify(project, null, 2) });
  files.push({ path: 'index.html', text: buildGalleryHtml(project) });

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
      files.push({ path: `${folder}/card_${i + 1}.html`, text: buildCardHtml(sheet.template, row, project.iconStylesheets ?? [], project.assets) });
    });
  }

  const ld = buildJsonLd(project);
  if (ld) files.push({ path: 'cards.jsonld', text: JSON.stringify(ld, null, 2) });

  return files;
};

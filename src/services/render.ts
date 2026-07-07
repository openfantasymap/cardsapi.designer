/**
 * Local, client-side rendering of cards to PNG and PDF — no server, no print
 * dialog. Each card face is built from the shared `cardInnerHtml` markup into an
 * offscreen node, rasterised with html-to-image, then either downloaded as PNG
 * (single) / a ZIP of PNGs (many), or laid out into a print-and-play PDF — cards
 * at their true physical size, gridded on pages with a cutting gutter + crop marks.
 *
 * Uploaded/data-URL images rasterise cleanly. Images referenced by an external
 * cross-origin URL without CORS may taint the canvas and fail to render.
 */

import { toPng } from 'html-to-image';
import { jsPDF } from 'jspdf';
import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CardProject, CardTemplate, CardRow } from '@/types/card';
import { cardInnerHtml } from '@/services/cardFiles';
import { CARD_DPI } from '@/lib/cardSizes';
import { loadGoogleFonts } from '@/lib/fonts';
import { loadStylesheets, templateHasIcons, iconCssUrls, MANA_CSS } from '@/lib/icons';
import { usesManaTokens } from '@/lib/mana';

const PROXY_BASE = (import.meta.env.VITE_CARDFORGE_API_URL || '').replace(/\/+$/, '');
const proxied = (url: string) => `${PROXY_BASE}/proxy/image?url=${encodeURIComponent(url)}`;
const isExternal = (url: string) => /^https?:\/\//i.test(url) && (!PROXY_BASE || !url.startsWith(PROXY_BASE));

/** Route cross-origin <img>/background images through the proxy so the canvas
 *  doesn't taint when rasterising. No-op if the proxy isn't configured. */
const proxifyImages = (host: HTMLElement) => {
  if (!PROXY_BASE) return;
  host.querySelectorAll('img').forEach((img) => {
    const src = img.getAttribute('src') || '';
    if (isExternal(src)) {
      img.crossOrigin = 'anonymous';
      img.setAttribute('src', proxied(src));
    }
  });
  const stage = host.firstElementChild as HTMLElement | null;
  const bg = stage?.style.backgroundImage;
  if (stage && bg) {
    const m = bg.match(/url\(["']?(https?:[^"')]+)["']?\)/i);
    if (m && isExternal(m[1])) stage.style.backgroundImage = `url("${proxied(m[1])}")`;
  }
};

interface Face {
  label: string;
  template: CardTemplate;
  row: CardRow;
}

/** Every face to render: each row's front, plus its back when one is defined. */
const collectFaces = (project: CardProject): Face[] => {
  const faces: Face[] = [];
  for (const sheet of project.sheets) {
    const folder = sheet.name.replace(/\s+/g, '_');
    const back = sheet.backTemplate ?? project.back;
    const rows = sheet.rows.length ? sheet.rows : [{}];
    rows.forEach((row, i) => {
      faces.push({ label: `${folder}_${i + 1}`, template: sheet.template, row });
      if (back) faces.push({ label: `${folder}_${i + 1}_back`, template: back, row });
    });
  }
  return faces;
};

/** Rasterise one face to a PNG data URL via an offscreen node. */
const renderFaceToPng = async (face: Face, assets?: Record<string, string>): Promise<string> => {
  const families = face.template.elements.map((el) => el.style.fontFamily).filter((f): f is string => !!f);
  loadGoogleFonts(families);

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;pointer-events:none;';
  host.innerHTML = cardInnerHtml(face.template, face.row, assets);
  proxifyImages(host);
  const node = host.firstElementChild as HTMLElement;
  document.body.appendChild(host);
  try {
    if (document.fonts) {
      await Promise.all(families.map((f) => document.fonts.load(`16px '${f}'`).catch(() => undefined)));
      await document.fonts.ready;
    }
    const opts = { pixelRatio: 2, cacheBust: true, width: face.template.width, height: face.template.height };
    try {
      return await toPng(node, opts);
    } catch (err) {
      // Most failures come from embedding web fonts (cross-origin CSS). Retry
      // once without font embedding so the export still succeeds.
      try {
        return await toPng(node, { ...opts, skipFonts: true });
      } catch {
        throw new Error(
          `Could not render a card to image. External image URLs must allow CORS — prefer uploaded images. (${(err as Error)?.message || err})`,
        );
      }
    }
  } finally {
    document.body.removeChild(host);
  }
};

const safeName = (s: string) => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');

/** Export PNGs: a single file for one face, otherwise a ZIP of all faces. */
export const exportProjectImages = async (project: CardProject) => {
  const faces = collectFaces(project);
  if (!faces.length) throw new Error('Nothing to render — add a card first.');
  if (faces.some((f) => templateHasIcons(f.template))) loadStylesheets(iconCssUrls(project.iconStylesheets));
  if (faces.some((f) => usesManaTokens(f.template, [f.row]))) loadStylesheets([MANA_CSS]);
  const base = safeName(project.name) || 'cards';

  if (faces.length === 1) {
    saveAs(await renderFaceToPng(faces[0], project.assets), `${base}.png`);
    return;
  }
  const zip = new JSZip();
  for (const face of faces) {
    const png = await renderFaceToPng(face, project.assets);
    zip.file(`${safeName(face.label)}.png`, png.split(',')[1], { base64: true });
  }
  saveAs(await zip.generateAsync({ type: 'blob' }), `${base}_images.zip`);
};

const MM_PER_IN = 25.4;
/** Printable page dimensions (portrait) in mm. */
const PAGE_MM: Record<'a4' | 'letter', [number, number]> = {
  a4: [210, 297],
  letter: [215.9, 279.4],
};

export interface PrintSheetOptions {
  /** Paper size for the sheets. Default 'a4'. */
  pageSize?: 'a4' | 'letter';
  /** Gap between cards, in mm, for cutting. Default 3. */
  gutterMm?: number;
  /** Page margin, in mm. Default 6 (fits 3×3 poker cards on A4). */
  marginMm?: number;
  /** Draw corner crop marks around each card. Default true. */
  cropMarks?: boolean;
}

/** Card px → mm at the app's print convention (150 dpi). */
const pxToMm = (px: number) => (px / CARD_DPI) * MM_PER_IN;

/** Corner crop marks (short ticks extending outward from each corner). */
const drawCropMarks = (pdf: jsPDF, x: number, y: number, w: number, h: number, len: number) => {
  pdf.setDrawColor(140);
  pdf.setLineWidth(0.1);
  const corners: [number, number, number, number][] = [
    // [horizontal tick], then [vertical tick] per corner
    [x - len, y, x, y], [x, y - len, x, y],                       // top-left
    [x + w, y, x + w + len, y], [x + w, y - len, x + w, y],       // top-right
    [x - len, y + h, x, y + h], [x, y + h, x, y + h + len],       // bottom-left
    [x + w, y + h, x + w + len, y + h], [x + w, y + h, x + w, y + h + len], // bottom-right
  ];
  for (const [x1, y1, x2, y2] of corners) pdf.line(x1, y1, x2, y2);
};

/**
 * Export a print-and-play PDF: every card face laid out at its true physical
 * size (px ÷ 150 dpi → inches) on printable pages, with a cutting gutter and
 * optional corner crop marks. Cards flow left-to-right and wrap onto new rows /
 * pages; mixed card sizes are shelf-packed by row height.
 */
export const exportProjectPdf = async (project: CardProject, options: PrintSheetOptions = {}) => {
  const faces = collectFaces(project);
  if (!faces.length) throw new Error('Nothing to render — add a card first.');
  if (faces.some((f) => templateHasIcons(f.template))) loadStylesheets(iconCssUrls(project.iconStylesheets));
  if (faces.some((f) => usesManaTokens(f.template, [f.row]))) loadStylesheets([MANA_CSS]);

  const pageSize = options.pageSize ?? 'a4';
  const margin = options.marginMm ?? 6;
  const gutter = options.gutterMm ?? 3;
  const cropMarks = options.cropMarks ?? true;
  const [pageW, pageH] = PAGE_MM[pageSize];
  const markLen = Math.max(0, Math.min(3, gutter, margin));
  const EPS = 0.01;

  const pdf = new jsPDF({ unit: 'mm', format: pageSize, orientation: 'portrait' });
  const usableRight = pageW - margin;
  const usableBottom = pageH - margin;
  let x = margin;
  let y = margin;
  let rowMaxH = 0;
  let pageHasContent = false;

  for (const face of faces) {
    const w = pxToMm(face.template.width);
    const h = pxToMm(face.template.height);
    const png = await renderFaceToPng(face, project.assets);

    // Wrap to a new row when this card would overflow the row's right edge.
    if (x > margin && x + w > usableRight + EPS) {
      x = margin;
      y += rowMaxH + gutter;
      rowMaxH = 0;
    }
    // Start a new page when the row would overflow the bottom.
    if (pageHasContent && y + h > usableBottom + EPS) {
      pdf.addPage(pageSize, 'portrait');
      x = margin;
      y = margin;
      rowMaxH = 0;
      pageHasContent = false;
    }

    pdf.addImage(png, 'PNG', x, y, w, h);
    if (cropMarks && markLen > 0) drawCropMarks(pdf, x, y, w, h, markLen);
    pageHasContent = true;
    x += w + gutter;
    rowMaxH = Math.max(rowMaxH, h);
  }

  pdf.save(`${safeName(project.name) || 'cards'}.pdf`);
};

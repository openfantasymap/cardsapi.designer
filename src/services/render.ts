/**
 * Local, client-side rendering of cards to PNG and PDF — no server, no print
 * dialog. Each card face is built from the shared `cardInnerHtml` markup into an
 * offscreen node, rasterised with html-to-image, then either downloaded as PNG
 * (single) / a ZIP of PNGs (many), or assembled into a PDF (one face per page).
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

/** Export a generated PDF, one card face per page at the card's native size. */
export const exportProjectPdf = async (project: CardProject) => {
  const faces = collectFaces(project);
  if (!faces.length) throw new Error('Nothing to render — add a card first.');
  if (faces.some((f) => templateHasIcons(f.template))) loadStylesheets(iconCssUrls(project.iconStylesheets));
  if (faces.some((f) => usesManaTokens(f.template, [f.row]))) loadStylesheets([MANA_CSS]);

  let pdf: jsPDF | null = null;
  for (const face of faces) {
    const { width: w, height: h } = face.template;
    const orientation = w > h ? 'landscape' : 'portrait';
    const png = await renderFaceToPng(face, project.assets);
    if (!pdf) {
      pdf = new jsPDF({ unit: 'px', format: [w, h], orientation });
    } else {
      pdf.addPage([w, h], orientation);
    }
    pdf.addImage(png, 'PNG', 0, 0, w, h);
  }
  pdf!.save(`${safeName(project.name) || 'cards'}.pdf`);
};

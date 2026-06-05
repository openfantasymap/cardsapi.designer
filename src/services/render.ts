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
const renderFaceToPng = async (face: Face): Promise<string> => {
  const families = face.template.elements.map((el) => el.style.fontFamily).filter((f): f is string => !!f);
  loadGoogleFonts(families);

  const host = document.createElement('div');
  host.style.cssText = 'position:fixed;left:-99999px;top:0;pointer-events:none;';
  host.innerHTML = cardInnerHtml(face.template, face.row);
  const node = host.firstElementChild as HTMLElement;
  document.body.appendChild(host);
  try {
    if (document.fonts) {
      await Promise.all(families.map((f) => document.fonts.load(`16px '${f}'`).catch(() => undefined)));
      await document.fonts.ready;
    }
    return await toPng(node, {
      pixelRatio: 2,
      cacheBust: true,
      width: face.template.width,
      height: face.template.height,
    });
  } finally {
    document.body.removeChild(host);
  }
};

const safeName = (s: string) => s.replace(/\s+/g, '_').replace(/[^a-zA-Z0-9._-]/g, '');

/** Export PNGs: a single file for one face, otherwise a ZIP of all faces. */
export const exportProjectImages = async (project: CardProject) => {
  const faces = collectFaces(project);
  if (!faces.length) throw new Error('Nothing to render — add a card first.');
  const base = safeName(project.name) || 'cards';

  if (faces.length === 1) {
    saveAs(await renderFaceToPng(faces[0]), `${base}.png`);
    return;
  }
  const zip = new JSZip();
  for (const face of faces) {
    const png = await renderFaceToPng(face);
    zip.file(`${safeName(face.label)}.png`, png.split(',')[1], { base64: true });
  }
  saveAs(await zip.generateAsync({ type: 'blob' }), `${base}_images.zip`);
};

/** Export a generated PDF, one card face per page at the card's native size. */
export const exportProjectPdf = async (project: CardProject) => {
  const faces = collectFaces(project);
  if (!faces.length) throw new Error('Nothing to render — add a card first.');

  let pdf: jsPDF | null = null;
  for (const face of faces) {
    const { width: w, height: h } = face.template;
    const orientation = w > h ? 'landscape' : 'portrait';
    const png = await renderFaceToPng(face);
    if (!pdf) {
      pdf = new jsPDF({ unit: 'px', format: [w, h], orientation });
    } else {
      pdf.addPage([w, h], orientation);
    }
    pdf.addImage(png, 'PNG', 0, 0, w, h);
  }
  pdf!.save(`${safeName(project.name) || 'cards'}.pdf`);
};

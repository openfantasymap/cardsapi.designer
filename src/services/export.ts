import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CardProject } from '@/types/card';
import { buildProjectTextFiles, cardInnerHtml } from '@/services/cardFiles';

const API_BASE = import.meta.env.VITE_CARDFORGE_API_URL || '/api';

/** Export project as JSON download */
export const exportProjectJson = (project: CardProject) => {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  saveAs(blob, `${project.name.replace(/\s+/g, '_')}.json`);
};

/**
 * Export full project as a ZIP. Uses the same file builders as the GitHub
 * persistence layer, so the bundle mirrors the repo layout (project.json,
 * per-sheet template/data.csv/data.json/card_N.html, cards.jsonld). Images
 * remain inline as data URLs here (a single self-contained download).
 */
export const exportProjectZip = async (project: CardProject) => {
  const zip = new JSZip();
  for (const file of buildProjectTextFiles(project)) {
    zip.file(file.path, file.text);
  }
  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${project.name.replace(/\s+/g, '_')}.zip`);
};

/**
 * Local PDF render — fully client-side, no server. Builds a self-contained
 * print document containing every card (images inlined) and opens the browser
 * print dialog, where the user can "Save as PDF". Works offline.
 */
export const exportProjectPdfLocal = (project: CardProject) => {
  const cards: string[] = [];
  for (const sheet of project.sheets) {
    for (const row of sheet.rows) {
      cards.push(
        `<div class="card-wrap">${cardInnerHtml(sheet.template, row)}</div>`,
      );
      if (sheet.backTemplate) {
        cards.push(`<div class="card-wrap">${cardInnerHtml(sheet.backTemplate, row)}</div>`);
      }
    }
  }

  const html = `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>${project.name}</title>
<style>
  @page { margin: 10mm; }
  body { margin: 0; background: white; font-family: sans-serif; }
  .sheet { display: flex; flex-wrap: wrap; gap: 8px; align-content: flex-start; }
  .card-wrap { break-inside: avoid; }
</style></head>
<body>
  <div class="sheet">${cards.join('\n')}</div>
  <script>window.onload = function(){ setTimeout(function(){ window.focus(); window.print(); }, 400); };</script>
</body></html>`;

  const win = window.open('', '_blank');
  if (!win) throw new Error('Popup blocked — allow popups to print/save the PDF locally');
  win.document.open();
  win.document.write(html);
  win.document.close();
};

/**
 * Remote PDF render — posts the project to the proxy's WeasyPrint endpoint and
 * downloads the resulting PDF. Higher fidelity; requires the proxy to be up.
 */
export const exportProjectPdfRemote = async (project: CardProject) => {
  const res = await fetch(`${API_BASE}/render/pdf`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || err.message || 'PDF render failed');
  }
  const blob = await res.blob();
  saveAs(blob, `${project.name.replace(/\s+/g, '_')}.pdf`);
};

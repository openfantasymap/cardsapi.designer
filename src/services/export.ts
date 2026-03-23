import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { CardProject } from '@/types/card';

const API_BASE = import.meta.env.VITE_CARDFORGE_API_URL || '/api';

/** Export project as JSON download */
export const exportProjectJson = (project: CardProject) => {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: 'application/json' });
  saveAs(blob, `${project.name.replace(/\s+/g, '_')}.json`);
};

/** Build an HTML string for a single card */
const buildCardHtml = (project: CardProject, sheetIndex: number, rowIndex: number): string => {
  const sheet = project.sheets[sheetIndex];
  if (!sheet) return '';
  const { template, rows } = sheet;
  const row = rows[rowIndex];
  if (!row) return '';

  const elements = template.elements
    .filter((el) => {
      if (el.visibleIfField) {
        const v = row[el.visibleIfField];
        if (!v || v.trim() === '') return false;
      }
      return true;
    })
    .map((el) => {
      const tagMatch = el.tag.match(/^\{\{(.+)\}\}$/);
      const value = tagMatch ? row[tagMatch[1].trim()] ?? el.tag : el.tag;
      const rotation = el.style.rotation ? `transform:rotate(${el.style.rotation}deg);` : '';

      if (el.type === 'image') {
        const src = tagMatch ? value : (el.style.imageUrl || '');
        return `<img src="${src}" style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;object-fit:cover;${rotation}" />`;
      }
      if (el.type === 'hline') {
        return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:0;border-top:${el.style.strokeWidth || 2}px solid ${el.style.color || '#fff'};${rotation}"></div>`;
      }
      if (el.type === 'vline') {
        return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:0;height:${el.height}px;border-left:${el.style.strokeWidth || 2}px solid ${el.style.color || '#fff'};${rotation}"></div>`;
      }
      if (el.type === 'svg') {
        return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;${rotation}">${el.style.svgData || ''}</div>`;
      }
      // text / icon
      return `<div style="position:absolute;left:${el.x}px;top:${el.y}px;width:${el.width}px;height:${el.height}px;font-size:${el.style.fontSize || 14}px;font-weight:${el.style.fontWeight || 'normal'};color:${el.style.color || '#fff'};overflow:hidden;${rotation}">${value}</div>`;
    })
    .join('\n      ');

  const bgImage = template.backgroundImage ? `background-image:url('${template.backgroundImage}');background-size:cover;background-position:center;` : '';

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>body{margin:0;display:flex;justify-content:center;align-items:center;min-height:100vh;background:#111;}</style></head>
<body>
  <div style="position:relative;width:${template.width}px;height:${template.height}px;background-color:${template.backgroundColor};${bgImage}overflow:hidden;">
      ${elements}
  </div>
</body></html>`;
};

/** Export full project as a ZIP with JSON + HTML files */
export const exportProjectZip = async (project: CardProject) => {
  const zip = new JSZip();

  // project.json
  zip.file('project.json', JSON.stringify(project, null, 2));

  // HTML per card per sheet
  project.sheets.forEach((sheet, si) => {
    const folder = zip.folder(sheet.name.replace(/\s+/g, '_')) || zip;
    sheet.rows.forEach((_, ri) => {
      const html = buildCardHtml(project, si, ri);
      folder.file(`card_${ri + 1}.html`, html);
    });
  });

  const blob = await zip.generateAsync({ type: 'blob' });
  saveAs(blob, `${project.name.replace(/\s+/g, '_')}.zip`);
};

/** Request PDF export from backend */
export const exportProjectPdf = async (project: CardProject, token?: string) => {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`${API_BASE}/projects/${project.id}/export/pdf`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ project }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || 'PDF export failed');
  }

  const blob = await res.blob();
  saveAs(blob, `${project.name.replace(/\s+/g, '_')}.pdf`);
};

/**
 * Image asset handling.
 *
 * In memory, uploaded images live as `data:` URLs embedded in the project
 * (template backgrounds, element image URLs, spreadsheet cells). "GitHub as
 * backend" means the repo should hold the *actual* image files, so on save we
 * extract every data URL into `images/<sha1>.<ext>` and rewrite the reference
 * to that relative path; on load we fetch those files and rebuild data URLs so
 * the editor renders normally (this works for private repos too, since we read
 * with the user's token rather than relying on public raw URLs).
 */

import { CardProject } from '@/types/card';
import { CommitFile } from '@/services/githubApi';

const MIME_TO_EXT: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
  'image/avif': 'avif',
  'image/bmp': 'bmp',
};
const EXT_TO_MIME: Record<string, string> = Object.fromEntries(
  Object.entries(MIME_TO_EXT).map(([mime, ext]) => [ext, mime]),
);

const IMAGES_DIR = 'images';
const isDataUrl = (s: unknown): s is string => typeof s === 'string' && s.startsWith('data:');
const isImagePath = (s: unknown): s is string =>
  typeof s === 'string' && s.startsWith(`${IMAGES_DIR}/`);

interface DataUrlParts {
  bytes: Uint8Array;
  mime: string;
  ext: string;
}

const parseDataUrl = (dataUrl: string): DataUrlParts | null => {
  const m = dataUrl.match(/^data:([^;,]+)?(;base64)?,(.*)$/s);
  if (!m) return null;
  const mime = m[1] || 'application/octet-stream';
  const isBase64 = !!m[2];
  const raw = m[3];
  let bytes: Uint8Array;
  if (isBase64) {
    const bin = atob(raw);
    bytes = new Uint8Array(bin.length);
    for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  } else {
    bytes = new TextEncoder().encode(decodeURIComponent(raw));
  }
  return { bytes, mime, ext: MIME_TO_EXT[mime] || 'bin' };
};

const sha1Hex = async (bytes: Uint8Array): Promise<string> => {
  const digest = await crypto.subtle.digest('SHA-1', bytes);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
};

const bytesToDataUrl = (bytes: Uint8Array, mime: string): string => {
  let binary = '';
  const chunk = 0x8000;
  for (let i = 0; i < bytes.length; i += chunk) {
    binary += String.fromCharCode(...bytes.subarray(i, i + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
};

/**
 * Walk every image-bearing string in a project and run `transform` over it,
 * returning a new project. The callback may be async (used for hashing/fetch).
 */
const mapImageStrings = async (
  project: CardProject,
  transform: (value: string) => Promise<string>,
): Promise<CardProject> => {
  const clone: CardProject = JSON.parse(JSON.stringify(project));

  const mapTemplate = async (tpl?: { backgroundImage?: string; elements: any[] }) => {
    if (!tpl) return;
    if (tpl.backgroundImage) tpl.backgroundImage = await transform(tpl.backgroundImage);
    for (const el of tpl.elements) {
      if (el.style?.imageUrl) el.style.imageUrl = await transform(el.style.imageUrl);
    }
  };

  for (const sheet of clone.sheets) {
    await mapTemplate(sheet.template);
    await mapTemplate(sheet.backTemplate);
    // Spreadsheet cells may hold pasted/uploaded data URLs too.
    for (const row of sheet.rows) {
      for (const key of Object.keys(row)) {
        row[key] = await transform(row[key]);
      }
    }
  }
  return clone;
};

export interface ExtractResult {
  /** Project with data URLs replaced by relative `images/<hash>.<ext>` paths. */
  project: CardProject;
  /** The image files to commit. */
  files: CommitFile[];
}

/** Extract every embedded data-URL image into a repo file + relative path. */
export const extractAssets = async (project: CardProject): Promise<ExtractResult> => {
  const filesByPath = new Map<string, Uint8Array>();

  const rewritten = await mapImageStrings(project, async (value) => {
    if (!isDataUrl(value)) return value;
    const parts = parseDataUrl(value);
    if (!parts) return value;
    const hash = await sha1Hex(parts.bytes);
    const path = `${IMAGES_DIR}/${hash}.${parts.ext}`;
    if (!filesByPath.has(path)) filesByPath.set(path, parts.bytes);
    return path;
  });

  const files: CommitFile[] = Array.from(filesByPath, ([path, bytes]) => ({ path, bytes }));
  return { project: rewritten, files };
};

/**
 * Inverse of extractAssets: replace relative `images/...` references with data
 * URLs by loading each file (e.g. from the repo via the GitHub API).
 */
export const inlineAssets = async (
  project: CardProject,
  loadFile: (path: string) => Promise<Uint8Array | null>,
): Promise<CardProject> => {
  const cache = new Map<string, string | null>();

  return mapImageStrings(project, async (value) => {
    if (!isImagePath(value)) return value;
    if (!cache.has(value)) {
      const bytes = await loadFile(value);
      const ext = value.split('.').pop()?.toLowerCase() || '';
      const mime = EXT_TO_MIME[ext] || 'application/octet-stream';
      cache.set(value, bytes ? bytesToDataUrl(bytes, mime) : null);
    }
    return cache.get(value) ?? value;
  });
};

/**
 * GitHub-as-backend persistence.
 *
 * Layout (mirrors the openhistorymap/archaeo-pro convention):
 *   - One PRIVATE repo per project: `cardforge-<projectId>`, description
 *     `cardforge — <name>`, containing project.json, per-sheet
 *     template/data.csv/data.json/card_N.html, images/<hash>.<ext>, cards.jsonld.
 *   - One PRIVATE index repo `cardforge-index` with index.json + index.csv
 *     listing every project so any device can discover them after login.
 *
 * All reads/writes go straight to api.github.com with the user's token.
 */

import { CardProject } from '@/types/card';
import {
  CommitFile,
  commitFiles,
  ensureRepo,
  getFile,
  getFileText,
  textToBytes,
} from '@/services/githubApi';
import { extractAssets, inlineAssets } from '@/services/assets';
import { buildProjectTextFiles } from '@/services/cardFiles';

export const PROJECT_REPO_PREFIX = 'cardforge-';
export const INDEX_REPO = 'cardforge-index';

/** Per-project repo name: `cardforge-<projectId>` (archaeo-pro convention). */
export const repoNameForProject = (projectId: string): string => `${PROJECT_REPO_PREFIX}${projectId}`;

export interface IndexEntry {
  id: string; // project id == repo suffix
  slug: string; // for the public /p/:slug route
  name: string;
  description: string;
  repo: string; // owner/name
  private: boolean;
  isPublic: boolean;
  updatedAt: string;
  htmlUrl: string;
  pagesUrl?: string;
}

export interface SaveResult {
  repo: string;
  fileCount: number;
  htmlUrl: string;
}

const projectReadme = (project: CardProject): string =>
  `# ${project.name}\n\n${project.description || ''}\n\n` +
  `_A [CardForge](https://card-creator.tcg-schema.org) project. ` +
  `Edit it in the app; this repo holds the source of truth (templates, data, images)._\n\n` +
  `- Sheets: ${project.sheets.length}\n` +
  `- Cards: ${project.sheets.reduce((n, s) => n + s.rows.length, 0)}\n\n` +
  `## Explore the cards\n\n` +
  `[\`index.html\`](index.html) is a self-contained gallery of every card. ` +
  `Enable **GitHub Pages** for this repo (Settings → Pages → deploy from \`main\`) ` +
  `to browse it online, or clone and open \`index.html\` locally.\n`;

// ── Save / load a single project ─────────────────────────────────────────────

/** Persist a project to its own `cardforge-<slug>` repo and update the index. */
export const saveProject = async (
  token: string,
  owner: string,
  project: CardProject,
): Promise<SaveResult> => {
  // 1. Pull embedded images out into real files; rewrite refs to relative paths.
  const { project: rewritten, files: imageFiles } = await extractAssets(project);

  // 2. Build the text files (project.json now carries relative image paths).
  const textFiles: CommitFile[] = buildProjectTextFiles(rewritten).map((f) => ({
    path: f.path,
    bytes: textToBytes(f.text),
  }));
  textFiles.push({ path: 'README.md', bytes: textToBytes(projectReadme(rewritten)) });

  const files = [...textFiles, ...imageFiles];

  // 3. Ensure the repo exists (private, auto-initialized), then commit.
  const repoName = repoNameForProject(project.id);
  const repo = await ensureRepo(token, owner, repoName, {
    private: !project.isPublic,
    description: `cardforge — ${project.name}`,
  });

  await commitFiles(
    token,
    repo.full_name,
    repo.default_branch,
    files,
    `CardForge: save ${project.name}`,
  );

  // 4. Record it in the personal index.
  await upsertIndexEntry(token, owner, {
    id: project.id,
    slug: project.slug,
    name: project.name,
    description: project.description || '',
    repo: repo.full_name,
    private: repo.private,
    isPublic: !!project.isPublic,
    updatedAt: new Date().toISOString(),
    htmlUrl: repo.html_url,
    pagesUrl: project.pagesUrl,
  });

  return { repo: repo.full_name, fileCount: files.length, htmlUrl: repo.html_url };
};

/** Load a project from its repo, rehydrating image references into data URLs. */
export const loadProject = async (token: string, repoFullName: string): Promise<CardProject> => {
  const json = await getFileText(token, repoFullName, 'project.json');
  if (json === null) throw new Error(`No project.json in ${repoFullName}`);

  let project: CardProject;
  try {
    project = JSON.parse(json) as CardProject;
  } catch (e) {
    throw new Error(`Failed to parse project.json: ${(e as Error).message}`);
  }

  return inlineAssets(project, async (path) => {
    const file = await getFile(token, repoFullName, path);
    return file ? file.bytes : null;
  });
};

// ── Index repo ────────────────────────────────────────────────────────────--

const indexCsv = (entries: IndexEntry[]): string => {
  const cols: (keyof IndexEntry)[] = ['id', 'slug', 'name', 'description', 'repo', 'private', 'isPublic', 'updatedAt', 'htmlUrl', 'pagesUrl'];
  const escape = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const header = cols.join(',');
  const body = entries.map((e) => cols.map((c) => escape(e[c])).join(',')).join('\n');
  return `${header}\n${body}`;
};

/** Read the project index. Returns [] if the index repo/file doesn't exist yet. */
export const readIndex = async (token: string, owner: string): Promise<IndexEntry[]> => {
  const json = await getFileText(token, `${owner}/${INDEX_REPO}`, 'index.json').catch(() => null);
  if (!json) return [];
  try {
    const data = JSON.parse(json);
    return Array.isArray(data?.projects) ? (data.projects as IndexEntry[]) : [];
  } catch {
    return [];
  }
};

/** Ensure the index repo exists and return the current entries. */
export const listProjects = async (token: string, owner: string): Promise<IndexEntry[]> => {
  await ensureRepo(token, owner, INDEX_REPO, {
    private: true,
    description: 'CardForge — personal project index',
  });
  return readIndex(token, owner);
};

const writeIndex = async (token: string, owner: string, entries: IndexEntry[]): Promise<void> => {
  const repo = await ensureRepo(token, owner, INDEX_REPO, {
    private: true,
    description: 'CardForge — personal project index',
  });
  const sorted = [...entries].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const files: CommitFile[] = [
    { path: 'index.json', bytes: textToBytes(JSON.stringify({ projects: sorted }, null, 2)) },
    { path: 'index.csv', bytes: textToBytes(indexCsv(sorted)) },
  ];
  await commitFiles(token, repo.full_name, repo.default_branch, files, 'CardForge: update index');
};

/** Insert or replace a project's index entry (keyed by project id). */
export const upsertIndexEntry = async (
  token: string,
  owner: string,
  entry: IndexEntry,
): Promise<void> => {
  const entries = await readIndex(token, owner);
  const next = entries.filter((e) => e.id !== entry.id);
  next.push(entry);
  await writeIndex(token, owner, next);
};

/** Remove a project from the index (does not delete the repo). */
export const removeIndexEntry = async (token: string, owner: string, id: string): Promise<void> => {
  const entries = await readIndex(token, owner);
  await writeIndex(token, owner, entries.filter((e) => e.id !== id));
};

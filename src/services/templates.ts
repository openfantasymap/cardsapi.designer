/**
 * Template library — built-in starters + a public shared GitHub repo (global)
 * + the user's personal templates in their cardforge-index repo.
 *
 *   global:   openfantasymap/cardforge-templates  (public, no auth, index.json)
 *   personal: <owner>/cardforge-index/templates/*.json  (private, user token)
 *   builtin:  bundled fallback (always available, used offline)
 */
import { CardTemplate, CardRow } from '@/types/card';
import { CARD_PRESETS } from '@/lib/cardPresets';
import { getDir, getFileText, commitFiles, ensureRepo, textToBytes } from '@/services/githubApi';
import { INDEX_REPO } from '@/services/projects';

export type TemplateGroup = 'builtin' | 'global' | 'personal';

export interface TemplateEntry {
  id: string;
  label: string;
  description: string;
  group: TemplateGroup;
  template: CardTemplate;
  rows: CardRow[];
  /** Custom icon/symbol-font stylesheet URLs the template ships with (e.g. Mana). */
  iconStylesheets?: string[];
}

const gid = () => Math.random().toString(36).slice(2, 10);

const GLOBAL_REPO = 'openfantasymap/cardforge-templates';
const GLOBAL_INDEX = `https://raw.githubusercontent.com/${GLOBAL_REPO}/main/index.json`;

/** The blank starter (kept separate from the named templates). */
export const blankPreset = CARD_PRESETS.find((p) => p.id === 'blank')!;

/** Built-in starter templates — always available, and the offline fallback. */
export const builtinTemplates = (): TemplateEntry[] =>
  CARD_PRESETS.filter((p) => p.id !== 'blank').map((p): TemplateEntry => {
    const { template, rows, iconStylesheets } = p.build();
    return { id: p.id, label: p.label, description: p.description, group: 'builtin', template, rows, iconStylesheets };
  });

/** Public shared templates (no auth). Returns [] on failure / offline. */
export const fetchGlobalTemplates = async (): Promise<TemplateEntry[]> => {
  try {
    const res = await fetch(GLOBAL_INDEX, { cache: 'no-cache' });
    if (!res.ok) return [];
    const data = await res.json();
    const list: any[] = Array.isArray(data?.templates) ? data.templates : [];
    return list
      .filter((t) => t?.template)
      .map((t): TemplateEntry => ({
        id: t.id, label: t.label ?? t.id, description: t.description ?? '',
        group: 'global', template: t.template, rows: t.rows ?? [], iconStylesheets: t.iconStylesheets ?? [],
      }));
  } catch {
    return [];
  }
};

/** The signed-in user's personal templates. Returns [] if none / not connected. */
export const fetchPersonalTemplates = async (token: string, owner: string): Promise<TemplateEntry[]> => {
  try {
    const dir = await getDir(token, `${owner}/${INDEX_REPO}`, 'templates');
    const out: TemplateEntry[] = [];
    for (const f of dir.filter((d) => d.type === 'file' && d.name.endsWith('.json'))) {
      const text = await getFileText(token, `${owner}/${INDEX_REPO}`, f.path);
      if (!text) continue;
      try {
        const t = JSON.parse(text);
        if (t?.template) {
          out.push({
            id: t.id ?? f.name.replace(/\.json$/, ''), label: t.label ?? t.id ?? f.name,
            description: t.description ?? '', group: 'personal', template: t.template, rows: t.rows ?? [],
            iconStylesheets: t.iconStylesheets ?? [],
          });
        }
      } catch {
        /* skip malformed */
      }
    }
    return out;
  } catch {
    return [];
  }
};

/** Deep-clone a template with fresh ids so two projects never share element ids. */
export const instantiate = (entry: TemplateEntry): { template: CardTemplate; rows: CardRow[]; iconStylesheets?: string[] } => {
  const template: CardTemplate = JSON.parse(JSON.stringify(entry.template));
  template.id = gid();
  template.elements = template.elements.map((e) => ({ ...e, id: gid() }));
  return { template, rows: JSON.parse(JSON.stringify(entry.rows ?? [])), iconStylesheets: entry.iconStylesheets };
};

/** Save a template to the user's personal library (cardforge-index/templates/<id>.json). */
export const savePersonalTemplate = async (
  token: string,
  owner: string,
  entry: { id: string; label: string; description: string; template: CardTemplate; rows: CardRow[]; iconStylesheets?: string[] },
): Promise<void> => {
  const repo = await ensureRepo(token, owner, INDEX_REPO, { private: true, description: 'CardForge — personal project index' });
  const payload = { id: entry.id, label: entry.label, description: entry.description, template: entry.template, rows: entry.rows, iconStylesheets: entry.iconStylesheets ?? [] };
  await commitFiles(
    token,
    repo.full_name,
    repo.default_branch,
    [{ path: `templates/${entry.id}.json`, bytes: textToBytes(JSON.stringify(payload, null, 2)) }],
    `CardForge: save template ${entry.label}`,
  );
};

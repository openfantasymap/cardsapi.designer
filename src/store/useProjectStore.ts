import { create } from 'zustand';
import { CardProject, CardElement, CardTemplate, CardRow, CardSheet, slugify } from '@/types/card';

type TemplateFace = 'front' | 'back';

interface ProjectStore {
  projects: CardProject[];
  activeProjectId: string | null;
  activeSheetId: string | null;
  selectedElementId: string | null;
  activeFace: TemplateFace;
  /** When true, the canvas/panel edit the project-level global back instead of a sheet. */
  editingProjectBack: boolean;

  createProject: (name: string, description: string, seed?: { template: CardTemplate; rows?: CardRow[]; iconStylesheets?: string[] }, size?: { width: number; height: number }) => string;
  upsertProject: (project: CardProject) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setActiveSheet: (id: string | null) => void;
  setSelectedElement: (id: string | null) => void;
  setActiveFace: (face: TemplateFace) => void;
  /** Enter the global-back editor (creates project.back if missing). */
  editProjectBack: (projectId: string) => void;
  exitProjectBack: () => void;
  togglePublic: (projectId: string) => void;
  updateSlug: (projectId: string, slug: string) => boolean;
  setIconStylesheets: (projectId: string, urls: string[]) => void;
  setPagesUrl: (projectId: string, url: string) => void;
  addAssets: (projectId: string, files: { name: string; dataUrl: string }[]) => void;
  removeAsset: (projectId: string, name: string) => void;

  // Sheet management
  addSheet: (projectId: string, name: string, size?: { width: number; height: number }) => string;
  duplicateSheet: (projectId: string, sheetId: string) => void;
  removeSheet: (projectId: string, sheetId: string) => void;
  renameSheet: (projectId: string, sheetId: string, name: string) => void;

  // Back template
  enableBackTemplate: (projectId: string) => void;
  removeBackTemplate: (projectId: string) => void;

  // Template operations (scoped to active sheet + active face)
  addElement: (projectId: string, element: CardElement) => void;
  updateElement: (projectId: string, elementId: string, updates: Partial<CardElement>) => void;
  removeElement: (projectId: string, elementId: string) => void;
  duplicateElement: (projectId: string, elementId: string) => void;
  reorderElement: (projectId: string, elementId: string, dir: 'front' | 'back' | 'forward' | 'backward') => void;
  updateTemplateBackground: (projectId: string, bg: string) => void;

  // Row operations (scoped to active sheet)
  setRows: (projectId: string, rows: CardRow[]) => void;
  addRow: (projectId: string, row: CardRow) => void;
  updateRow: (projectId: string, index: number, row: CardRow) => void;
  removeRow: (projectId: string, index: number) => void;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

const makeDefaultTemplate = (): CardTemplate => ({
  id: generateId(),
  name: 'Default',
  width: 350,
  height: 490,
  backgroundColor: 'hsl(220 18% 13%)',
  elements: [],
});

/** Helper: map over the active sheet within a project */
const mapActiveSheet = (
  projects: CardProject[],
  projectId: string,
  sheetId: string | null,
  fn: (sheet: CardSheet) => CardSheet
): CardProject[] =>
  projects.map((p) =>
    p.id === projectId
      ? { ...p, sheets: p.sheets.map((s) => (s.id === sheetId ? fn(s) : s)) }
      : p
  );

/** Get the template for the active face */
const getActiveTemplate = (sheet: CardSheet, face: TemplateFace): CardTemplate | undefined =>
  face === 'back' ? sheet.backTemplate : sheet.template;

/** Map the active-face template */
const mapFaceTemplate = (
  sheet: CardSheet,
  face: TemplateFace,
  fn: (t: CardTemplate) => CardTemplate
): CardSheet => {
  if (face === 'back' && sheet.backTemplate) {
    return { ...sheet, backTemplate: fn(sheet.backTemplate) };
  }
  return { ...sheet, template: fn(sheet.template) };
};

/**
 * Map whichever template is currently being edited: the project-level global
 * back (when `editingProjectBack`) or the active sheet's active face.
 */
const mapEditTarget = (
  s: { projects: CardProject[]; activeProjectId: string | null; activeSheetId: string | null; activeFace: TemplateFace; editingProjectBack: boolean },
  projectId: string,
  fn: (t: CardTemplate) => CardTemplate
): CardProject[] => {
  if (s.editingProjectBack) {
    return s.projects.map((p) => (p.id === projectId && p.back ? { ...p, back: fn(p.back) } : p));
  }
  return mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => mapFaceTemplate(sh, s.activeFace, fn));
};

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  activeSheetId: null,
  selectedElementId: null,
  activeFace: 'front',
  editingProjectBack: false,

  createProject: (name, description, seed, size) => {
    const id = generateId();
    const sheetId = generateId();
    const base = slugify(name);
    const taken = new Set(get().projects.map((p) => p.slug));
    let slug = base;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
    // Seed from a starter (already sized) or a fresh default, then apply the
    // chosen card size on top. Both are freshly-owned objects, safe to mutate.
    const template = seed?.template ?? makeDefaultTemplate();
    if (size) {
      template.width = size.width;
      template.height = size.height;
    }
    const project: CardProject = {
      id,
      name,
      description,
      createdAt: new Date().toISOString(),
      slug,
      sheets: [
        {
          id: sheetId,
          name: 'Card',
          template,
          rows: seed?.rows ?? [],
        },
      ],
      ...(seed?.iconStylesheets?.length ? { iconStylesheets: seed.iconStylesheets } : {}),
    };
    set((s) => ({ projects: [...s.projects, project] }));
    return id;
  },

  upsertProject: (project) =>
    set((s) => {
      const exists = s.projects.some((p) => p.id === project.id);
      return {
        projects: exists
          ? s.projects.map((p) => (p.id === project.id ? project : p))
          : [...s.projects, project],
      };
    }),

  deleteProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
      activeSheetId: s.activeProjectId === id ? null : s.activeSheetId,
    })),

  setActiveProject: (id) => {
    if (!id) {
      set({ activeProjectId: null, activeSheetId: null, selectedElementId: null, activeFace: 'front', editingProjectBack: false });
      return;
    }
    const project = get().projects.find((p) => p.id === id);
    set({
      activeProjectId: id,
      activeSheetId: project?.sheets[0]?.id ?? null,
      selectedElementId: null,
      activeFace: 'front',
      editingProjectBack: false,
    });
  },

  setActiveSheet: (id) => set({ activeSheetId: id, selectedElementId: null, activeFace: 'front', editingProjectBack: false }),
  setSelectedElement: (id) => set({ selectedElementId: id }),
  setActiveFace: (face) => set({ activeFace: face, selectedElementId: null, editingProjectBack: false }),

  editProjectBack: (projectId) =>
    set((s) => {
      const project = s.projects.find((p) => p.id === projectId);
      const ref = project?.sheets[0]?.template;
      const projects = project?.back
        ? s.projects
        : s.projects.map((p) =>
            p.id === projectId
              ? { ...p, back: { ...makeDefaultTemplate(), name: 'Card Back', width: ref?.width ?? 350, height: ref?.height ?? 490 } }
              : p
          );
      return { projects, editingProjectBack: true, selectedElementId: null };
    }),

  exitProjectBack: () => set({ editingProjectBack: false, selectedElementId: null }),

  togglePublic: (projectId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, isPublic: !p.isPublic } : p
      ),
    })),

  updateSlug: (projectId, rawSlug) => {
    const clean = slugify(rawSlug);
    if (!clean) return false;
    if (get().projects.some((p) => p.id !== projectId && p.slug === clean)) return false;
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, slug: clean } : p)),
    }));
    return true;
  },

  setIconStylesheets: (projectId, urls) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, iconStylesheets: urls } : p)),
    })),

  setPagesUrl: (projectId, url) =>
    set((s) => ({
      projects: s.projects.map((p) => (p.id === projectId ? { ...p, pagesUrl: url } : p)),
    })),

  addAssets: (projectId, files) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, assets: { ...(p.assets ?? {}), ...Object.fromEntries(files.map((f) => [f.name, f.dataUrl])) } }
          : p,
      ),
    })),

  removeAsset: (projectId, name) =>
    set((s) => ({
      projects: s.projects.map((p) => {
        if (p.id !== projectId) return p;
        const next = { ...(p.assets ?? {}) };
        delete next[name];
        return { ...p, assets: next };
      }),
    })),

  // Sheet management
  addSheet: (projectId, name, size) => {
    const sheetId = generateId();
    const template = makeDefaultTemplate();
    if (size) {
      template.width = size.width;
      template.height = size.height;
    }
    const sheet: CardSheet = {
      id: sheetId,
      name,
      template,
      rows: [],
    };
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId ? { ...p, sheets: [...p.sheets, sheet] } : p
      ),
      activeSheetId: sheetId,
      selectedElementId: null,
      activeFace: 'front',
    }));
    return sheetId;
  },

  duplicateSheet: (projectId, sheetId) => {
    const newSheetId = generateId();
    set((s) => {
      const project = s.projects.find((p) => p.id === projectId);
      const src = project?.sheets.find((sh) => sh.id === sheetId);
      if (!src) return s;
      const clone: CardSheet = JSON.parse(JSON.stringify(src));
      clone.id = newSheetId;
      clone.name = `${src.name} copy`;
      clone.template = { ...clone.template, id: generateId(), elements: clone.template.elements.map((e) => ({ ...e, id: generateId() })) };
      if (clone.backTemplate) {
        clone.backTemplate = { ...clone.backTemplate, id: generateId(), elements: clone.backTemplate.elements.map((e) => ({ ...e, id: generateId() })) };
      }
      return {
        projects: s.projects.map((p) => (p.id === projectId ? { ...p, sheets: [...p.sheets, clone] } : p)),
        activeSheetId: newSheetId,
        selectedElementId: null,
        activeFace: 'front' as TemplateFace,
      };
    });
  },

  removeSheet: (projectId, sheetId) =>
    set((s) => {
      const project = s.projects.find((p) => p.id === projectId);
      if (!project || project.sheets.length <= 1) return s;
      const remaining = project.sheets.filter((sh) => sh.id !== sheetId);
      return {
        projects: s.projects.map((p) =>
          p.id === projectId ? { ...p, sheets: remaining } : p
        ),
        activeSheetId: s.activeSheetId === sheetId ? remaining[0]?.id ?? null : s.activeSheetId,
        selectedElementId: s.activeSheetId === sheetId ? null : s.selectedElementId,
      };
    }),

  renameSheet: (projectId, sheetId, name) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, sheetId, (sh) => ({ ...sh, name })),
    })),

  // Back template — seed from the project's global back if defined, else blank.
  enableBackTemplate: (projectId) =>
    set((s) => {
      const globalBack = s.projects.find((p) => p.id === projectId)?.back;
      const seed = (sh: CardSheet): CardTemplate =>
        globalBack
          ? { ...globalBack, id: generateId(), elements: globalBack.elements.map((e) => ({ ...e, id: generateId(), style: { ...e.style } })) }
          : { ...makeDefaultTemplate(), width: sh.template.width, height: sh.template.height };
      return {
        projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
          ...sh,
          backTemplate: sh.backTemplate ?? seed(sh),
        })),
      };
    }),

  removeBackTemplate: (projectId) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        backTemplate: undefined,
      })),
      activeFace: 'front',
      selectedElementId: null,
    })),

  // Element ops — target the active sheet face, or the global back when editing it.
  addElement: (projectId, element) =>
    set((s) => ({
      projects: mapEditTarget(s, projectId, (t) => ({ ...t, elements: [...t.elements, element] })),
    })),

  updateElement: (projectId, elementId, updates) =>
    set((s) => ({
      projects: mapEditTarget(s, projectId, (t) => ({
        ...t,
        elements: t.elements.map((el) => (el.id === elementId ? { ...el, ...updates } : el)),
      })),
    })),

  removeElement: (projectId, elementId) =>
    set((s) => ({
      projects: mapEditTarget(s, projectId, (t) => ({
        ...t,
        elements: t.elements.filter((el) => el.id !== elementId),
      })),
      selectedElementId: s.selectedElementId === elementId ? null : s.selectedElementId,
    })),

  duplicateElement: (projectId, elementId) => {
    const newId = generateId();
    set((s) => ({
      projects: mapEditTarget(s, projectId, (t) => {
        const src = t.elements.find((el) => el.id === elementId);
        if (!src) return t;
        const copy: CardElement = { ...src, id: newId, x: src.x + 12, y: src.y + 12, style: { ...src.style } };
        return { ...t, elements: [...t.elements, copy] };
      }),
      selectedElementId: newId,
    }));
  },

  reorderElement: (projectId, elementId, dir) =>
    set((s) => ({
      projects: mapEditTarget(s, projectId, (t) => {
        const els = [...t.elements];
        const i = els.findIndex((el) => el.id === elementId);
        if (i < 0) return t;
        const [el] = els.splice(i, 1);
        // Render order = array order (later draws on top).
        if (dir === 'front') els.push(el);
        else if (dir === 'back') els.unshift(el);
        else if (dir === 'forward') els.splice(Math.min(i + 1, els.length), 0, el);
        else els.splice(Math.max(i - 1, 0), 0, el);
        return { ...t, elements: els };
      }),
    })),

  updateTemplateBackground: (projectId, bg) =>
    set((s) => ({
      projects: mapEditTarget(s, projectId, (t) => ({ ...t, backgroundImage: bg })),
    })),

  // Row ops — scoped to activeSheet
  setRows: (projectId, rows) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        rows,
      })),
    })),

  addRow: (projectId, row) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        rows: [...sh.rows, row],
      })),
    })),

  updateRow: (projectId, index, row) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        rows: sh.rows.map((r, i) => (i === index ? row : r)),
      })),
    })),

  removeRow: (projectId, index) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        rows: sh.rows.filter((_, i) => i !== index),
      })),
    })),
}));

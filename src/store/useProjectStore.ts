import { create } from 'zustand';
import { CardProject, CardElement, CardTemplate, CardRow, CardSheet, slugify } from '@/types/card';

type TemplateFace = 'front' | 'back';

interface ProjectStore {
  projects: CardProject[];
  activeProjectId: string | null;
  activeSheetId: string | null;
  selectedElementId: string | null;
  activeFace: TemplateFace;

  createProject: (name: string, description: string) => string;
  upsertProject: (project: CardProject) => void;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setActiveSheet: (id: string | null) => void;
  setSelectedElement: (id: string | null) => void;
  setActiveFace: (face: TemplateFace) => void;
  togglePublic: (projectId: string) => void;
  updateSlug: (projectId: string, slug: string) => boolean;

  // Sheet management
  addSheet: (projectId: string, name: string) => string;
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

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  activeSheetId: null,
  selectedElementId: null,
  activeFace: 'front',

  createProject: (name, description) => {
    const id = generateId();
    const sheetId = generateId();
    const base = slugify(name);
    const taken = new Set(get().projects.map((p) => p.slug));
    let slug = base;
    let n = 2;
    while (taken.has(slug)) slug = `${base}-${n++}`;
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
          template: makeDefaultTemplate(),
          rows: [],
        },
      ],
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
      set({ activeProjectId: null, activeSheetId: null, selectedElementId: null, activeFace: 'front' });
      return;
    }
    const project = get().projects.find((p) => p.id === id);
    set({
      activeProjectId: id,
      activeSheetId: project?.sheets[0]?.id ?? null,
      selectedElementId: null,
      activeFace: 'front',
    });
  },

  setActiveSheet: (id) => set({ activeSheetId: id, selectedElementId: null, activeFace: 'front' }),
  setSelectedElement: (id) => set({ selectedElementId: id }),
  setActiveFace: (face) => set({ activeFace: face, selectedElementId: null }),

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

  // Sheet management
  addSheet: (projectId, name) => {
    const sheetId = generateId();
    const sheet: CardSheet = {
      id: sheetId,
      name,
      template: makeDefaultTemplate(),
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

  // Back template
  enableBackTemplate: (projectId) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        backTemplate: sh.backTemplate ?? {
          ...makeDefaultTemplate(),
          width: sh.template.width,
          height: sh.template.height,
        },
      })),
    })),

  removeBackTemplate: (projectId) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        backTemplate: undefined,
      })),
      activeFace: 'front',
      selectedElementId: null,
    })),

  // Element ops — scoped to activeSheet + activeFace
  addElement: (projectId, element) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) =>
        mapFaceTemplate(sh, s.activeFace, (t) => ({
          ...t,
          elements: [...t.elements, element],
        }))
      ),
    })),

  updateElement: (projectId, elementId, updates) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) =>
        mapFaceTemplate(sh, s.activeFace, (t) => ({
          ...t,
          elements: t.elements.map((el) =>
            el.id === elementId ? { ...el, ...updates } : el
          ),
        }))
      ),
    })),

  removeElement: (projectId, elementId) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) =>
        mapFaceTemplate(sh, s.activeFace, (t) => ({
          ...t,
          elements: t.elements.filter((el) => el.id !== elementId),
        }))
      ),
      selectedElementId: s.selectedElementId === elementId ? null : s.selectedElementId,
    })),

  duplicateElement: (projectId, elementId) => {
    const newId = generateId();
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) =>
        mapFaceTemplate(sh, s.activeFace, (t) => {
          const src = t.elements.find((el) => el.id === elementId);
          if (!src) return t;
          const copy: CardElement = { ...src, id: newId, x: src.x + 12, y: src.y + 12, style: { ...src.style } };
          return { ...t, elements: [...t.elements, copy] };
        })
      ),
      selectedElementId: newId,
    }));
  },

  reorderElement: (projectId, elementId, dir) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) =>
        mapFaceTemplate(sh, s.activeFace, (t) => {
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
        })
      ),
    })),

  updateTemplateBackground: (projectId, bg) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) =>
        mapFaceTemplate(sh, s.activeFace, (t) => ({
          ...t,
          backgroundImage: bg,
        }))
      ),
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

import { create } from 'zustand';
import { CardProject, CardElement, CardTemplate, CardRow, CardSheet } from '@/types/card';

interface ProjectStore {
  projects: CardProject[];
  activeProjectId: string | null;
  activeSheetId: string | null;
  selectedElementId: string | null;

  createProject: (name: string, description: string) => string;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setActiveSheet: (id: string | null) => void;
  setSelectedElement: (id: string | null) => void;

  // Sheet management
  addSheet: (projectId: string, name: string) => string;
  removeSheet: (projectId: string, sheetId: string) => void;
  renameSheet: (projectId: string, sheetId: string, name: string) => void;

  // Template operations (scoped to active sheet)
  addElement: (projectId: string, element: CardElement) => void;
  updateElement: (projectId: string, elementId: string, updates: Partial<CardElement>) => void;
  removeElement: (projectId: string, elementId: string) => void;
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

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  activeSheetId: null,
  selectedElementId: null,

  createProject: (name, description) => {
    const id = generateId();
    const sheetId = generateId();
    const project: CardProject = {
      id,
      name,
      description,
      createdAt: new Date().toISOString(),
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

  deleteProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
      activeSheetId: s.activeProjectId === id ? null : s.activeSheetId,
    })),

  setActiveProject: (id) => {
    if (!id) {
      set({ activeProjectId: null, activeSheetId: null, selectedElementId: null });
      return;
    }
    const project = get().projects.find((p) => p.id === id);
    set({
      activeProjectId: id,
      activeSheetId: project?.sheets[0]?.id ?? null,
      selectedElementId: null,
    });
  },

  setActiveSheet: (id) => set({ activeSheetId: id, selectedElementId: null }),
  setSelectedElement: (id) => set({ selectedElementId: id }),

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
    }));
    return sheetId;
  },

  removeSheet: (projectId, sheetId) =>
    set((s) => {
      const project = s.projects.find((p) => p.id === projectId);
      if (!project || project.sheets.length <= 1) return s; // keep at least one
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

  // Element ops — scoped to activeSheet
  addElement: (projectId, element) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        template: { ...sh.template, elements: [...sh.template.elements, element] },
      })),
    })),

  updateElement: (projectId, elementId, updates) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        template: {
          ...sh.template,
          elements: sh.template.elements.map((el) =>
            el.id === elementId ? { ...el, ...updates } : el
          ),
        },
      })),
    })),

  removeElement: (projectId, elementId) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        template: {
          ...sh.template,
          elements: sh.template.elements.filter((el) => el.id !== elementId),
        },
      })),
      selectedElementId: s.selectedElementId === elementId ? null : s.selectedElementId,
    })),

  updateTemplateBackground: (projectId, bg) =>
    set((s) => ({
      projects: mapActiveSheet(s.projects, projectId, s.activeSheetId, (sh) => ({
        ...sh,
        template: { ...sh.template, backgroundImage: bg },
      })),
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

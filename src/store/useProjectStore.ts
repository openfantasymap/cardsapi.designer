import { create } from 'zustand';
import { CardProject, CardElement, CardTemplate } from '@/types/card';

interface ProjectStore {
  projects: CardProject[];
  activeProjectId: string | null;
  selectedElementId: string | null;
  
  createProject: (name: string, description: string) => string;
  deleteProject: (id: string) => void;
  setActiveProject: (id: string | null) => void;
  setSelectedElement: (id: string | null) => void;
  
  initTemplate: (projectId: string, template: Partial<CardTemplate>) => void;
  addElement: (projectId: string, element: CardElement) => void;
  updateElement: (projectId: string, elementId: string, updates: Partial<CardElement>) => void;
  removeElement: (projectId: string, elementId: string) => void;
  updateTemplateBackground: (projectId: string, bg: string) => void;
}

const generateId = () => Math.random().toString(36).slice(2, 10);

export const useProjectStore = create<ProjectStore>((set, get) => ({
  projects: [],
  activeProjectId: null,
  selectedElementId: null,

  createProject: (name, description) => {
    const id = generateId();
    const project: CardProject = {
      id,
      name,
      description,
      createdAt: new Date().toISOString(),
      template: {
        id: generateId(),
        name: 'Default',
        width: 350,
        height: 490,
        backgroundColor: 'hsl(220 18% 13%)',
        elements: [],
      },
    };
    set((s) => ({ projects: [...s.projects, project] }));
    return id;
  },

  deleteProject: (id) =>
    set((s) => ({
      projects: s.projects.filter((p) => p.id !== id),
      activeProjectId: s.activeProjectId === id ? null : s.activeProjectId,
    })),

  setActiveProject: (id) => set({ activeProjectId: id, selectedElementId: null }),
  setSelectedElement: (id) => set({ selectedElementId: id }),

  initTemplate: (projectId, template) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId
          ? { ...p, template: { ...p.template!, ...template } }
          : p
      ),
    })),

  addElement: (projectId, element) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId && p.template
          ? { ...p, template: { ...p.template, elements: [...p.template.elements, element] } }
          : p
      ),
    })),

  updateElement: (projectId, elementId, updates) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId && p.template
          ? {
              ...p,
              template: {
                ...p.template,
                elements: p.template.elements.map((el) =>
                  el.id === elementId ? { ...el, ...updates } : el
                ),
              },
            }
          : p
      ),
    })),

  removeElement: (projectId, elementId) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId && p.template
          ? {
              ...p,
              template: {
                ...p.template,
                elements: p.template.elements.filter((el) => el.id !== elementId),
              },
            }
          : p
      ),
      selectedElementId: s.selectedElementId === elementId ? null : s.selectedElementId,
    })),

  updateTemplateBackground: (projectId, bg) =>
    set((s) => ({
      projects: s.projects.map((p) =>
        p.id === projectId && p.template
          ? { ...p, template: { ...p.template, backgroundImage: bg } }
          : p
      ),
    })),
}));

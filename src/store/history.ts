import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';
import type { CardProject } from '@/types/card';

/**
 * Undo/redo for the project state.
 *
 * Rather than instrument every store action, we subscribe to `projects` changes
 * and snapshot the *previous* value. Rapid bursts (a drag, typing in a number
 * field) are coalesced: a snapshot is only taken when >COALESCE_MS have passed
 * since the last change, so one drag = one undo step.
 */
const COALESCE_MS = 500;
const LIMIT = 60;
let lastTs = 0;
let applying = false;

interface HistoryState {
  past: CardProject[][];
  future: CardProject[][];
  undo: () => void;
  redo: () => void;
}

export const useHistoryStore = create<HistoryState>((set, get) => ({
  past: [],
  future: [],
  undo: () => {
    const { past, future } = get();
    if (!past.length) return;
    const current = useProjectStore.getState().projects;
    const previous = past[past.length - 1];
    applying = true;
    useProjectStore.setState({ projects: previous, selectedElementId: null });
    applying = false;
    set({ past: past.slice(0, -1), future: [...future, current] });
  },
  redo: () => {
    const { past, future } = get();
    if (!future.length) return;
    const current = useProjectStore.getState().projects;
    const next = future[future.length - 1];
    applying = true;
    useProjectStore.setState({ projects: next, selectedElementId: null });
    applying = false;
    set({ past: [...past, current], future: future.slice(0, -1) });
  },
}));

// Record history whenever `projects` changes (except during undo/redo itself).
useProjectStore.subscribe((state, prev) => {
  if (applying || state.projects === prev.projects) return;
  const now = Date.now();
  if (now - lastTs > COALESCE_MS) {
    const { past } = useHistoryStore.getState();
    useHistoryStore.setState({ past: [...past.slice(-(LIMIT - 1)), prev.projects], future: [] });
  }
  lastTs = now;
});

import { create } from 'zustand';
import { useProjectStore } from './useProjectStore';
import { useGitHubStore } from './useGitHubStore';
import { saveProject } from '@/services/projects';
import type { CardProject } from '@/types/card';

/**
 * Git auto-save. Subscribes to project changes and, when signed in, commits the
 * active project to its `cardforge-<id>` repo after a short debounce (serialised
 * so commits never overlap). A per-project signature avoids re-committing
 * freshly loaded or unchanged projects.
 */
type Status = 'idle' | 'dirty' | 'saving' | 'saved' | 'error' | 'offline';

interface AutoSaveState {
  status: Status;
  error: string | null;
  enabled: boolean;
  setEnabled: (v: boolean) => void;
  /** Record a project's current content as already-saved (after load / manual save). */
  markSaved: (project: CardProject) => void;
  /** Force a save now (ignores the debounce + clean check). */
  saveNow: () => Promise<void>;
}

const DEBOUNCE_MS = 2500;
const sigOf = (p: CardProject) => JSON.stringify(p);
const lastSavedSig: Record<string, string> = {};
let timer: ReturnType<typeof setTimeout> | null = null;
let saving = false;
let queued = false;

export const useAutoSaveStore = create<AutoSaveState>((set) => ({
  status: 'idle',
  error: null,
  enabled: true,
  setEnabled: (v) => set({ enabled: v }),
  markSaved: (project) => {
    lastSavedSig[project.id] = sigOf(project);
    set({ status: 'saved', error: null });
  },
  saveNow: () => run(true),
}));

async function run(force = false): Promise<void> {
  const auto = useAutoSaveStore.getState();
  if (!auto.enabled && !force) return;

  const ps = useProjectStore.getState();
  const gh = useGitHubStore.getState();
  const project = ps.projects.find((p) => p.id === ps.activeProjectId);
  if (!project) return;

  if (!gh.token || !gh.user) {
    useAutoSaveStore.setState({ status: 'offline' });
    return;
  }

  const sig = sigOf(project);
  if (!force && lastSavedSig[project.id] === sig) {
    useAutoSaveStore.setState({ status: 'saved' });
    return;
  }
  if (saving) {
    queued = true; // coalesce changes made during an in-flight save
    return;
  }

  saving = true;
  useAutoSaveStore.setState({ status: 'saving', error: null });
  try {
    await saveProject(gh.token, gh.user.login, project);
    lastSavedSig[project.id] = sig;
    useAutoSaveStore.setState({ status: 'saved', error: null });
  } catch (e) {
    useAutoSaveStore.setState({ status: 'error', error: (e as Error).message });
  } finally {
    saving = false;
    if (queued) {
      queued = false;
      void run();
    }
  }
}

// Watch project content and schedule a debounced save.
useProjectStore.subscribe((state, prev) => {
  if (state.projects === prev.projects) return;
  const gh = useGitHubStore.getState();
  const auto = useAutoSaveStore.getState();
  if (!gh.token) {
    useAutoSaveStore.setState((s) => (s.status === 'saving' ? s : { status: 'offline' }));
    return;
  }
  if (!auto.enabled) return;
  useAutoSaveStore.setState((s) => (s.status === 'saving' ? s : { status: 'dirty' }));
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => void run(), DEBOUNCE_MS);
});

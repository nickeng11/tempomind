import { useSyncExternalStore } from 'react';
import type { Energy, OwnerPrivateState, Project } from '../types';
import { todayISO } from './dates';
import { createDemoProjects } from './demo';

// Projects and the owner's private state are persisted under separate keys.
// In a hosted version these map to a shared project table and an owner-only
// table; team views and share links only ever read the projects.
const PROJECTS_KEY = 'tempomind.projects.v1';
const PRIVATE_KEY = 'tempomind.owner-private.v1';

export interface AppState {
  projects: Project[];
  owner: OwnerPrivateState;
}

const EMPTY_OWNER: OwnerPrivateState = { energy: null, energyDate: null };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage unavailable (private mode, quota): keep working in memory.
  }
}

function init(): AppState {
  let projects = read<Project[]>(PROJECTS_KEY);
  if (!projects) {
    projects = createDemoProjects(todayISO());
    write(PROJECTS_KEY, projects);
  }
  return { projects, owner: read<OwnerPrivateState>(PRIVATE_KEY) ?? EMPTY_OWNER };
}

let state: AppState = init();
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function setProjects(update: (projects: Project[]) => Project[]) {
  state = { ...state, projects: update(state.projects) };
  write(PROJECTS_KEY, state.projects);
  emit();
}

function updateProject(id: string, update: (p: Project) => Project) {
  setProjects((projects) => projects.map((p) => (p.id === id ? update(p) : p)));
}

// Keep other tabs (e.g. an open team-view link) in sync live.
window.addEventListener('storage', (e) => {
  if (e.key === PROJECTS_KEY) state = { ...state, projects: read<Project[]>(PROJECTS_KEY) ?? [] };
  else if (e.key === PRIVATE_KEY) state = { ...state, owner: read<OwnerPrivateState>(PRIVATE_KEY) ?? EMPTY_OWNER };
  else return;
  emit();
});

export function useAppState(): AppState {
  return useSyncExternalStore(subscribe, () => state, () => state);
}

/** Energy check-ins reset each day. */
export function energyForToday(owner: OwnerPrivateState, today: string): Energy | null {
  return owner.energyDate === today ? owner.energy : null;
}

export const actions = {
  addProject(project: Project) {
    setProjects((projects) => [project, ...projects]);
  },

  deleteProject(id: string) {
    setProjects((projects) => projects.filter((p) => p.id !== id));
  },

  setStepsDone(projectId: string, stepIds: string[], done: boolean) {
    const ids = new Set(stepIds);
    const now = Date.now();
    updateProject(projectId, (p) => ({
      ...p,
      tasks: p.tasks.map((t) =>
        t.steps.some((s) => ids.has(s.id))
          ? {
              ...t,
              steps: t.steps.map((s) => {
                if (!ids.has(s.id)) return s;
                if (!done) return { ...s, done: false, doneAt: undefined };
                return s.done ? s : { ...s, done: true, doneAt: now };
              }),
            }
          : t,
      ),
    }));
  },

  startSession(projectId: string, taskId: string, durationMin: number) {
    updateProject(projectId, (p) => ({ ...p, session: { taskId, startedAt: Date.now(), durationMin } }));
  },

  endSession(projectId: string) {
    updateProject(projectId, (p) => ({ ...p, session: null }));
  },

  /** Human-confirmed completion. Only allowed once every sub-task is done. */
  completeProject(projectId: string) {
    updateProject(projectId, (p) => (p.tasks.every((t) => t.steps.every((s) => s.done)) ? { ...p, session: null, completedAt: Date.now() } : p));
  },

  setEnergy(energy: Energy | null) {
    state = { ...state, owner: { energy, energyDate: todayISO() } };
    write(PRIVATE_KEY, state.owner);
    emit();
  },

  resetDemo() {
    state = { projects: createDemoProjects(todayISO()), owner: EMPTY_OWNER };
    write(PROJECTS_KEY, state.projects);
    write(PRIVATE_KEY, state.owner);
    emit();
  },
};

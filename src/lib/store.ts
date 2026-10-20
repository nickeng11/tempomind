import { useSyncExternalStore } from 'react';
import type { Energy, OwnerPrivateState, Project, ShareLinks } from '../types';
import { todayISO } from './dates';
import { createDemoProjects } from './demo';
import { secureToken } from './uid';

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

/** Projects saved before link codes existed get their own pair. */
function withLinks(projects: Project[]): { projects: Project[]; changed: boolean } {
  let changed = false;
  const result = projects.map((p) => {
    if (p.links?.view && p.links?.collab) return p;
    changed = true;
    return { ...p, links: { view: secureToken(), collab: secureToken() } };
  });
  return { projects: result, changed };
}

function init(): AppState {
  const saved = read<Project[]>(PROJECTS_KEY);
  const { projects, changed } = withLinks(saved ?? createDemoProjects(todayISO()));
  if (!saved || changed) write(PROJECTS_KEY, projects);
  return { projects, owner: read<OwnerPrivateState>(PRIVATE_KEY) ?? EMPTY_OWNER };
}

/** Link pages look goals up by their link code, never by internal id. */
export function findByLink(projects: Project[], kind: keyof ShareLinks, code: string): Project | undefined {
  return projects.find((p) => p.links[kind] === code);
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
  if (e.key === PROJECTS_KEY) state = { ...state, projects: withLinks(read<Project[]>(PROJECTS_KEY) ?? []).projects };
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

  /** `by` is the collaborator's name; omit it when the owner makes the change. Completed goals are locked. */
  setStepsDone(projectId: string, stepIds: string[], done: boolean, by?: string) {
    const ids = new Set(stepIds);
    const now = Date.now();
    updateProject(projectId, (p) =>
      p.completedAt
        ? p
        : {
            ...p,
            tasks: p.tasks.map((t) =>
              t.steps.some((s) => ids.has(s.id))
                ? {
                    ...t,
                    steps: t.steps.map((s) => {
                      if (!ids.has(s.id)) return s;
                      if (!done) return { ...s, done: false, doneAt: undefined, doneBy: undefined };
                      return s.done ? s : { ...s, done: true, doneAt: now, doneBy: by };
                    }),
                  }
                : t,
            ),
          },
    );
  },

  startSession(projectId: string, taskId: string, durationMin: number) {
    updateProject(projectId, (p) => ({ ...p, session: { taskId, startedAt: Date.now(), durationMin } }));
  },

  endSession(projectId: string) {
    updateProject(projectId, (p) => ({ ...p, session: null }));
  },

  /** Owner-only: makes a completed goal active and editable again. */
  reopenProject(projectId: string) {
    updateProject(projectId, ({ completedAt: _, ...p }) => p);
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
    state = { projects: withLinks(createDemoProjects(todayISO())).projects, owner: EMPTY_OWNER };
    write(PROJECTS_KEY, state.projects);
    write(PRIVATE_KEY, state.owner);
    emit();
  },
};

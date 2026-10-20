import type { Energy, MicroStep, Project, Task } from '../types';
import { toISODate } from './dates';
import { isTaskDone, taskMinutes } from './metrics';

export const ENERGY_LEVELS: Energy[] = ['high', 'steady', 'low', 'fried'];

export const ENERGY_META: Record<Energy, { emoji: string; label: string; mode: string; sessionMin: number }> = {
  high: {
    emoji: '⚡',
    label: 'High Focus',
    mode: 'Deep-work blocks + a stretch task',
    sessionMin: 90,
  },
  steady: {
    emoji: '🟢',
    label: 'Steady',
    mode: "Today's plan, as scheduled",
    sessionMin: 50,
  },
  low: {
    emoji: '🔋',
    label: 'Low Energy',
    mode: 'Re-sliced into ~20-min chunks',
    sessionMin: 25,
  },
  fried: {
    emoji: '🔥',
    label: 'Fried / Overwhelmed',
    mode: 'One tiny step at a time',
    sessionMin: 10,
  },
};

const CHUNK_MAX_MIN = 20;
const LOW_ENERGY_FOCUS_TASKS = 2;

/** A checkable slice of today's work. Checking it marks the underlying micro-steps done. */
export interface WorkUnit {
  key: string;
  taskId: string;
  title: string;
  /** Parent task, shown when the unit is only part of a task. */
  context?: string;
  date: string;
  minutes: number;
  stepIds: string[];
  done: boolean;
  steps?: MicroStep[];
  tag?: 'overdue' | 'stretch';
}

export interface TodaySlice {
  units: WorkUnit[];
  parked: Task[];
  upNext: WorkUnit[];
  stepsDoneToday: number;
  stepsRemaining: number;
  nextDate: string | null;
}

function taskUnit(t: Task, today: string): WorkUnit {
  return {
    key: t.id,
    taskId: t.id,
    title: t.title,
    date: t.date,
    minutes: taskMinutes(t),
    stepIds: t.steps.map((s) => s.id),
    done: isTaskDone(t),
    steps: t.steps,
    tag: t.date < today ? 'overdue' : undefined,
  };
}

function chunkUnits(t: Task, today: string): WorkUnit[] {
  const chunks: MicroStep[][] = [];
  let current: MicroStep[] = [];
  let minutes = 0;
  for (const s of t.steps) {
    if (current.length && minutes + s.minutes > CHUNK_MAX_MIN) {
      chunks.push(current);
      current = [];
      minutes = 0;
    }
    current.push(s);
    minutes += s.minutes;
  }
  if (current.length) chunks.push(current);

  return chunks.map((steps, i) => ({
    key: `${t.id}:${i}`,
    taskId: t.id,
    title: steps.map((s) => s.title).join(' → '),
    context: `${t.title} · slice ${i + 1} of ${chunks.length}`,
    date: t.date,
    minutes: steps.reduce((n, s) => n + s.minutes, 0),
    stepIds: steps.map((s) => s.id),
    done: steps.every((s) => s.done),
    tag: t.date < today ? 'overdue' : undefined,
  }));
}

function stepUnit(s: MicroStep, t: Task): WorkUnit {
  return { key: s.id, taskId: t.id, title: s.title, context: t.title, date: t.date, minutes: s.minutes, stepIds: [s.id], done: s.done };
}

/**
 * Re-slices today's work for the owner's current energy. This only changes
 * presentation: task dates, milestones and deadlines are never modified.
 */
export function sliceToday(p: Project, energy: Energy, today: string): TodaySlice {
  // Today's tasks plus anything overdue that is still open.
  const tasks = p.tasks.filter((t) => t.date === today || (t.date < today && !isTaskDone(t)));
  const open = tasks.filter((t) => !isTaskDone(t));

  const slice: TodaySlice = {
    units: [],
    parked: [],
    upNext: [],
    stepsDoneToday: p.tasks.flatMap((t) => t.steps).filter((s) => s.done && s.doneAt && toISODate(new Date(s.doneAt)) === today).length,
    stepsRemaining: open.reduce((n, t) => n + t.steps.filter((s) => !s.done).length, 0),
    nextDate: p.tasks.find((t) => t.date > today && !isTaskDone(t))?.date ?? null,
  };

  switch (energy) {
    case 'high': {
      slice.units = tasks.map((t) => taskUnit(t, today));
      const stretch = p.tasks.find((t) => t.date > today && !isTaskDone(t));
      if (stretch) slice.units.push({ ...taskUnit(stretch, today), tag: 'stretch' });
      break;
    }
    case 'steady':
      slice.units = tasks.map((t) => taskUnit(t, today));
      break;
    case 'low': {
      const focus = new Set(open.slice(0, LOW_ENERGY_FOCUS_TASKS).map((t) => t.id));
      for (const t of tasks) {
        if (isTaskDone(t)) slice.units.push({ ...taskUnit(t, today), steps: undefined });
        else if (focus.has(t.id)) slice.units.push(...chunkUnits(t, today));
        else slice.parked.push(t);
      }
      break;
    }
    case 'fried': {
      const steps = open.flatMap((t) => t.steps.filter((s) => !s.done).map((s) => stepUnit(s, t)));
      slice.units = steps.slice(0, 1);
      slice.upNext = steps.slice(1, 3);
      break;
    }
  }
  return slice;
}

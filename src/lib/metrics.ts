import type { Milestone, Project, Task, WorkSession } from '../types';
import { diffDays, weekStart } from './dates';

export type PaceStatus = 'ahead' | 'on-track' | 'behind' | 'done';
export type MilestoneStatus = 'done' | 'current' | 'upcoming' | 'late';

export const taskMinutes = (t: Task) => t.steps.reduce((n, s) => n + s.minutes, 0);
const taskDoneMinutes = (t: Task) => t.steps.reduce((n, s) => n + (s.done ? s.minutes : 0), 0);
export const isTaskDone = (t: Task) => t.steps.every((s) => s.done);

/** Whole-number percent that only reads 100 when the work is actually finished. */
function percentOf(part: number, whole: number): number {
  if (!whole) return 0;
  if (part >= whole) return 100;
  return Math.min(99, Math.round((part / whole) * 100));
}

export function projectPercent(p: Project): number {
  return percentOf(p.tasks.reduce((n, t) => n + taskDoneMinutes(t), 0), p.tasks.reduce((n, t) => n + taskMinutes(t), 0));
}

/** Earliest unfinished task. Tasks are kept sorted by date, so overdue work comes first. */
export function nextOpenTask(p: Project): Task | null {
  return p.tasks.find((t) => !isTaskDone(t)) ?? null;
}

export function isSessionLive(s: WorkSession | null, now: number): s is WorkSession {
  return !!s && now < s.startedAt + s.durationMin * 60_000;
}

export interface MilestoneProgress extends Milestone {
  percent: number;
  status: MilestoneStatus;
}

export function milestoneProgress(p: Project, today: string): MilestoneProgress[] {
  return p.milestones.map((m) => {
    const tasks = p.tasks.filter((t) => t.milestoneId === m.id);
    const isCurrent = weekStart(m.startDate) === weekStart(today);
    if (tasks.length === 0) {
      // A buffer week: nothing scheduled, so it's "done" once it has passed.
      const status: MilestoneStatus = isCurrent ? 'current' : m.endDate < today ? 'done' : 'upcoming';
      return { ...m, percent: status === 'done' || projectPercent(p) === 100 ? 100 : 0, status };
    }
    const percent = percentOf(tasks.reduce((n, t) => n + taskDoneMinutes(t), 0), tasks.reduce((n, t) => n + taskMinutes(t), 0));
    let status: MilestoneStatus = 'upcoming';
    if (percent === 100) status = 'done';
    else if (isCurrent) status = 'current';
    else if (m.endDate < today) status = 'late';
    return { ...m, percent, status };
  });
}

export interface PublicSession {
  taskTitle: string;
  startedAt: number;
  durationMin: number;
}

/** Owner-only: how far ahead or behind the plan the work is, in minutes. */
export function projectPace(p: Project, today: string): { status: PaceStatus; deltaMin: number } {
  const totalMin = p.tasks.reduce((n, t) => n + taskMinutes(t), 0);
  const doneMin = p.tasks.reduce((n, t) => n + taskDoneMinutes(t), 0);
  const expectedMin = p.tasks.filter((t) => t.date < today).reduce((n, t) => n + taskMinutes(t), 0);
  const deltaMin = doneMin - expectedMin;
  const tolerance = Math.max(30, totalMin * 0.03);

  let status: PaceStatus = 'on-track';
  if (doneMin >= totalMin) status = 'done';
  else if (deltaMin > tolerance) status = 'ahead';
  else if (deltaMin < -tolerance) status = 'behind';
  return { status, deltaMin };
}

/**
 * Everything a teammate is allowed to see about a project. It is built from
 * the Project alone: the owner's private energy state lives in a separate
 * store and is never an input here. Pace and hours worked vs. planned are
 * deliberately left out, since day-to-day output can hint at someone's energy.
 */
export interface PublicProjectView {
  id: string;
  title: string;
  deadline: string;
  daysLeft: number;
  percent: number;
  /** Parent task title only. Micro-steps are never exposed, since their size hints at energy. */
  activeTask: string | null;
  session: PublicSession | null;
  milestones: MilestoneProgress[];
  completedAt: number | null;
  /** Code for the view-only link. The collaborator code is never included here. */
  viewLink: string;
}

export function toPublicView(p: Project, today: string, now: number): PublicProjectView {
  const liveSession = isSessionLive(p.session, now) ? p.session : null;
  const sessionTask = liveSession ? p.tasks.find((t) => t.id === liveSession.taskId) : undefined;
  const active = sessionTask ?? nextOpenTask(p);

  return {
    id: p.id,
    title: p.title,
    deadline: p.deadline,
    daysLeft: diffDays(today, p.deadline),
    percent: projectPercent(p),
    activeTask: active?.title ?? null,
    session: liveSession && sessionTask ? { taskTitle: sessionTask.title, startedAt: liveSession.startedAt, durationMin: liveSession.durationMin } : null,
    milestones: milestoneProgress(p, today),
    completedAt: p.completedAt ?? null,
    viewLink: p.links.view,
  };
}

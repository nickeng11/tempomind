import type { Milestone, Project, Task, WorkSession } from '../types';
import { addDays, diffDays, isWeekend, weekStart } from './dates';

export type PaceStatus = 'ahead' | 'on-track' | 'behind' | 'done';
export type MilestoneStatus = 'done' | 'current' | 'upcoming' | 'late';

export const taskMinutes = (t: Task) => t.steps.reduce((n, s) => n + s.minutes, 0);
export const taskDoneMinutes = (t: Task) => t.steps.reduce((n, s) => n + (s.done ? s.minutes : 0), 0);
export const isTaskDone = (t: Task) => t.steps.every((s) => s.done);

/** Whole-number percent that only reads 100 when the work is actually finished. */
export function percentOf(part: number, whole: number): number {
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

/**
 * Everything a teammate is allowed to see about a project. It is built from
 * the Project alone: the owner's private energy state lives in a separate
 * store and is never an input here.
 */
export interface PublicProjectView {
  id: string;
  title: string;
  category: string;
  startDate: string;
  deadline: string;
  daysLeft: number;
  totalMin: number;
  doneMin: number;
  expectedMin: number;
  percent: number;
  expectedPercent: number;
  paceStatus: PaceStatus;
  paceDeltaMin: number;
  /** Working days behind (positive) or ahead (negative) of the plan. */
  slipDays: number;
  projectedFinish: string;
  /** Parent task title only. Micro-steps are never exposed, since their size hints at energy. */
  activeTask: string | null;
  activeMilestone: string | null;
  session: PublicSession | null;
  milestones: MilestoneProgress[];
}

export function toPublicView(p: Project, today: string, now: number): PublicProjectView {
  const totalMin = p.tasks.reduce((n, t) => n + taskMinutes(t), 0);
  const doneMin = p.tasks.reduce((n, t) => n + taskDoneMinutes(t), 0);
  const expectedMin = p.tasks.filter((t) => t.date < today).reduce((n, t) => n + taskMinutes(t), 0);
  const delta = doneMin - expectedMin;
  const tolerance = Math.max(30, totalMin * 0.03);

  let paceStatus: PaceStatus = 'on-track';
  if (doneMin >= totalMin) paceStatus = 'done';
  else if (delta > tolerance) paceStatus = 'ahead';
  else if (delta < -tolerance) paceStatus = 'behind';

  // Keep the projection consistent with the pace pill: within tolerance means on schedule.
  const slipDays = paceStatus === 'on-track' || paceStatus === 'done' ? 0 : scheduleSlip(p, today, doneMin);
  const lastPlannedDay = p.tasks.length ? p.tasks[p.tasks.length - 1].date : p.deadline;

  const liveSession = isSessionLive(p.session, now) ? p.session : null;
  const sessionTask = liveSession ? p.tasks.find((t) => t.id === liveSession.taskId) : undefined;
  const active = sessionTask ?? nextOpenTask(p);

  return {
    id: p.id,
    title: p.title,
    category: p.category,
    startDate: p.startDate,
    deadline: p.deadline,
    daysLeft: diffDays(today, p.deadline),
    totalMin,
    doneMin,
    expectedMin,
    percent: percentOf(doneMin, totalMin),
    expectedPercent: percentOf(expectedMin, totalMin),
    paceStatus,
    paceDeltaMin: delta,
    slipDays,
    projectedFinish: paceStatus === 'done' ? today : shiftWorkdays(lastPlannedDay, slipDays),
    activeTask: active?.title ?? null,
    activeMilestone: p.milestones.find((m) => m.id === active?.milestoneId)?.title ?? null,
    session: liveSession && sessionTask ? { taskTitle: sessionTask.title, startedAt: liveSession.startedAt, durationMin: liveSession.durationMin } : null,
    milestones: milestoneProgress(p, today),
  };
}

/**
 * Schedule slip in working days: how many planned days of work are done,
 * versus how many planned days have already passed. Positive means behind.
 */
function scheduleSlip(p: Project, today: string, doneMin: number): number {
  const days = [...new Set(p.tasks.map((t) => t.date))];
  let remaining = doneMin;
  let earned = 0;
  for (const day of days) {
    const planned = p.tasks.filter((t) => t.date === day).reduce((n, t) => n + taskMinutes(t), 0);
    if (remaining >= planned) {
      earned += 1;
      remaining -= planned;
    } else {
      earned += remaining / planned;
      break;
    }
  }
  return Math.round(days.filter((d) => d < today).length - earned);
}

function shiftWorkdays(date: string, n: number): string {
  let d = date;
  for (let left = Math.abs(n); left > 0; ) {
    d = addDays(d, Math.sign(n));
    if (!isWeekend(d)) left--;
  }
  return d;
}

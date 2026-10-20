import type { Project, Task } from '../types';
import { addDays, formatDate, parseISODate } from './dates';
import { buildPlan } from './planner';

function at(date: string, hour: number): number {
  const d = parseISODate(date);
  d.setHours(hour, 0, 0, 0);
  return d.getTime();
}

/** Marks the first `count` micro-steps of a task done, stamped on `doneOn`, optionally by a collaborator. */
function complete(t: Task, doneOn: string, count = t.steps.length, doneBy?: string): Task {
  return {
    ...t,
    steps: t.steps.map((s, i) => (i < count ? { ...s, done: true, doneAt: at(doneOn, 9 + Math.min(i, 3)), ...(doneBy ? { doneBy } : {}) } : s)),
  };
}

/**
 * Four goals so every feature has something to show: one slightly behind with
 * a live focus session and collaborator work, one ahead, one ready to mark
 * complete and one already completed.
 */
export function createDemoProjects(today: string): Project[] {
  // Slightly behind pace, with a focus session already running.
  const roadmapDue = addDays(today, 18);
  const roadmap = buildPlan(`Build Q3 Product Roadmap by ${formatDate(roadmapDue)}`, roadmapDue, addDays(today, -10), { size: 'medium', hoursPerWeek: 8 }).project;
  const past = roadmap.tasks.filter((t) => t.date < today && t.kind !== 'review');
  const lagging = past[past.length - 1]?.id;
  // A couple of tasks ticked off by a (fictional) collaborator, to show the attribution marks.
  const byCollaborator = new Set([past[1]?.id, past[past.length - 3]?.id]);
  const firstToday = roadmap.tasks.find((t) => t.date === today)?.id;
  roadmap.tasks = roadmap.tasks.map((t) => {
    if (t.date < today) {
      if (t.id === lagging) return complete(t, t.date, 1);
      return complete(t, t.date, t.steps.length, byCollaborator.has(t.id) ? 'Sam Rivera' : undefined);
    }
    if (t.id === firstToday) return complete(t, today, 1);
    return t;
  });
  if (firstToday) roadmap.session = { taskId: firstToday, startedAt: Date.now() - 14 * 60_000, durationMin: 50 };

  // Ahead of pace: everything through today's first task (and a bit of tomorrow) is done.
  const betaDue = addDays(today, 24);
  const beta = buildPlan(`Launch the TempoMind beta by ${formatDate(betaDue)}`, betaDue, addDays(today, -4), { size: 'medium', hoursPerWeek: 12 }).project;
  const aheadIds = new Set(beta.tasks.filter((t) => t.date > today).slice(0, 1).map((t) => t.id));
  const betaFirstToday = beta.tasks.find((t) => t.date === today)?.id;
  beta.tasks = beta.tasks.map((t) => {
    if (t.date < today) return complete(t, t.date);
    if (t.id === betaFirstToday || aheadIds.has(t.id)) return complete(t, today);
    return t;
  });

  // Every task done but not yet confirmed, ready to demo "Mark for completion".
  const updateDue = addDays(today, 3);
  const update = buildPlan(`Write the Q3 investor update by ${formatDate(updateDue)}`, updateDue, addDays(today, -6), { size: 'small', hoursPerWeek: 8 }).project;
  update.tasks = update.tasks.map((t) => complete(t, t.date < today ? t.date : today));

  // Already confirmed complete, so the Completed Goals page isn't empty.
  const offsiteDue = addDays(today, -5);
  const offsite = buildPlan(`Organize the team offsite by ${formatDate(offsiteDue)}`, offsiteDue, addDays(today, -26), { size: 'small', hoursPerWeek: 4 }).project;
  offsite.tasks = offsite.tasks.map((t) => complete(t, t.date));
  offsite.completedAt = at(addDays(today, -7), 16);

  return [roadmap, beta, update, offsite];
}

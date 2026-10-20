import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check as CheckIcon, ChevronDown, Flag } from 'lucide-react';
import type { Project, Task } from '../types';
import { formatDate, formatDuration, formatHours } from '../lib/dates';
import { isTaskDone, milestoneProgress, taskMinutes, type MilestoneProgress } from '../lib/metrics';
import { actions } from '../lib/store';
import { Card, Check, cn, Pill, ProgressBar } from './ui';

/** Owner's editable plan. Remount per project (key) so the expanded week resets. */
export function PlanTimeline({ project, today }: { project: Project; today: string }) {
  const milestones = milestoneProgress(project, today);
  const [openId, setOpenId] = useState<string | null>(
    () => (milestones.find((m) => m.status === 'current') ?? milestones.find((m) => m.percent < 100))?.id ?? null,
  );
  const totalMin = project.tasks.reduce((n, t) => n + taskMinutes(t), 0);

  return (
    <Card>
      <div className="px-5 pt-5">
        <h2 className="font-semibold tracking-tight">Pacing plan</h2>
        <p className="mt-0.5 text-sm text-muted">
          {milestones.length} week{milestones.length === 1 ? '' : 's'} · ~{formatHours(totalMin)}
          {project.effort && ` at ${project.effort.hoursPerWeek}h/week`}
          {!!project.effort?.bufferDays && ` · ${project.effort.bufferDays}-day buffer`}
        </p>
      </div>
      <ol className="px-5 pb-5 pt-5">
        {milestones.map((m) => (
          <MilestoneItem
            key={m.id}
            milestone={m}
            tasks={project.tasks.filter((t) => t.milestoneId === m.id)}
            open={openId === m.id}
            onToggle={() => setOpenId(openId === m.id ? null : m.id)}
            projectId={project.id}
            today={today}
          />
        ))}
        <li className="relative flex items-center gap-3 pl-8 text-sm">
          <span className="absolute left-0 grid size-6 place-items-center rounded-full bg-linear-to-br from-accent-500 to-accent2-600 text-white shadow-sm shadow-accent-500/30">
            <Flag className="size-3" />
          </span>
          <span className="font-semibold">Deadline</span>
          <span className="text-muted">{formatDate(project.deadline, true)}</span>
        </li>
      </ol>
    </Card>
  );
}

const DOT: Record<MilestoneProgress['status'], string> = {
  done: 'border-transparent bg-linear-to-br from-accent-500 to-accent2-500 text-white',
  current: 'border-accent-500 bg-white text-accent-600 ring-4 ring-accent-500/15 dark:bg-base-900 dark:text-accent-300',
  late: 'border-amber-400 bg-white text-amber-600 dark:bg-base-900 dark:text-amber-300',
  upcoming: 'border-base-300 bg-white text-muted dark:border-base-700 dark:bg-base-900',
};

function MilestoneItem({ milestone: m, tasks, open, onToggle, projectId, today }: { milestone: MilestoneProgress; tasks: Task[]; open: boolean; onToggle: () => void; projectId: string; today: string }) {
  const days = [...new Set(tasks.map((t) => t.date))];

  return (
    <li className="relative pb-5 pl-8">
      <span className="absolute bottom-0 left-[11px] top-7 w-px bg-base-200 dark:bg-base-800" />
      <span className={cn('absolute left-0 top-0.5 grid size-6 place-items-center rounded-full border-2 text-[10px] font-bold transition-colors duration-500', DOT[m.status])}>
        {m.status === 'done' ? <CheckIcon className="size-3" strokeWidth={3} /> : m.week}
      </span>
      <button type="button" onClick={onToggle} aria-expanded={open} className="w-full text-left">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
          <span className="text-xs text-muted">
            {formatDate(m.startDate)} – {formatDate(m.endDate)}
          </span>
          {m.status === 'current' && <Pill tone="accent">This week</Pill>}
          {m.status === 'late' && <Pill tone="amber">Running over</Pill>}
          <ChevronDown className={cn('ml-auto size-4 text-muted transition-transform duration-200', open && 'rotate-180')} />
        </div>
        <p className="mt-0.5 text-sm font-semibold">{m.title}</p>
        <div className="mt-2 flex items-center gap-3">
          <ProgressBar size="sm" value={m.percent} label={`Week ${m.week} progress`} />
          <span className="w-9 shrink-0 text-right text-xs font-medium tabular-nums text-muted">{m.percent}%</span>
        </div>
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.22 }} className="overflow-hidden">
            {days.map((day) => (
              <div key={day} className="mt-3">
                <p className="mb-1 flex items-center gap-2 text-xs font-medium text-muted">
                  {formatDate(day, true)}
                  {day === today && <Pill tone="accent">Today</Pill>}
                </p>
                <ul>
                  {tasks
                    .filter((t) => t.date === day)
                    .map((t) => {
                      const done = isTaskDone(t);
                      const stepsDone = t.steps.filter((s) => s.done).length;
                      return (
                        <li key={t.id} className="-mx-2 flex items-center gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-base-50 dark:hover:bg-base-800/50">
                          <Check
                            size="sm"
                            checked={done}
                            onToggle={() => actions.setStepsDone(projectId, t.steps.map((s) => s.id), !done)}
                            label={`Mark "${t.title}" ${done ? 'not done' : 'done'}`}
                          />
                          <span className={cn('flex-1 text-sm transition-colors', done ? 'text-muted line-through' : 'text-base-700 dark:text-base-300')}>{t.title}</span>
                          {!done && stepsDone > 0 && (
                            <span className="text-xs tabular-nums text-accent-500">
                              {stepsDone}/{t.steps.length}
                            </span>
                          )}
                          <span className="text-xs tabular-nums text-muted">{formatDuration(taskMinutes(t))}</span>
                        </li>
                      );
                    })}
                </ul>
              </div>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </li>
  );
}

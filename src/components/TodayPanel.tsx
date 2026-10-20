import { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check as CheckIcon, ChevronDown, Clock, Coffee, ParkingCircle, PartyPopper, Play, Square, Timer } from 'lucide-react';
import type { Energy, Project } from '../types';
import { formatClock, formatDate, formatDuration } from '../lib/dates';
import { ENERGY_META, sliceToday, type TodaySlice, type WorkUnit } from '../lib/energy';
import { useNow } from '../lib/hooks';
import { isSessionLive, nextOpenTask } from '../lib/metrics';
import { actions } from '../lib/store';
import { btnPrimary, btnSecondary, Card, Check, cn, CountdownRing, Pill } from './ui';

type StepsMode = 'open-first' | 'collapsed' | 'none';
const STEPS_MODE: Record<Energy, StepsMode> = { high: 'collapsed', steady: 'open-first', low: 'none', fried: 'none' };

export function TodayPanel({ project, energy, today }: { project: Project; energy: Energy | null; today: string }) {
  const mode = energy ?? 'steady';
  const slice = useMemo(() => sliceToday(project, mode, today), [project, mode, today]);
  const meta = ENERGY_META[mode];

  const toggle = (unit: WorkUnit) => actions.setStepsDone(project.id, unit.stepIds, !unit.done);
  const focus = (taskId: string) => actions.startSession(project.id, taskId, meta.sessionMin);

  return (
    <Card>
      <div className="flex items-start justify-between gap-4 px-5 pt-5">
        <div className="min-w-0">
          <h2 className="font-semibold tracking-tight">
            Today <span className="font-normal text-muted">· {formatDate(today, true)}</span>
          </h2>
          <p className="mt-0.5 text-sm text-muted" aria-live="polite">
            {energy ? meta.mode : 'Pick an energy level to re-slice today'}
          </p>
        </div>
        <SessionControl project={project} minutes={meta.sessionMin} />
      </div>
      <div className="px-5 pb-5 pt-4">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={mode}
            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
            transition={{ duration: 0.22 }}
          >
            {mode === 'fried' ? (
              <FriedView slice={slice} sessionMin={meta.sessionMin} onToggle={toggle} onFocus={focus} />
            ) : (
              <UnitList slice={slice} stepsMode={STEPS_MODE[mode]} projectId={project.id} onToggle={toggle} onFocus={focus} />
            )}
          </motion.div>
        </AnimatePresence>
      </div>
    </Card>
  );
}

/** Start/stop a focus session. Teammates see the task name and the countdown only. */
function SessionControl({ project, minutes }: { project: Project; minutes: number }) {
  const now = useNow(1000);
  const live = isSessionLive(project.session, now) ? project.session : null;
  const target = nextOpenTask(project);

  if (live) {
    const liveTask = project.tasks.find((t) => t.id === live.taskId);
    return (
      <div className="flex shrink-0 items-center gap-2.5 rounded-xl border border-base-200 py-1.5 pl-2 pr-1.5 dark:border-base-800" title={`Focusing on: ${liveTask?.title ?? ''}`}>
        <CountdownRing session={live} now={now} size={22} />
        <span className="text-sm font-semibold tabular-nums">{formatClock(live.startedAt + live.durationMin * 60_000 - now)}</span>
        <button type="button" onClick={() => actions.endSession(project.id)} aria-label="End focus session" className="rounded-lg p-1.5 text-muted transition hover:bg-base-100 hover:text-base-700 dark:hover:bg-base-800 dark:hover:text-base-200">
          <Square className="size-3" />
        </button>
      </div>
    );
  }

  return (
    <button
      type="button"
      disabled={!target}
      onClick={() => target && actions.startSession(project.id, target.id, minutes)}
      title={target ? `Start a ${minutes}-minute focus session on "${target.title}". Your team sees the countdown.` : undefined}
      className={cn(btnSecondary, 'shrink-0 disabled:opacity-50')}
    >
      <Play className="size-3.5" /> Focus {minutes}m
    </button>
  );
}

function UnitList({ slice, stepsMode, projectId, onToggle, onFocus }: { slice: TodaySlice; stepsMode: StepsMode; projectId: string; onToggle: (u: WorkUnit) => void; onFocus: (taskId: string) => void }) {
  if (slice.units.length === 0) return <AllClear nextDate={slice.nextDate} />;
  const firstOpen = slice.units.find((u) => !u.done)?.key;
  const todaysDone = slice.units.filter((u) => u.tag !== 'stretch').every((u) => u.done);

  return (
    <>
      {todaysDone && (
        <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} className="mb-3 flex items-center gap-2 rounded-xl bg-emerald-50 px-3.5 py-2.5 text-sm font-medium text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300">
          <PartyPopper className="size-4" /> Today's slice is done. Anything more is a bonus.
        </motion.div>
      )}
      <ul className="space-y-2">
        {slice.units.map((unit, i) => (
          <UnitRow
            key={unit.key}
            unit={unit}
            index={i}
            stepsMode={stepsMode}
            defaultOpen={stepsMode === 'open-first' && unit.key === firstOpen}
            projectId={projectId}
            onToggle={onToggle}
            onFocus={onFocus}
          />
        ))}
      </ul>
      {slice.parked.length > 0 && <Parked titles={slice.parked.map((t) => t.title)} />}
    </>
  );
}

function UnitRow({ unit, index, stepsMode, defaultOpen, projectId, onToggle, onFocus }: { unit: WorkUnit; index: number; stepsMode: StepsMode; defaultOpen: boolean; projectId: string; onToggle: (u: WorkUnit) => void; onFocus: (taskId: string) => void }) {
  const [open, setOpen] = useState(defaultOpen);
  const steps = stepsMode !== 'none' ? unit.steps : undefined;
  const stepsDone = steps?.filter((s) => s.done).length ?? 0;

  return (
    <motion.li
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.035, duration: 0.2 }}
      className={cn(
        'group rounded-xl border px-3.5 py-3 transition-colors duration-300',
        unit.done
          ? 'border-base-200/60 bg-base-50/70 dark:border-base-800/60 dark:bg-base-900/30'
          : 'border-base-200 bg-white hover:border-accent-200 dark:border-base-800 dark:bg-base-900/60 dark:hover:border-accent-500/30',
        unit.tag === 'stretch' && !unit.done && 'border-dashed',
      )}
    >
      <div className="flex items-start gap-3">
        <Check checked={unit.done} onToggle={() => onToggle(unit)} label={`Mark "${unit.title}" ${unit.done ? 'not done' : 'done'}`} className="mt-0.5" />
        <div className="min-w-0 flex-1">
          {unit.context && <p className="truncate text-xs text-muted">{unit.context}</p>}
          <p className={cn('text-sm font-medium leading-snug transition-colors duration-300', unit.done && 'text-muted line-through decoration-base-300 dark:decoration-base-600')}>
            {unit.title}
          </p>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-xs text-muted">
            <span className="inline-flex items-center gap-1 tabular-nums">
              <Clock className="size-3" />
              {formatDuration(unit.minutes)}
            </span>
            {unit.tag === 'overdue' && <Pill tone="amber">Carried over</Pill>}
            {unit.tag === 'stretch' && <Pill tone="accent2">Stretch · planned {formatDate(unit.date)}</Pill>}
            {steps && (
              <button type="button" onClick={() => setOpen((o) => !o)} className="inline-flex items-center gap-0.5 rounded px-1 tabular-nums hover:text-base-800 dark:hover:text-base-200">
                {stepsDone}/{steps.length} steps
                <ChevronDown className={cn('size-3 transition-transform duration-200', open && 'rotate-180')} />
              </button>
            )}
          </div>
          <AnimatePresence initial={false}>
            {open && steps && (
              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                <ul className="space-y-1.5 pt-2.5">
                  {steps.map((s) => (
                    <li key={s.id} className="flex items-center gap-2.5 text-sm">
                      <Check size="sm" checked={s.done} onToggle={() => actions.setStepsDone(projectId, [s.id], !s.done)} label={`Mark "${s.title}" ${s.done ? 'not done' : 'done'}`} />
                      <span className={cn('flex-1 transition-colors', s.done ? 'text-muted line-through' : 'text-base-700 dark:text-base-300')}>{s.title}</span>
                      <span className="text-xs tabular-nums text-muted">{s.minutes}m</span>
                    </li>
                  ))}
                </ul>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
        {!unit.done && (
          <button
            type="button"
            onClick={() => onFocus(unit.taskId)}
            title="Start a focus session on this"
            aria-label={`Start a focus session on "${unit.title}"`}
            className="grid size-7 shrink-0 place-items-center rounded-lg text-muted transition hover:bg-accent-50 hover:text-accent-600 focus:opacity-100 sm:opacity-0 sm:group-hover:opacity-100 dark:hover:bg-accent-500/10 dark:hover:text-accent-300"
          >
            <Play className="size-3.5" />
          </button>
        )}
      </div>
    </motion.li>
  );
}

function Parked({ titles }: { titles: string[] }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="mt-3 rounded-xl border border-dashed border-base-200 px-3.5 py-2.5 dark:border-base-800">
      <button type="button" onClick={() => setOpen((o) => !o)} className="flex w-full items-center gap-2 text-left text-sm text-muted">
        <ParkingCircle className="size-4" />
        <span className="flex-1">
          {titles.length} task{titles.length === 1 ? '' : 's'} parked for later. Deadlines unchanged.
        </span>
        <ChevronDown className={cn('size-4 transition-transform', open && 'rotate-180')} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            {titles.map((title) => (
              <li key={title} className="truncate pl-6 pt-1.5 text-sm text-muted">
                {title}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

function FriedView({ slice, sessionMin, onToggle, onFocus }: { slice: TodaySlice; sessionMin: number; onToggle: (u: WorkUnit) => void; onFocus: (taskId: string) => void }) {
  const [peek, setPeek] = useState(false);
  const unit = slice.units[0];
  if (!unit) return <AllClear nextDate={slice.nextDate} gentle />;
  const waiting = slice.stepsRemaining - 1;

  return (
    <div>
      <div className="relative overflow-hidden rounded-2xl border border-accent-200/70 bg-linear-to-br from-accent-50 to-accent2-50 p-5 dark:border-accent-500/20 dark:from-accent-500/10 dark:to-accent2-500/10">
        <p className="text-xs font-semibold uppercase tracking-wider text-accent-600 dark:text-accent-300">Just this one thing</p>
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={unit.key} initial={{ opacity: 0, x: 24 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -24 }} transition={{ duration: 0.25 }}>
            <p className="mt-2 text-lg font-semibold leading-snug">{unit.title}</p>
            <p className="mt-1 text-sm text-muted">
              Part of “{unit.context}” · about {unit.minutes} min
            </p>
          </motion.div>
        </AnimatePresence>
        <div className="mt-5 flex flex-wrap gap-2">
          <button type="button" onClick={() => onToggle(unit)} className={btnPrimary}>
            <CheckIcon className="size-4" /> Done, next tiny step
          </button>
          <button type="button" onClick={() => onFocus(unit.taskId)} className={btnSecondary}>
            <Timer className="size-4" /> Start a {sessionMin}-min session
          </button>
        </div>
      </div>

      <div className="mt-4 space-y-1 text-sm text-base-600 dark:text-base-400">
        {slice.stepsDoneToday > 0 && (
          <p>
            ✓ {slice.stepsDoneToday} tiny step{slice.stepsDoneToday === 1 ? '' : 's'} done today. That counts.
          </p>
        )}
        {waiting > 0 ? (
          <p>
            {waiting} more step{waiting === 1 ? ' is' : 's are'} waiting. They'll keep, and your deadlines haven't moved.
          </p>
        ) : (
          <p>This is the last step for today. After this, rest.</p>
        )}
      </div>

      {slice.upNext.length > 0 && (
        <div className="mt-3">
          <button type="button" onClick={() => setPeek((p) => !p)} className="inline-flex items-center gap-1 text-xs font-medium text-muted hover:text-base-800 dark:hover:text-base-200">
            {peek ? 'Hide' : 'Peek at'} what's next
            <ChevronDown className={cn('size-3 transition-transform', peek && 'rotate-180')} />
          </button>
          <AnimatePresence initial={false}>
            {peek && (
              <motion.ul initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
                {slice.upNext.map((u) => (
                  <li key={u.key} className="flex items-center gap-2 pt-2 text-sm text-muted">
                    <span className="size-1.5 rounded-full bg-base-300 dark:bg-base-600" />
                    {u.title}
                    <span className="text-xs tabular-nums">· {u.minutes}m</span>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

function AllClear({ nextDate, gentle = false }: { nextDate: string | null; gentle?: boolean }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-base-200 px-4 py-8 text-center dark:border-base-800">
      {gentle ? <Coffee className="size-6 text-accent-500" /> : <PartyPopper className="size-6 text-accent-500" />}
      <p className="mt-2 font-medium">{gentle ? 'Nothing left for today. Go rest.' : "You're clear for today."}</p>
      <p className="mt-1 text-sm text-muted">{nextDate ? `Next sub-task is planned for ${formatDate(nextDate, true)}.` : 'Every sub-task in this plan is done.'}</p>
    </div>
  );
}

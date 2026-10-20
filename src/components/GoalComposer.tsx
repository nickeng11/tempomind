import { useMemo, useState, type FormEvent } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Check as CheckIcon, LoaderCircle, Pencil, Sparkles, X } from 'lucide-react';
import type { EffortSize, Project } from '../types';
import { addDays, formatDate, formatHours } from '../lib/dates';
import {
  checkCapacity,
  DEFAULT_HOURS_PER_WEEK,
  EFFORT_ORDER,
  EFFORT_SIZES,
  extractDeadline,
  generatePacingPlan,
  HOURS_PER_WEEK_OPTIONS,
  inferEffort,
  type CapacityCheck,
} from '../lib/planner';
import { btnPrimary, Card, cn } from './ui';

const EXAMPLES = ['Build Q3 Product Roadmap by Nov 15', 'Launch our mobile app beta by Dec 1', 'Write the annual impact report by Dec 11'];

const inputClass =
  'h-11 w-full rounded-xl border border-base-200 bg-white px-3.5 text-sm outline-none transition placeholder:text-muted focus:border-accent-400 focus:ring-4 focus:ring-accent-500/15 disabled:opacity-60 dark:border-base-700 dark:bg-base-900';

const chipClass =
  'rounded-lg bg-base-100 px-2 py-0.5 font-medium text-base-800 transition hover:bg-accent-50 hover:text-accent-700 dark:bg-base-800 dark:text-base-200 dark:hover:bg-accent-500/15 dark:hover:text-accent-300';

// Weekly hours are a personal setting, so they're remembered between goals.
const HOURS_KEY = 'tempomind.hours-per-week';

function loadHours(): number {
  try {
    const saved = Number(localStorage.getItem(HOURS_KEY));
    return HOURS_PER_WEEK_OPTIONS.includes(saved) ? saved : DEFAULT_HOURS_PER_WEEK;
  } catch {
    return DEFAULT_HOURS_PER_WEEK;
  }
}

function saveHours(hours: number) {
  try {
    localStorage.setItem(HOURS_KEY, String(hours));
  } catch {
    // Not critical: falls back to the default next time.
  }
}

export function GoalComposer({ today, onCreated, onCancel, showExamples }: { today: string; onCreated: (project: Project) => void; onCancel?: () => void; showExamples: boolean }) {
  const [goal, setGoal] = useState('');
  const [deadline, setDeadline] = useState('');
  const [deadlineTouched, setDeadlineTouched] = useState(false);
  const [chosenSize, setChosenSize] = useState<EffortSize | null>(null);
  const [hours, setHours] = useState(loadHours);
  const [adjusting, setAdjusting] = useState(false);
  const [thoughts, setThoughts] = useState<string[]>([]);
  const [busy, setBusy] = useState(false);

  const onGoalChange = (value: string) => {
    setGoal(value);
    if (!deadlineTouched) setDeadline(extractDeadline(value, today) ?? '');
  };

  const chooseDeadline = (value: string) => {
    setDeadline(value);
    setDeadlineTouched(true);
  };

  const chooseHours = (value: number) => {
    setHours(value);
    saveHours(value);
  };

  const error = deadline && deadline < today ? 'Pick a deadline from today onward.' : null;
  const hasGoal = goal.trim().length > 3;
  const canSubmit = hasGoal && !!deadline && !error && !busy;

  // The AI's guess at effort, until the user picks one themselves.
  const inferredSize = useMemo(() => inferEffort(goal, deadline || addDays(today, 28), today), [goal, deadline, today]);
  const size = chosenSize ?? inferredSize;
  const capacity = deadline && !error ? checkCapacity(size, hours, deadline, today) : null;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;
    setBusy(true);
    setAdjusting(false);
    setThoughts([]);
    const project = await generatePacingPlan(goal, deadline, { size, hoursPerWeek: hours }, (line) => setThoughts((t) => [...t, line]));
    setBusy(false);
    setGoal('');
    setDeadline('');
    setDeadlineTouched(false);
    setChosenSize(null);
    setThoughts([]);
    onCreated(project);
  };

  return (
    <Card>
      <form onSubmit={submit} className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 className="flex items-center gap-2 font-semibold tracking-tight">
              <Sparkles className="size-4 text-accent-500" /> What big goal are you working toward?
            </h2>
            <p className="mt-0.5 text-sm text-muted">TempoMind breaks it into weekly milestones and daily sub-tasks.</p>
          </div>
          {onCancel && !busy && (
            <button type="button" onClick={onCancel} aria-label="Close" className="rounded-lg p-1.5 text-muted transition hover:bg-base-100 hover:text-base-700 dark:hover:bg-base-800 dark:hover:text-base-200">
              <X className="size-4" />
            </button>
          )}
        </div>

        <div className="mt-4 flex flex-col gap-3 md:flex-row">
          <input
            value={goal}
            onChange={(e) => onGoalChange(e.target.value)}
            disabled={busy}
            autoFocus={!!onCancel}
            aria-label="Goal"
            placeholder='e.g. "Build Q3 Product Roadmap by Nov 15"'
            className={cn(inputClass, 'flex-1')}
          />
          <input
            type="date"
            value={deadline}
            min={today}
            onChange={(e) => chooseDeadline(e.target.value)}
            disabled={busy}
            aria-label="Target deadline"
            title="Target deadline"
            className={cn(inputClass, 'md:w-44')}
          />
          <button type="submit" disabled={!canSubmit} className={cn(btnPrimary, 'h-11 px-5')}>
            {busy && <LoaderCircle className="size-4 animate-spin" />}
            {busy ? 'Generating…' : 'Generate Pacing Plan'}
          </button>
        </div>

        {error && <p className="mt-2 text-xs text-rose-500">{error}</p>}

        {hasGoal && !busy && (
          <div className="mt-3 space-y-2.5">
            <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 text-sm text-muted" aria-live="polite">
              <span>Assuming</span>
              <button type="button" onClick={() => setAdjusting((a) => !a)} className={chipClass}>
                {EFFORT_SIZES[size].label} effort · ~{EFFORT_SIZES[size].hours}h
              </button>
              <span>at</span>
              <button type="button" onClick={() => setAdjusting((a) => !a)} className={chipClass}>
                {hours}h/week
              </button>
              {!deadlineTouched && deadline && <span>· due {formatDate(deadline, true)}</span>}
              {capacity && <CapacityBadge capacity={capacity} />}
              <button type="button" onClick={() => setAdjusting((a) => !a)} className="ml-1 inline-flex items-center gap-1 text-xs font-medium text-accent-600 hover:underline dark:text-accent-300">
                {adjusting ? (
                  'Done'
                ) : (
                  <>
                    <Pencil className="size-3" /> Adjust
                  </>
                )}
              </button>
            </div>

            <AnimatePresence initial={false}>
              {adjusting && (
                <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                  <div className="grid gap-3 rounded-xl bg-base-50 p-3 sm:grid-cols-2 dark:bg-base-950/50">
                    <Segmented
                      label="How big is it?"
                      options={EFFORT_ORDER.map((s) => ({ value: s, label: EFFORT_SIZES[s].label, hint: `~${EFFORT_SIZES[s].hours}h · ${EFFORT_SIZES[s].hint.toLowerCase()}` }))}
                      value={size}
                      onChange={setChosenSize}
                    />
                    <Segmented
                      label="Hours you can give it per week"
                      options={HOURS_PER_WEEK_OPTIONS.map((h) => ({ value: h, label: `${h}h` }))}
                      value={hours}
                      onChange={chooseHours}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {capacity && capacity.status !== 'fits' && (
              <FixSuggestions
                capacity={capacity}
                deadline={deadline}
                size={size}
                onDeadline={chooseDeadline}
                onHours={chooseHours}
                onSmaller={() => setChosenSize(EFFORT_ORDER[EFFORT_ORDER.indexOf(size) - 1])}
              />
            )}
          </div>
        )}

        {showExamples && !busy && !hasGoal && (
          <div className="mt-3 flex flex-wrap gap-2">
            {EXAMPLES.map((example) => (
              <button
                key={example}
                type="button"
                onClick={() => onGoalChange(example)}
                className="rounded-full bg-base-100 px-2.5 py-1 text-xs text-base-600 transition hover:bg-accent-50 hover:text-accent-700 dark:bg-base-800 dark:text-base-400 dark:hover:bg-accent-500/10 dark:hover:text-accent-300"
              >
                {example}
              </button>
            ))}
          </div>
        )}

        <AnimatePresence>
          {busy && (
            <motion.ul
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              aria-live="polite"
              aria-label="Planning progress"
              className="mt-3 space-y-1.5 overflow-hidden text-sm text-base-600 dark:text-base-400"
            >
              {thoughts.map((line, i) => (
                <motion.li key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} className="flex gap-2">
                  <CheckIcon className="mt-0.5 size-4 shrink-0 text-emerald-500" aria-hidden="true" />
                  <span>{line}</span>
                </motion.li>
              ))}
              <li className="flex items-center gap-2 text-muted">
                <LoaderCircle className="size-4 animate-spin" /> Thinking…
              </li>
            </motion.ul>
          )}
        </AnimatePresence>
      </form>
    </Card>
  );
}

function CapacityBadge({ capacity }: { capacity: CapacityCheck }) {
  if (capacity.status === 'fits') {
    return (
      <span className="inline-flex items-center gap-1 text-emerald-600 dark:text-emerald-400">
        · <CheckIcon className="size-3.5" /> Fits, ~{formatHours(capacity.budgetMin - capacity.estimateMin)} to spare
      </span>
    );
  }
  if (capacity.status === 'tight') return <span className="text-amber-600 dark:text-amber-400">· Tight, no room for buffer</span>;
  return <span className="text-rose-600 dark:text-rose-400">· Over by ~{formatHours(capacity.estimateMin - capacity.budgetMin)}</span>;
}

function FixSuggestions({ capacity, deadline, size, onDeadline, onHours, onSmaller }: { capacity: CapacityCheck; deadline: string; size: EffortSize; onDeadline: (d: string) => void; onHours: (h: number) => void; onSmaller: () => void }) {
  const fixClass =
    'rounded-lg border border-base-200 bg-white px-2.5 py-1 text-xs font-medium text-base-700 transition hover:border-accent-300 hover:text-accent-700 dark:border-base-700 dark:bg-base-900 dark:text-base-300 dark:hover:border-accent-500/50 dark:hover:text-accent-300';
  return (
    <motion.div
      initial={{ opacity: 0, y: -4 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'flex flex-wrap items-center gap-2 rounded-xl px-3 py-2.5 text-sm',
        capacity.status === 'over' ? 'bg-rose-50 text-rose-800 dark:bg-rose-500/10 dark:text-rose-200' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-amber-200',
      )}
    >
      <AlertTriangle className="size-4 shrink-0" />
      <span className="mr-1">
        ~{formatHours(capacity.estimateMin)} of work, ~{formatHours(capacity.budgetMin)} available before {formatDate(deadline)}.
      </span>
      {capacity.suggestedDeadline && (
        <button type="button" onClick={() => onDeadline(capacity.suggestedDeadline!)} className={fixClass}>
          Move deadline to {formatDate(capacity.suggestedDeadline)}
        </button>
      )}
      {capacity.suggestedHours && (
        <button type="button" onClick={() => onHours(capacity.suggestedHours!)} className={fixClass}>
          Use {capacity.suggestedHours}h/week
        </button>
      )}
      {size !== 'small' && (
        <button type="button" onClick={onSmaller} className={fixClass}>
          Scope it down
        </button>
      )}
    </motion.div>
  );
}

function Segmented<T extends string | number>({ label, options, value, onChange }: { label: string; options: { value: T; label: string; hint?: string }[]; value: T; onChange: (v: T) => void }) {
  const hint = options.find((o) => o.value === value)?.hint;
  return (
    <div>
      <p className="mb-1.5 text-xs font-medium text-muted">{label}</p>
      <div className="flex rounded-lg bg-white p-0.5 shadow-sm ring-1 ring-base-200 dark:bg-base-900 dark:ring-base-800" role="radiogroup" aria-label={label}>
        {options.map((o) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === value}
            onClick={() => onChange(o.value)}
            className={cn(
              'flex-1 rounded-md px-2 py-1 text-xs font-semibold transition',
              o.value === value ? 'bg-linear-to-r from-accent-600 to-accent2-600 text-white shadow-sm' : 'text-muted hover:text-base-800 dark:hover:text-base-200',
            )}
          >
            {o.label}
          </button>
        ))}
      </div>
      {hint && <p className="mt-1 text-xs text-muted">{hint}</p>}
    </div>
  );
}

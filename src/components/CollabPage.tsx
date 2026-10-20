import { useState, type FormEvent } from 'react';
import { Lock, UserRound, Users } from 'lucide-react';
import type { Project } from '../types';
import { daysLeftLabel, diffDays, formatDate } from '../lib/dates';
import { projectPercent } from '../lib/metrics';
import { ThemeToggle, PalettePicker } from './Header';
import { PlanTimeline } from './PlanTimeline';
import { btnPrimary, btnSecondary, Card, cn, Logo, Pill, ProgressBar } from './ui';

// Browsers can't read the computer's account name, so collaborators type it once.
const NAME_KEY = 'tempomind.collaborator-name';

function loadName(): string {
  try {
    return localStorage.getItem(NAME_KEY) ?? '';
  } catch {
    return '';
  }
}

function saveName(name: string) {
  try {
    localStorage.setItem(NAME_KEY, name);
  } catch {
    // Still works for this visit.
  }
}

/**
 * Page behind a collaborator link: one goal's progress and pacing plan, where
 * tasks can be ticked off. It receives the project only, never the owner's
 * energy status or today plan.
 */
export function CollabPage({ project, today }: { project: Project | undefined; today: string }) {
  const [name, setName] = useState(loadName);
  const [editingName, setEditingName] = useState(false);

  return (
    <div className="bg-app-glow min-h-screen">
      <header className="border-b border-base-200/70 bg-white/70 backdrop-blur-xl dark:border-base-800/70 dark:bg-base-950/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Pill tone="accent">
              <Users className="size-3" aria-hidden="true" /> Collaborating
            </Pill>
            <PalettePicker />
            <ThemeToggle />
          </div>
        </div>
      </header>

      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl space-y-6 px-4 py-8 outline-none">
        {!project ? (
          <Card className="px-6 py-14 text-center">
            <h1 className="font-semibold">This link doesn't point to an active goal.</h1>
            <p className="mt-1 text-sm text-muted">It may have been removed by its owner.</p>
          </Card>
        ) : !name || editingName ? (
          <NameGate
            title={project.title}
            initial={name}
            onSave={(n) => {
              saveName(n);
              setName(n);
              setEditingName(false);
            }}
            onCancel={name ? () => setEditingName(false) : undefined}
          />
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-accent-200/70 bg-accent-50/70 px-4 py-3 text-sm text-accent-900 dark:border-accent-500/20 dark:bg-accent-500/10 dark:text-accent-100">
              <p className="flex items-center gap-2">
                <UserRound className="size-4 shrink-0" aria-hidden="true" />
                <span>
                  You're collaborating as <strong>{name}</strong>. Tasks you tick are marked with your name.
                </span>
              </p>
              <button type="button" onClick={() => setEditingName(true)} className="text-xs font-medium underline-offset-2 hover:underline">
                Change name
              </button>
            </div>

            <Card className="p-5">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.title}</h1>
              <p className="mt-1 text-sm text-muted">
                Due {formatDate(project.deadline, true)}
                {!project.completedAt && ` · ${daysLeftLabel(diffDays(today, project.deadline))}`}
              </p>
              <div className="mt-4 flex items-center gap-3">
                <ProgressBar size="lg" value={projectPercent(project)} label="Project completion" />
                <span className="shrink-0 text-sm font-semibold tabular-nums">{projectPercent(project)}%</span>
              </div>
            </Card>

            {project.completedAt && (
              <p className="flex items-center gap-2 rounded-2xl border border-base-200 bg-base-100/70 px-4 py-3 text-sm text-base-700 dark:border-base-800 dark:bg-base-900/50 dark:text-base-300">
                <Lock className="size-4 shrink-0" aria-hidden="true" /> The owner has marked this goal complete, so it's locked and view-only.
              </p>
            )}

            <div className={cn(!!project.completedAt && 'grayscale')}>
              <PlanTimeline key={project.id} project={project} today={today} actor={name} readOnly={!!project.completedAt} />
            </div>
          </>
        )}
      </main>
    </div>
  );
}

function NameGate({ title, initial, onSave, onCancel }: { title: string; initial: string; onSave: (name: string) => void; onCancel?: () => void }) {
  const [value, setValue] = useState(initial);
  const trimmed = value.trim();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (trimmed) onSave(trimmed.slice(0, 40));
  };

  return (
    <Card className="p-6">
      <form onSubmit={submit}>
        <h1 className="text-lg font-semibold tracking-tight">You've been invited to collaborate on “{title}”</h1>
        <p className="mt-1 text-sm text-muted">Add your name so the goal owner can see which tasks you completed. It's saved only in this browser.</p>
        <label htmlFor="collab-name" className="mt-5 block text-sm font-medium">
          Your name
        </label>
        <input
          id="collab-name"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          maxLength={40}
          autoFocus
          autoComplete="name"
          placeholder="e.g. Sam Rivera"
          className="mt-1.5 h-11 w-full rounded-xl border border-base-200 bg-white px-3.5 text-sm outline-none transition placeholder:text-muted focus:border-accent-400 focus:ring-4 focus:ring-accent-500/15 dark:border-base-700 dark:bg-base-900"
        />
        <div className="mt-4 flex flex-wrap gap-2">
          <button type="submit" disabled={!trimmed} className={btnPrimary}>
            Continue
          </button>
          {onCancel && (
            <button type="button" onClick={onCancel} className={btnSecondary}>
              Cancel
            </button>
          )}
        </div>
      </form>
    </Card>
  );
}

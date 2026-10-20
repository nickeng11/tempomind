import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ChevronDown, CircleCheckBig, Lock, PartyPopper, Plus, RotateCcw, X } from 'lucide-react';
import type { OwnerPrivateState, Project } from '../types';
import { daysLeftLabel, diffDays, formatDate, toISODate } from '../lib/dates';
import { useRememberedId } from '../lib/hooks';
import { projectPace, projectPercent } from '../lib/metrics';
import { actions, energyForToday } from '../lib/store';
import { EnergyCard } from './EnergyCard';
import { GoalComposer } from './GoalComposer';
import { PlanTimeline } from './PlanTimeline';
import { TodayPanel } from './TodayPanel';
import { CompleteDialog, ReopenDialog } from './CompleteDialog';
import { btnPrimary, btnSecondary, Card, cn, PacePill, ProgressBar, ShareLinkButton } from './ui';

export function OwnerView({ projects, completed, owner, today }: { projects: Project[]; completed: Project[]; owner: OwnerPrivateState; today: string }) {
  const [selectedId, setSelectedId] = useRememberedId('tempomind.selected-project');
  const [composing, setComposing] = useState(false);
  const project = projects.find((p) => p.id === selectedId) ?? projects[0];
  const energy = energyForToday(owner, today);
  const showComposer = composing || !project;

  // Unticking a completed goal only asks; nothing changes until the owner confirms.
  const [reopening, setReopening] = useState<Project | null>(null);

  // Reopening brings the goal back as the selected, editable project at the top of the page.
  const reopen = (id: string) => {
    actions.reopenProject(id);
    setSelectedId(id);
    setComposing(false);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    window.scrollTo({ top: 0, behavior: reduceMotion ? 'auto' : 'smooth' });
  };

  return (
    <div className="space-y-6 pt-6">
      {(project || completed.length > 0) && (
        <div className="flex items-center gap-2 sm:gap-3">
          {project ? <ProjectTabs projects={projects} selectedId={project.id} onSelect={setSelectedId} /> : <div className="flex-1" />}
          <CompletedMenu projects={completed} onRequestReopen={setReopening} />
          {project && !composing && (
            <button type="button" onClick={() => setComposing(true)} className={cn(btnSecondary, 'shrink-0')}>
              <Plus className="size-4" aria-hidden="true" /> <span className="hidden sm:inline">New goal</span>
              <span className="sr-only sm:hidden">New goal</span>
            </button>
          )}
        </div>
      )}

      <AnimatePresence initial={false}>
        {showComposer && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.25 }} className="overflow-hidden">
            <GoalComposer
              today={today}
              showExamples={!project}
              onCancel={project ? () => setComposing(false) : undefined}
              onCreated={(p) => {
                actions.addProject(p);
                setSelectedId(p.id);
                setComposing(false);
              }}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {project && (
        <>
          <ProjectHeader project={project} today={today} />
          <div className="grid items-start gap-6 lg:grid-cols-12">
            <div className="space-y-6 lg:col-span-7">
              <EnergyCard energy={energy} />
              <TodayPanel project={project} energy={energy} today={today} />
            </div>
            <div className="lg:col-span-5">
              <PlanTimeline key={project.id} project={project} today={today} />
            </div>
          </div>
        </>
      )}

      <ReopenDialog
        project={reopening}
        onCancel={() => setReopening(null)}
        onConfirm={() => {
          if (reopening) reopen(reopening.id);
          setReopening(null);
        }}
      />

      <footer className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => window.confirm('Reset to the demo projects? This replaces your current data.') && actions.resetDemo()}
          className="inline-flex items-center gap-1.5 text-xs text-muted transition hover:text-base-600 dark:hover:text-base-300"
        >
          <RotateCcw className="size-3" /> Reset demo data
        </button>
      </footer>
    </div>
  );
}

/** Confirmed-complete goals, tucked into a menu beside the project tabs. Unticking one asks to reopen it. */
function CompletedMenu({ projects, onRequestReopen }: { projects: Project[]; onRequestReopen: (project: Project) => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setOpen(false);
      buttonRef.current?.focus();
    };
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  if (projects.length === 0) return null;
  const sorted = [...projects].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="completed-menu"
        className={cn(btnSecondary, open && 'border-base-300 bg-base-50 dark:border-base-600 dark:bg-base-800')}
      >
        <CircleCheckBig className="size-4" aria-hidden="true" />
        <span className="hidden sm:inline">Completed</span>
        <span className="tabular-nums text-muted">
          <span className="sr-only sm:hidden">Completed goals: </span>
          {projects.length}
        </span>
        <ChevronDown className={cn('size-3.5 text-muted transition-transform duration-200', open && 'rotate-180')} aria-hidden="true" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            id="completed-menu"
            role="group"
            aria-label="Completed goals"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-30 mt-2 w-[min(20rem,calc(100vw-2rem))] origin-top-right rounded-2xl border border-base-200 bg-white p-1.5 shadow-xl shadow-black/10 dark:border-base-800 dark:bg-base-900"
          >
            <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted">Completed goals · locked</p>
            <ul className="max-h-72 overflow-y-auto">
              {sorted.map((p) => (
                <li key={p.id}>
                  <CompletedGoalItem
                    project={p}
                    onRequestReopen={(goal) => {
                      setOpen(false);
                      onRequestReopen(goal);
                    }}
                  />
                </li>
              ))}
            </ul>
            <p className="border-t border-base-100 px-2.5 pb-1 pt-2 text-xs text-muted dark:border-base-800">Untick a goal to make it live again.</p>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function CompletedGoalItem({ project, onRequestReopen }: { project: Project; onRequestReopen: (project: Project) => void }) {
  const completedOn = toISODate(new Date(project.completedAt ?? Date.now()));
  const inputId = `reopen-${project.id}`;

  return (
    // Greyed with a grayscale filter (not opacity) so the text keeps its contrast.
    <label htmlFor={inputId} className="flex cursor-pointer items-center gap-3 rounded-xl px-2.5 py-2 grayscale transition-colors hover:bg-base-100 dark:hover:bg-base-800">
      <Lock className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium text-base-700 dark:text-base-300">{project.title}</span>
        <span className="block text-xs text-muted">Completed {formatDate(completedOn, true)}</span>
      </span>
      {/* Stays ticked: the change only happens if the owner confirms in the dialog. */}
      <input id={inputId} type="checkbox" checked onChange={() => onRequestReopen(project)} className="size-4 shrink-0 cursor-pointer accent-base-600" />
      <span className="sr-only">Completed and locked. Untick to reopen.</span>
    </label>
  );
}

function ProjectTabs({ projects, selectedId, onSelect }: { projects: Project[]; selectedId: string; onSelect: (id: string) => void }) {
  return (
    <div className="-mx-4 flex min-w-0 flex-1 items-center gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] sm:mx-0 sm:px-0">
      {projects.map((p) => {
        const selected = p.id === selectedId;
        return (
          <div
            key={p.id}
            className={cn(
              'group flex shrink-0 items-center rounded-xl border transition-colors',
              selected
                ? 'border-accent-300 bg-accent-50 text-accent-900 dark:border-accent-500/40 dark:bg-accent-500/10 dark:text-accent-100'
                : 'border-transparent text-base-600 hover:bg-base-100 dark:text-base-400 dark:hover:bg-base-900',
            )}
          >
            <button type="button" onClick={() => onSelect(p.id)} className="flex items-center gap-2 py-1.5 pl-3 pr-1.5 text-sm">
              <span className="max-w-64 truncate font-medium">{p.title}</span>
              <span className="text-xs tabular-nums opacity-60">{projectPercent(p)}%</span>
            </button>
            <button
              type="button"
              onClick={() => window.confirm(`Delete "${p.title}"?`) && actions.deleteProject(p.id)}
              aria-label={`Delete ${p.title}`}
              className="mr-1 rounded-md p-1.5 text-muted transition hover:text-rose-500 focus-visible:opacity-100 sm:opacity-0 sm:group-hover:opacity-100"
            >
              <X className="size-3.5" aria-hidden="true" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ProjectHeader({ project, today }: { project: Project; today: string }) {
  const percent = projectPercent(project);
  const pace = projectPace(project, today);
  const [confirming, setConfirming] = useState(false);
  const allDone = percent === 100;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Due {formatDate(project.deadline, true)} · {daysLeftLabel(diffDays(today, project.deadline))}
          </p>
        </div>
        <ShareLinkButton projectId={project.id} kind="collab" />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar size="lg" value={percent} label="Project completion" />
        <span className="shrink-0 text-sm font-semibold tabular-nums">{percent}%</span>
        {/* Pace stays in the owner's private view; teammates never see it. */}
        <PacePill status={pace.status} deltaMin={pace.deltaMin} />
      </div>

      <AnimatePresence initial={false}>
        {allDone && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-4 flex flex-col gap-3 rounded-xl bg-emerald-50 px-4 py-3 sm:flex-row sm:items-center sm:justify-between dark:bg-emerald-500/10">
              <p className="flex items-center gap-2 text-sm font-medium text-emerald-800 dark:text-emerald-200">
                <PartyPopper className="size-4 shrink-0" aria-hidden="true" /> Every task is done. Ready to close this goal?
              </p>
              <button type="button" onClick={() => setConfirming(true)} className={cn(btnPrimary, 'shrink-0')}>
                <CircleCheckBig className="size-4" aria-hidden="true" /> Mark for completion
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <CompleteDialog
        project={project}
        open={confirming}
        onCancel={() => setConfirming(false)}
        onConfirm={() => {
          setConfirming(false);
          actions.completeProject(project.id);
        }}
      />
    </Card>
  );
}

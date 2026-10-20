import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CircleCheckBig, Lock, PartyPopper, Plus, RotateCcw, X } from 'lucide-react';
import type { OwnerPrivateState, Project } from '../types';
import { daysLeftLabel, formatDate, toISODate } from '../lib/dates';
import { useNow, useRememberedId } from '../lib/hooks';
import { projectPercent, toPublicView } from '../lib/metrics';
import { actions, energyForToday } from '../lib/store';
import { EnergyCard } from './EnergyCard';
import { GoalComposer } from './GoalComposer';
import { PlanTimeline } from './PlanTimeline';
import { TodayPanel } from './TodayPanel';
import { CompleteDialog } from './CompleteDialog';
import { btnPrimary, btnSecondary, Card, cn, PacePill, ProgressBar, ShareLinkButton } from './ui';

export function OwnerView({ projects, completed, owner, today }: { projects: Project[]; completed: Project[]; owner: OwnerPrivateState; today: string }) {
  const [selectedId, setSelectedId] = useRememberedId('tempomind.selected-project');
  const [composing, setComposing] = useState(false);
  const project = projects.find((p) => p.id === selectedId) ?? projects[0];
  const energy = energyForToday(owner, today);
  const showComposer = composing || !project;

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
      {project && (
        <div className="flex items-center gap-3">
          <ProjectTabs projects={projects} selectedId={project.id} onSelect={setSelectedId} />
          {!composing && (
            <button type="button" onClick={() => setComposing(true)} className={cn(btnSecondary, 'shrink-0')}>
              <Plus className="size-4" /> New goal
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

      <CompletedSection projects={completed} onReopen={reopen} />

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

/** Confirmed-complete goals, locked at the bottom of the workspace. Unticking one reopens it. */
function CompletedSection({ projects, onReopen }: { projects: Project[]; onReopen: (id: string) => void }) {
  if (projects.length === 0) return null;
  const sorted = [...projects].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0));

  // A single row of compact items; it scrolls sideways rather than wrapping when there are many.
  return (
    <ul aria-label="Completed goals (locked, untick to reopen)" className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:thin] sm:mx-0 sm:px-0">
      <AnimatePresence initial={false}>
        {sorted.map((p) => (
          <motion.li key={p.id} layout initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95 }} transition={{ duration: 0.2 }} className="shrink-0">
            <CompletedGoalItem project={p} onReopen={onReopen} />
          </motion.li>
        ))}
      </AnimatePresence>
    </ul>
  );
}

function CompletedGoalItem({ project, onReopen }: { project: Project; onReopen: (id: string) => void }) {
  const completedOn = toISODate(new Date(project.completedAt ?? Date.now()));
  const inputId = `reopen-${project.id}`;

  return (
    // Greyed with a grayscale filter (not opacity) so the text keeps its contrast.
    <label
      htmlFor={inputId}
      title={`Completed ${formatDate(completedOn, true)}. Untick to reopen.`}
      className="flex cursor-pointer items-center gap-2 rounded-xl border border-base-200 bg-base-100/70 py-1.5 pl-3 pr-2.5 text-sm grayscale transition hover:border-base-300 dark:border-base-800 dark:bg-base-900/40 dark:hover:border-base-700"
    >
      <Lock className="size-3.5 shrink-0 text-muted" aria-hidden="true" />
      <span className="max-w-56 truncate font-medium text-base-700 dark:text-base-300">{project.title}</span>
      <input id={inputId} type="checkbox" checked onChange={() => onReopen(project.id)} className="size-4 cursor-pointer accent-base-600" />
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
  const view = toPublicView(project, today, useNow(30_000));
  const [confirming, setConfirming] = useState(false);
  const allDone = view.percent === 100;

  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.title}</h1>
          <p className="mt-1 text-sm text-muted">
            Due {formatDate(project.deadline, true)} · {daysLeftLabel(view.daysLeft)}
          </p>
        </div>
        <ShareLinkButton projectId={project.id} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar size="lg" value={view.percent} label="Project completion" />
        <span className="shrink-0 text-sm font-semibold tabular-nums">{view.percent}%</span>
        <PacePill status={view.paceStatus} deltaMin={view.paceDeltaMin} />
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

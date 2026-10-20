import { useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus, RotateCcw, X } from 'lucide-react';
import type { OwnerPrivateState, Project } from '../types';
import { daysLeftLabel, formatDate } from '../lib/dates';
import { useNow, useRememberedId } from '../lib/hooks';
import { projectPercent, toPublicView } from '../lib/metrics';
import { actions, energyForToday } from '../lib/store';
import { EnergyCard } from './EnergyCard';
import { GoalComposer } from './GoalComposer';
import { PlanTimeline } from './PlanTimeline';
import { TodayPanel } from './TodayPanel';
import { btnSecondary, Card, cn, PacePill, ProgressBar, ShareLinkButton } from './ui';

export function OwnerView({ projects, owner, today }: { projects: Project[]; owner: OwnerPrivateState; today: string }) {
  const [selectedId, setSelectedId] = useRememberedId('tempomind.selected-project');
  const [composing, setComposing] = useState(false);
  const project = projects.find((p) => p.id === selectedId) ?? projects[0];
  const energy = energyForToday(owner, today);
  const showComposer = composing || !project;

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

      <footer className="flex justify-end pt-2">
        <button
          type="button"
          onClick={() => window.confirm('Reset to the demo projects? This replaces your current data.') && actions.resetDemo()}
          className="inline-flex items-center gap-1.5 text-xs text-base-400 transition hover:text-base-600 dark:hover:text-base-300"
        >
          <RotateCcw className="size-3" /> Reset demo data
        </button>
      </footer>
    </div>
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
              className="mr-1 rounded-md p-1 text-base-400 opacity-0 transition hover:text-rose-500 focus:opacity-100 group-hover:opacity-100"
            >
              <X className="size-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}

function ProjectHeader({ project, today }: { project: Project; today: string }) {
  const view = toPublicView(project, today, useNow(30_000));
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{project.title}</h1>
          <p className="mt-1 text-sm text-base-500">
            Due {formatDate(project.deadline, true)} · {daysLeftLabel(view.daysLeft)}
          </p>
        </div>
        <ShareLinkButton projectId={project.id} />
      </div>
      <div className="mt-4 flex items-center gap-3">
        <ProgressBar size="lg" value={view.percent} />
        <span className="shrink-0 text-sm font-semibold tabular-nums">{view.percent}%</span>
        <PacePill status={view.paceStatus} deltaMin={view.paceDeltaMin} />
      </div>
    </Card>
  );
}

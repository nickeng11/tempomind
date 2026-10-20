import { CircleCheckBig, Lock, Timer, Users } from 'lucide-react';
import type { Project } from '../types';
import { daysLeftLabel, diffDays, formatClock, formatDate, formatHours, toISODate } from '../lib/dates';
import { useNow } from '../lib/hooks';
import { toPublicView, type PublicProjectView, type PublicSession } from '../lib/metrics';
import { Card, cn, CountdownRing, LiveDot, PacePill, ProgressBar, ShareLinkButton, ViewOnlyNotice } from './ui';

/**
 * Teammate dashboard. It receives projects only: the owner's private state
 * is never passed in, and every card renders from a PublicProjectView.
 */
export function TeamView({ projects, completedCount, today }: { projects: Project[]; completedCount: number; today: string }) {
  const now = useNow(1000);
  const views = projects.map((p) => toPublicView(p, today, now));

  return (
    <div className="space-y-6 pt-6">
      <ViewOnlyNotice />
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Team progress</h1>
          <p className="mt-0.5 text-sm text-muted">Updates live</p>
        </div>
        {completedCount > 0 && (
          <a href="#/completed" className="text-sm font-medium text-accent-600 hover:underline dark:text-accent-300">
            {completedCount} completed goal{completedCount === 1 ? '' : 's'} →
          </a>
        )}
      </div>
      {views.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <Users className="size-6 text-accent-500" />
          <p className="mt-3 font-semibold">No shared projects yet</p>
          <p className="mt-1 text-sm text-muted">Projects appear here once the owner creates a pacing plan.</p>
        </Card>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {views.map((view) => (
            <TeamProjectCard key={view.id} view={view} now={now} shareable />
          ))}
        </div>
      )}
    </div>
  );
}

/** Archive of human-confirmed completed goals. View-only for everyone, owner included. */
export function CompletedView({ projects, today }: { projects: Project[]; today: string }) {
  const views = [...projects].sort((a, b) => (b.completedAt ?? 0) - (a.completedAt ?? 0)).map((p) => toPublicView(p, today, 0));

  return (
    <div className="space-y-6 pt-6">
      <div className="flex items-start gap-3 rounded-2xl border border-base-200 bg-base-100/70 px-4 py-3 text-sm text-base-700 dark:border-base-800 dark:bg-base-900/50 dark:text-base-300">
        <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
        <p>
          <span className="font-semibold">View-only archive.</span> Goals appear here once their owner confirms completion. They can't be edited.
        </p>
      </div>
      <div>
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Completed goals</h1>
        <p className="mt-0.5 text-sm text-muted">
          {views.length} goal{views.length === 1 ? '' : 's'} finished
        </p>
      </div>
      {views.length === 0 ? (
        <Card className="flex flex-col items-center px-6 py-14 text-center">
          <CircleCheckBig className="size-6 text-accent-500" aria-hidden="true" />
          <p className="mt-3 font-semibold">No completed goals yet</p>
          <p className="mt-1 text-sm text-muted">When every task on a goal is done, its owner can mark it for completion.</p>
        </Card>
      ) : (
        <div className="grid items-start gap-6 xl:grid-cols-2">
          {views.map((view) => (
            <TeamProjectCard key={view.id} view={view} now={0} />
          ))}
        </div>
      )}
    </div>
  );
}

export function TeamProjectCard({ view, now, shareable = false }: { view: PublicProjectView; now: number; shareable?: boolean }) {
  const completedOn = view.completedAt ? toISODate(new Date(view.completedAt)) : null;

  return (
    // Completed goals are greyed with a grayscale filter rather than opacity, so text keeps its contrast.
    <Card className={cn('p-5 sm:p-6', completedOn && 'bg-base-100/70! shadow-none! grayscale dark:bg-base-900/40!')}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold tracking-tight">
            {view.title}
            {completedOn && <span className="sr-only"> (completed, read-only)</span>}
          </h2>
          <p className="mt-0.5 text-sm text-muted">
            Due {formatDate(view.deadline, true)}
            {!completedOn && ` · ${daysLeftLabel(view.daysLeft)}`}
          </p>
        </div>
        {completedOn ? (
          <span className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-base-200 px-2.5 py-1 text-xs font-medium text-base-700 dark:bg-base-800 dark:text-base-300">
            <Lock className="size-3" aria-hidden="true" /> View only
          </span>
        ) : (
          shareable && <ShareLinkButton projectId={view.id} compact />
        )}
      </div>

      {completedOn ? (
        <p className="mt-4 flex min-w-0 items-center gap-2 text-sm">
          <span className="shrink-0 rounded-md bg-base-200 px-2 py-0.5 text-xs font-semibold text-base-700 dark:bg-base-800 dark:text-base-300">Completed</span>
          <span className="font-medium">{formatDate(completedOn, true)}</span>
        </p>
      ) : (
        <p className="mt-4 flex min-w-0 items-center gap-2 text-sm">
          <span className="shrink-0 rounded-md bg-accent-50 px-2 py-0.5 text-xs font-semibold text-accent-700 dark:bg-accent-500/15 dark:text-accent-300">Current task</span>
          <span className="truncate font-medium">{view.activeTask ?? 'All tasks complete 🎉'}</span>
        </p>
      )}

      <div className="mt-5 flex flex-wrap items-end justify-between gap-3">
        <p className="text-4xl font-semibold tracking-tight tabular-nums">
          {view.percent}%<span className="ml-2 text-base font-medium tracking-normal text-muted">Complete</span>
        </p>
        <PacePill status={view.paceStatus} deltaMin={view.paceDeltaMin} />
      </div>
      <ProgressBar size="lg" value={view.percent} label="Project completion" className="mt-3" />

      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PacingBox view={view} />
        {completedOn ? <FinishedBox completedOn={completedOn} deadline={view.deadline} /> : <LiveSession session={view.session} now={now} />}
      </div>

      <MilestoneTrack view={view} />
    </Card>
  );
}

function PacingBox({ view }: { view: PublicProjectView }) {
  const slip = view.slipDays;
  const relative = slip > 0 ? `${slip}d behind` : slip < 0 ? `${-slip}d ahead` : 'on schedule';

  return (
    <div className="rounded-xl bg-base-50 p-4 dark:bg-base-950/50">
      <p className="text-xs font-medium text-muted">Estimated vs. actual</p>
      <div className="mt-3 space-y-3">
        <PaceRow label="Planned by today" minutes={view.expectedMin} percent={view.expectedPercent} muted />
        <PaceRow label="Done" minutes={view.doneMin} percent={view.percent} />
      </div>
      <p className="mt-3 text-xs text-muted">
        ~{formatHours(view.totalMin)} total · {view.paceStatus === 'done' ? 'complete' : `finish ${formatDate(view.projectedFinish)} (${relative})`}
      </p>
    </div>
  );
}

function PaceRow({ label, minutes, percent, muted = false }: { label: string; minutes: number; percent: number; muted?: boolean }) {
  return (
    <div>
      <div className="flex items-baseline justify-between text-sm">
        <span className="text-base-600 dark:text-base-400">{label}</span>
        <span className="font-semibold tabular-nums">{formatHours(minutes)}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-base-200/80 dark:bg-base-800">
        <div
          className={cn('h-full rounded-full transition-[width] duration-700', muted ? 'bg-base-400 dark:bg-base-500' : 'bg-linear-to-r from-accent-500 to-accent2-500')}
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

function FinishedBox({ completedOn, deadline }: { completedOn: string; deadline: string }) {
  const margin = diffDays(completedOn, deadline);
  return (
    <div className="rounded-xl bg-base-50 p-4 dark:bg-base-950/50">
      <p className="text-xs font-medium text-muted">Finished</p>
      <p className="mt-3 flex items-center gap-2 text-2xl font-semibold tracking-tight">
        <CircleCheckBig className="size-6 text-base-500" aria-hidden="true" />
        {formatDate(completedOn)}
      </p>
      <p className="mt-1 text-xs text-muted">
        {margin > 0 ? `${margin} day${margin === 1 ? '' : 's'} before the deadline` : margin < 0 ? `${-margin} day${margin === -1 ? '' : 's'} after the deadline` : 'On the deadline'}
      </p>
    </div>
  );
}

function LiveSession({ session, now }: { session: PublicSession | null; now: number }) {
  return (
    <div className="rounded-xl bg-base-50 p-4 dark:bg-base-950/50">
      <p className="flex items-center justify-between text-xs font-medium text-muted">
        Work session
        {session && (
          <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400">
            <LiveDot /> Live
          </span>
        )}
      </p>
      {session ? (
        <div className="mt-3 flex items-center gap-4">
          <CountdownRing session={session} now={now} size={56} />
          <div>
            <p className="text-3xl font-semibold tracking-tight tabular-nums">{formatClock(session.startedAt + session.durationMin * 60_000 - now)}</p>
            <p className="text-xs text-muted">left of {session.durationMin} min</p>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-3 text-sm text-muted">
          <Timer className="size-5 text-muted" /> Not in a session right now
        </div>
      )}
    </div>
  );
}

function MilestoneTrack({ view }: { view: PublicProjectView }) {
  const current = view.milestones.find((m) => m.status === 'current');
  return (
    <div className="mt-6">
      <div className="flex gap-1.5">
        {view.milestones.map((m) => (
          <div
            key={m.id}
            role="img"
            aria-label={`Week ${m.week}: ${m.title}, ${m.percent}% complete${m.status === 'late' ? ', running over' : m.status === 'current' ? ', this week' : ''}`}
            className="min-w-0 flex-1"
            title={`Week ${m.week}: ${m.title} (${m.percent}%)`}
          >
            <div className={cn('h-2 overflow-hidden rounded-full bg-base-200/80 dark:bg-base-800', m.status === 'current' && 'ring-2 ring-accent-500/30')}>
              <div
                className={cn('h-full rounded-full transition-[width] duration-700', m.status === 'late' ? 'bg-amber-400' : 'bg-linear-to-r from-accent-500 to-accent2-500')}
                style={{ width: `${m.percent}%` }}
              />
            </div>
            <p className={cn('mt-1.5 truncate text-[11px] tabular-nums', m.status === 'current' ? 'font-semibold text-accent-600 dark:text-accent-300' : 'text-muted')}>W{m.week}</p>
          </div>
        ))}
      </div>
      {current && (
        <p className="mt-2 text-sm text-muted">
          <span className="font-medium text-base-900 dark:text-base-100">This week:</span> {current.title}
        </p>
      )}
    </div>
  );
}

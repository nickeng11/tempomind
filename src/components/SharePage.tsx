import { Eye } from 'lucide-react';
import type { Project } from '../types';
import { useNow } from '../lib/hooks';
import { toPublicView } from '../lib/metrics';
import { PalettePicker, ThemeToggle } from './Header';
import { TeamProjectCard } from './TeamView';
import { Card, Logo, Pill, ViewOnlyNotice } from './ui';

/** Standalone page behind a shared link: one project, view-only, no owner controls. */
export function SharePage({ project, today }: { project: Project | undefined; today: string }) {
  const now = useNow(1000);
  return (
    <div className="bg-app-glow min-h-screen">
      <header className="border-b border-base-200/70 bg-white/70 backdrop-blur-xl dark:border-base-800/70 dark:bg-base-950/70">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between gap-3 px-4">
          <Logo />
          <div className="flex items-center gap-2">
            <Pill tone="indigo">
              <Eye className="size-3" /> Shared · View-only
            </Pill>
            <PalettePicker />
            <ThemeToggle />
          </div>
        </div>
      </header>
      <main id="main" tabIndex={-1} className="mx-auto max-w-3xl space-y-6 px-4 py-8 outline-none">
        <h1 className="sr-only">{project ? `${project.title}: shared progress` : 'Shared project'}</h1>
        <ViewOnlyNotice />
        {project ? (
          <TeamProjectCard view={toPublicView(project, today, now)} now={now} />
        ) : (
          <Card className="px-6 py-14 text-center">
            <p className="font-semibold">This link doesn't point to an active project.</p>
            <p className="mt-1 text-sm text-muted">It may have been removed by its owner.</p>
          </Card>
        )}
        <p className="text-center text-xs text-muted">Live progress shared from TempoMind</p>
      </main>
    </div>
  );
}

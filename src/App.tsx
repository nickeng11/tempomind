import { AnimatePresence, motion, MotionConfig } from 'motion/react';
import { CollabPage } from './components/CollabPage';
import { Header, type View } from './components/Header';
import { OwnerView } from './components/OwnerView';
import { SharePage } from './components/SharePage';
import { CompletedView, TeamView } from './components/TeamView';
import { useHash, useToday } from './lib/hooks';
import { useAppState } from './lib/store';

type Route = { name: View } | { name: 'share' | 'collab'; projectId: string };

function parseRoute(hash: string): Route {
  const link = hash.match(/^#\/(share|collab)\/([\w-]+)/);
  if (link) return { name: link[1] as 'share' | 'collab', projectId: link[2] };
  if (hash.startsWith('#/team')) return { name: 'team' };
  if (hash.startsWith('#/completed')) return { name: 'completed' };
  return { name: 'owner' };
}

export default function App() {
  // Honour the OS "reduce motion" setting for every animation.
  return (
    <MotionConfig reducedMotion="user">
      <a
        href="#main"
        onClick={(e) => {
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:shadow-lg dark:focus:bg-base-900"
      >
        Skip to content
      </a>
      <Routes />
    </MotionConfig>
  );
}

function Routes() {
  const route = parseRoute(useHash());
  const { projects, owner } = useAppState();
  const today = useToday();

  // Link pages get the one project only; the owner's private state is never passed.
  if (route.name === 'share') {
    return <SharePage project={projects.find((p) => p.id === route.projectId)} today={today} />;
  }
  if (route.name === 'collab') {
    return <CollabPage project={projects.find((p) => p.id === route.projectId)} today={today} />;
  }

  // Confirmed-complete goals leave the workspace and team view for the read-only archive.
  const active = projects.filter((p) => !p.completedAt);
  const completed = projects.filter((p) => p.completedAt);

  return (
    <div className="bg-app-glow min-h-screen">
      <Header view={route.name} />
      <main id="main" tabIndex={-1} className="mx-auto max-w-7xl px-4 pb-16 outline-none sm:px-6 lg:px-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={route.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {route.name === 'team' ? (
              // The owner's private state is intentionally not passed to the team views.
              <TeamView projects={active} completedCount={completed.length} today={today} />
            ) : route.name === 'completed' ? (
              <CompletedView projects={completed} today={today} />
            ) : (
              <OwnerView projects={active} completed={completed} owner={owner} today={today} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

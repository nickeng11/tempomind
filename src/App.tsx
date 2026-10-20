import { AnimatePresence, motion } from 'motion/react';
import { Header } from './components/Header';
import { OwnerView } from './components/OwnerView';
import { SharePage } from './components/SharePage';
import { TeamView } from './components/TeamView';
import { useHash, useToday } from './lib/hooks';
import { useAppState } from './lib/store';

type Route = { name: 'owner' } | { name: 'team' } | { name: 'share'; projectId: string };

function parseRoute(hash: string): Route {
  const share = hash.match(/^#\/share\/([\w-]+)/);
  if (share) return { name: 'share', projectId: share[1] };
  if (hash.startsWith('#/team')) return { name: 'team' };
  return { name: 'owner' };
}

export default function App() {
  const route = parseRoute(useHash());
  const { projects, owner } = useAppState();
  const today = useToday();

  if (route.name === 'share') {
    return <SharePage project={projects.find((p) => p.id === route.projectId)} today={today} />;
  }

  return (
    <div className="bg-app-glow min-h-screen">
      <Header view={route.name} />
      <main className="mx-auto max-w-7xl px-4 pb-16 sm:px-6 lg:px-8">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div
            key={route.name}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
          >
            {route.name === 'team' ? (
              // The owner's private state is intentionally not passed to the team view.
              <TeamView projects={projects} today={today} />
            ) : (
              <OwnerView projects={projects} owner={owner} today={today} />
            )}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}

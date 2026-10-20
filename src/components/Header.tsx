import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Check as CheckIcon, Moon, Sun, User, Users } from 'lucide-react';
import { applyPalette, currentPalette, PALETTES, type PaletteId } from '../lib/palettes';
import { cn, Logo } from './ui';

const iconButton =
  'grid size-9 place-items-center rounded-xl border border-base-200 text-base-600 transition hover:bg-base-100 dark:border-base-800 dark:text-base-300 dark:hover:bg-base-900';

/** A gradient dot rendered in a given palette, regardless of the active one. */
function Swatch({ id, className }: { id: PaletteId; className?: string }) {
  return <span data-palette={id} className={cn('block shrink-0 rounded-full bg-linear-to-br from-accent-500 to-accent2-500 shadow-sm', className)} />;
}

export function PalettePicker() {
  const [palette, setPalette] = useState<PaletteId>(currentPalette);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onPointer = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('pointerdown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const choose = (id: PaletteId) => {
    applyPalette(id);
    setPalette(id);
  };

  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setOpen((o) => !o)} aria-label="Colour scheme" aria-expanded={open} aria-controls="palette-picker" className={iconButton}>
        <Swatch id={palette} className="size-4.5" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            id="palette-picker"
            role="group"
            aria-label="Colour scheme"
            initial={{ opacity: 0, y: -6, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.97 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-11 z-40 w-64 origin-top-right rounded-2xl border border-base-200 bg-white p-1.5 shadow-xl shadow-black/10 dark:border-base-800 dark:bg-base-900"
          >
            <p className="px-2.5 pb-1.5 pt-1 text-xs font-medium text-muted">Colour scheme</p>
            {PALETTES.map((p) => (
              <button
                key={p.id}
                type="button"
                aria-pressed={palette === p.id}
                onClick={() => choose(p.id)}
                className={cn(
                  'flex w-full items-center gap-3 rounded-xl px-2.5 py-2 text-left transition-colors',
                  palette === p.id ? 'bg-accent-50 dark:bg-accent-500/10' : 'hover:bg-base-100 dark:hover:bg-base-800',
                )}
              >
                <Swatch id={p.id} className="size-6" />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium">{p.name}</span>
                  <span className="block truncate text-xs text-muted">{p.description}</span>
                </span>
                {palette === p.id && <CheckIcon className="size-4 text-accent-600 dark:text-accent-300" aria-hidden="true" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

const VIEWS = [
  { id: 'owner', href: '#/', label: 'My Workspace', short: 'Me', icon: User },
  { id: 'team', href: '#/team', label: 'Team View', short: 'Team', icon: Users },
] as const;

export function Header({ view }: { view: 'owner' | 'team' }) {
  return (
    <header className="sticky top-0 z-30 border-b border-base-200/70 bg-white/70 backdrop-blur-xl dark:border-base-800/70 dark:bg-base-950/70">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <Logo />
        <nav className="flex items-center rounded-xl bg-base-100 p-1 dark:bg-base-900" aria-label="View">
          {VIEWS.map(({ id, href, label, short, icon: Icon }) => (
            <a
              key={id}
              href={href}
              aria-current={view === id ? 'page' : undefined}
              className={cn(
                'relative rounded-lg px-3 py-1.5 text-sm font-medium transition-colors',
                view === id ? 'text-base-900 dark:text-white' : 'text-muted hover:text-base-800 dark:hover:text-base-200',
              )}
            >
              {view === id && (
                <motion.span
                  layoutId="view-pill"
                  className="absolute inset-0 rounded-lg bg-white shadow-sm dark:bg-base-800"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.4 }}
                />
              )}
              <span className="relative flex items-center gap-1.5">
                <Icon className="size-4" />
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{short}</span>
              </span>
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <PalettePicker />
          <ThemeToggle />
        </div>
      </div>
    </header>
  );
}

export function ThemeToggle() {
  const [dark, setDark] = useState(() => document.documentElement.classList.contains('dark'));
  const toggle = () => {
    const next = !dark;
    document.documentElement.classList.toggle('dark', next);
    try {
      localStorage.setItem('tempomind.theme', next ? 'dark' : 'light');
    } catch {
      // Theme still applies for this visit.
    }
    setDark(next);
  };
  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
      className={iconButton}
    >
      {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}

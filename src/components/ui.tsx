import { useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { Activity, Check as CheckIcon, Eye, ShieldCheck, UserPlus } from 'lucide-react';
import type { PaceStatus } from '../lib/metrics';
import { formatHours } from '../lib/dates';

export function cn(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(' ');
}

export const btnPrimary =
  'inline-flex items-center justify-center gap-2 rounded-xl bg-linear-to-r from-accent-600 to-accent2-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-accent-500/20 transition hover:brightness-110 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50';

export const btnSecondary =
  'inline-flex items-center justify-center gap-2 rounded-xl border border-base-200 bg-white px-3.5 py-2 text-sm font-medium text-base-700 transition hover:border-base-300 hover:bg-base-50 active:scale-[0.98] dark:border-base-700 dark:bg-base-900 dark:text-base-200 dark:hover:border-base-600 dark:hover:bg-base-800';

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section
      className={cn(
        'rounded-2xl border border-base-200/80 bg-white/85 shadow-[0_1px_2px_rgb(0_0_0/0.04),0_12px_32px_-16px_rgb(0_0_0/0.10)] backdrop-blur-sm dark:border-base-800/80 dark:bg-base-900/70 dark:shadow-none',
        className,
      )}
    >
      {children}
    </section>
  );
}

type Tone = 'neutral' | 'accent' | 'accent2' | 'emerald' | 'amber';

const TONES: Record<Tone, string> = {
  neutral: 'bg-base-100 text-base-600 dark:bg-base-800 dark:text-base-300',
  accent: 'bg-accent-50 text-accent-700 dark:bg-accent-500/15 dark:text-accent-300',
  accent2: 'bg-accent2-50 text-accent2-700 dark:bg-accent2-500/15 dark:text-accent2-300',
  emerald: 'bg-emerald-50 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300',
  amber: 'bg-amber-50 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300',
};

export function Pill({ tone = 'neutral', className, children }: { tone?: Tone; className?: string; children: ReactNode }) {
  return (
    <span className={cn('inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium', TONES[tone], className)}>
      {children}
    </span>
  );
}

export function PacePill({ status, deltaMin }: { status: PaceStatus; deltaMin: number }) {
  if (status === 'done') return <Pill tone="emerald">Complete</Pill>;
  if (status === 'ahead') return <Pill tone="emerald">{formatHours(deltaMin)} ahead of pace</Pill>;
  if (status === 'behind') return <Pill tone="amber">{formatHours(-deltaMin)} behind pace</Pill>;
  return <Pill tone="accent">On pace</Pill>;
}

const clamp = (n: number) => Math.max(0, Math.min(100, n));

export function ProgressBar({ value, size = 'lg', label = 'Progress', className }: { value: number; size?: 'sm' | 'lg'; label?: string; className?: string }) {
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(clamp(value))}
      className={cn('relative w-full rounded-full bg-base-200/80 dark:bg-base-800', size === 'sm' ? 'h-1.5' : 'h-3', className)}
    >
      <div
        className="h-full rounded-full bg-linear-to-r from-accent-500 to-accent2-500 transition-[width] duration-700 ease-out"
        style={{ width: `${clamp(value)}%` }}
      />
    </div>
  );
}

export function Check({ checked, onToggle, label, size = 'md', className }: { checked: boolean; onToggle: () => void; label: string; size?: 'sm' | 'md'; className?: string }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      onClick={onToggle}
      className={cn(
        // The ::before layer enlarges the tap target to at least 24px without changing the look.
        'relative grid shrink-0 place-items-center rounded-full border-2 transition-all duration-200 before:absolute before:-inset-1.5 active:scale-90',
        size === 'md' ? 'size-5' : 'size-4',
        checked
          ? 'border-transparent bg-linear-to-br from-accent-500 to-accent2-500 shadow-sm shadow-accent-500/30'
          : 'border-base-300 hover:border-accent-400 dark:border-base-600 dark:hover:border-accent-400',
        className,
      )}
    >
      <motion.svg viewBox="0 0 16 16" className={size === 'md' ? 'size-3' : 'size-2.5'} initial={false} animate={{ scale: checked ? 1 : 0.5, opacity: checked ? 1 : 0 }}>
        <motion.path
          d="M3.5 8.5 6.5 11.5 12.5 4.5"
          fill="none"
          stroke="white"
          strokeWidth={2.4}
          strokeLinecap="round"
          strokeLinejoin="round"
          initial={false}
          animate={{ pathLength: checked ? 1 : 0 }}
          transition={{ duration: 0.25 }}
        />
      </motion.svg>
    </button>
  );
}

export function LiveDot() {
  return (
    <span className="relative flex size-2">
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
      <span className="relative inline-flex size-2 rounded-full bg-emerald-500" />
    </span>
  );
}

export function CountdownRing({ session, now, size = 56, children }: { session: { startedAt: number; durationMin: number }; now: number; size?: number; children?: ReactNode }) {
  const total = session.durationMin * 60_000;
  const remaining = Math.max(0, session.startedAt + total - now);
  const r = 44;
  const circumference = 2 * Math.PI * r;
  return (
    <div className="relative shrink-0" style={{ width: size, height: size }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden="true">
        <defs>
          <linearGradient id="tm-ring" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" style={{ stopColor: 'var(--color-accent-500)' }} />
            <stop offset="100%" style={{ stopColor: 'var(--color-accent2-500)' }} />
          </linearGradient>
        </defs>
        <circle cx="50" cy="50" r={r} fill="none" strokeWidth="9" className="stroke-base-200 dark:stroke-base-800" />
        <circle
          cx="50"
          cy="50"
          r={r}
          fill="none"
          strokeWidth="9"
          strokeLinecap="round"
          stroke="url(#tm-ring)"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - remaining / total)}
          className="transition-[stroke-dashoffset] duration-1000 ease-linear"
        />
      </svg>
      {children && <div className="absolute inset-0 grid place-items-center">{children}</div>}
    </div>
  );
}

export function Logo() {
  return (
    <a href="#/" className="flex shrink-0 items-center gap-2.5" aria-label="TempoMind home">
      <span className="grid size-8 place-items-center rounded-xl bg-linear-to-br from-accent-500 to-accent2-600 text-white shadow-md shadow-accent-500/30">
        <Activity className="size-4.5" strokeWidth={2.5} aria-hidden="true" />
      </span>
      <span className="hidden text-[17px] font-semibold tracking-tight sm:inline">
        Tempo<span className="bg-linear-to-r from-accent-500 to-accent2-500 bg-clip-text text-transparent">Mind</span>
      </span>
    </a>
  );
}

export function ViewOnlyNotice() {
  return (
    <div className="flex items-start gap-3 rounded-2xl border border-accent-200/70 bg-accent-50/70 px-4 py-3 text-sm text-accent-900 dark:border-accent-500/20 dark:bg-accent-500/10 dark:text-accent-100">
      <ShieldCheck className="mt-0.5 size-4 shrink-0 text-accent-500" />
      <p>
        <span className="font-semibold">View-only mode.</span> Energy metrics are kept private for owner well-being.
      </p>
    </div>
  );
}

const LINKS = {
  // View-only progress page for the whole team.
  view: { path: 'share', label: 'Copy view-only link', copied: 'View-only link copied', title: "Copy a view-only team link (can't edit anything)", icon: Eye },
  // Lets one person tick off tasks on this goal's pacing plan, and nothing else.
  collab: { path: 'collab', label: 'Copy collaborator link', copied: 'Collaborator link copied', title: "Copy a link that lets someone tick off tasks on this goal's pacing plan", icon: UserPlus },
} as const;

/** `code` is the goal's link code for this kind of link (project.links[kind]), never its internal id. */
export function ShareLinkButton({ code, kind = 'view', compact = false }: { code: string; kind?: keyof typeof LINKS; compact?: boolean }) {
  const [copied, setCopied] = useState(false);
  const link = LINKS[kind];
  const Icon = link.icon;
  const copy = async () => {
    const url = `${window.location.origin}${window.location.pathname}#/${link.path}/${code}`;
    try {
      await navigator.clipboard.writeText(url);
    } catch {
      window.prompt('Copy this link:', url);
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };
  return (
    <button type="button" onClick={copy} className={cn(btnSecondary, compact && 'px-2.5')} title={link.title} aria-label={compact ? link.title : undefined}>
      {copied ? <CheckIcon className="size-4 text-emerald-500" aria-hidden="true" /> : <Icon className="size-4" aria-hidden="true" />}
      {!compact && (copied ? link.copied : link.label)}
      <span className="sr-only" role="status">
        {copied ? `${link.copied} to clipboard` : ''}
      </span>
    </button>
  );
}

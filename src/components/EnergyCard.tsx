import { motion } from 'motion/react';
import type { Energy } from '../types';
import { ENERGY_LEVELS, ENERGY_META } from '../lib/energy';
import { actions } from '../lib/store';
import { Card, cn } from './ui';

export function EnergyCard({ energy }: { energy: Energy | null }) {
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="font-semibold tracking-tight">🔒 My Energy Status (Private)</h2>
        <p className="text-xs text-base-500">Only you can see this</p>
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {ENERGY_LEVELS.map((level) => {
          const meta = ENERGY_META[level];
          const active = energy === level;
          return (
            <button
              key={level}
              type="button"
              aria-pressed={active}
              onClick={() => actions.setEnergy(active ? null : level)}
              className={cn(
                'relative flex items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm font-medium transition-colors duration-200',
                active
                  ? 'border-transparent text-white'
                  : 'border-base-200 text-base-700 hover:border-accent-300 dark:border-base-800 dark:text-base-300 dark:hover:border-accent-500/40',
              )}
            >
              {active && (
                <motion.span
                  layoutId="energy-active"
                  className="absolute inset-0 rounded-xl bg-linear-to-br from-accent-500 to-accent2-600"
                  transition={{ type: 'spring', bounce: 0.18, duration: 0.45 }}
                />
              )}
              <span className="relative">{meta.emoji}</span>
              <span className="relative leading-tight">{meta.label}</span>
            </button>
          );
        })}
      </div>
    </Card>
  );
}

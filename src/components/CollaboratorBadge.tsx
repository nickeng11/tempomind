import { usePaletteId, type PaletteId } from '../lib/palettes';
import { cn } from './ui';

// Shades where white initials meet 4.5:1 and the badge meets 3:1 against dark cards.
// Red, amber and green are left out because they already mean status elsewhere.
const AVATAR_COLOURS = {
  blue: 'bg-blue-600',
  sky: 'bg-sky-700',
  cyan: 'bg-cyan-700',
  teal: 'bg-teal-700',
  violet: 'bg-violet-600',
  purple: 'bg-purple-600',
  fuchsia: 'bg-fuchsia-600',
  pink: 'bg-pink-600',
} as const;

type AvatarHue = keyof typeof AVATAR_COLOURS;

// Skip hues that match the active scheme's accents, so badges never read as status or progress.
const CLASHES: Record<PaletteId, AvatarHue[]> = {
  indigo: ['violet', 'purple'],
  ocean: ['blue', 'sky'],
  lagoon: ['teal', 'cyan'],
  sunset: [],
  berry: ['fuchsia', 'pink'],
};

function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  const first = Array.from(words[0] ?? '?')[0] ?? '?';
  const last = words.length > 1 ? (Array.from(words[words.length - 1])[0] ?? '') : '';
  return (first + last).toUpperCase();
}

/** Same name, same colour (within a colour scheme). */
function colourFor(name: string, palette: PaletteId): string {
  const hues = (Object.keys(AVATAR_COLOURS) as AvatarHue[]).filter((h) => !CLASHES[palette].includes(h));
  let hash = 0;
  for (const ch of name.trim().toLowerCase()) hash = (hash * 31 + ch.codePointAt(0)!) >>> 0;
  return AVATAR_COLOURS[hues[hash % hues.length]];
}

/** Initials badges for work completed via a collaborator link; the full name shows on hover or keyboard focus. */
export function CollaboratorBadges({ names }: { names: string[] }) {
  const palette = usePaletteId();
  const label = `Completed by ${names.join(' & ')}`;
  const shown = names.slice(0, 2);

  return (
    <span tabIndex={0} aria-label={label} className="group/badge relative flex shrink-0 -space-x-1.5 rounded-full outline-offset-2">
      {shown.map((name) => (
        <span
          key={name}
          aria-hidden="true"
          className={cn('grid size-5 place-items-center rounded-full text-[9px] font-bold leading-none tracking-tight text-white ring-2 ring-white dark:ring-base-900', colourFor(name, palette))}
        >
          {initialsOf(name)}
        </span>
      ))}
      {names.length > shown.length && (
        <span aria-hidden="true" className="grid size-5 place-items-center rounded-full bg-base-600 text-[9px] font-bold text-white ring-2 ring-white dark:ring-base-900">
          +{names.length - shown.length}
        </span>
      )}
      <span
        role="tooltip"
        className="pointer-events-none absolute bottom-full right-0 z-20 mb-2 whitespace-nowrap rounded-md bg-base-900 px-2 py-1 text-xs font-medium text-white opacity-0 shadow-lg transition-opacity group-hover/badge:opacity-100 group-focus/badge:opacity-100 dark:bg-white dark:text-base-900"
      >
        {label}
      </span>
    </span>
  );
}

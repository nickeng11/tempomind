const MS_PER_DAY = 86_400_000;

export function toISODate(d: Date): string {
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${month}-${day}`;
}

export function parseISODate(s: string): Date {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayISO(): string {
  return toISODate(new Date());
}

export function addDays(s: string, n: number): string {
  const d = parseISODate(s);
  d.setDate(d.getDate() + n);
  return toISODate(d);
}

/** Calendar days from `from` to `to` (negative if `to` is earlier). */
export function diffDays(from: string, to: string): number {
  const [ay, am, ad] = from.split('-').map(Number);
  const [by, bm, bd] = to.split('-').map(Number);
  return Math.round((Date.UTC(by, bm - 1, bd) - Date.UTC(ay, am - 1, ad)) / MS_PER_DAY);
}

export function isWeekend(s: string): boolean {
  const day = parseISODate(s).getDay();
  return day === 0 || day === 6;
}

/** Monday of the week containing `s`. */
export function weekStart(s: string): string {
  const day = parseISODate(s).getDay();
  return addDays(s, -((day + 6) % 7));
}


export function formatDate(s: string, withWeekday = false): string {
  return parseISODate(s).toLocaleDateString('en-US', {
    weekday: withWeekday ? 'short' : undefined,
    month: 'short',
    day: 'numeric',
  });
}

export function formatDuration(min: number): string {
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatHours(min: number): string {
  const h = min / 60;
  return `${h >= 10 ? Math.round(h) : Math.round(h * 10) / 10}h`;
}

export function formatClock(ms: number): string {
  const total = Math.ceil(ms / 1000);
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

export function daysLeftLabel(days: number): string {
  if (days > 1) return `${days} days left`;
  if (days === 1) return 'due tomorrow';
  if (days === 0) return 'due today';
  return `${-days} day${days === -1 ? '' : 's'} overdue`;
}

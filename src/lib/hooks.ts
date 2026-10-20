import { useEffect, useState } from 'react';
import { toISODate } from './dates';

export function useNow(intervalMs: number): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

/** Today's date, rolling over at midnight. */
export function useToday(): string {
  return toISODate(new Date(useNow(60_000)));
}

export function useHash(): string {
  const [hash, setHash] = useState(() => window.location.hash);
  useEffect(() => {
    const onChange = () => {
      setHash(window.location.hash);
      window.scrollTo({ top: 0 });
    };
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}

/** A string value remembered across reloads in this browser. */
export function useRememberedId(key: string): [string | null, (value: string) => void] {
  const [value, setValue] = useState<string | null>(() => {
    try {
      return localStorage.getItem(key);
    } catch {
      return null;
    }
  });
  const update = (next: string) => {
    setValue(next);
    try {
      localStorage.setItem(key, next);
    } catch {
      // Not critical: falls back to the first project on reload.
    }
  };
  return [value, update];
}

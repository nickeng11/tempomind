import { useEffect, useRef } from 'react';
import { CircleCheckBig } from 'lucide-react';
import type { Project } from '../types';
import { btnPrimary, btnSecondary } from './ui';

/**
 * Human-in-the-loop confirmation before a goal is archived. Uses the native
 * <dialog>, which traps focus and closes on Escape.
 */
export function CompleteDialog({ project, open, onCancel, onConfirm }: { project: Project; open: boolean; onCancel: () => void; onConfirm: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onCancel}
      aria-labelledby="complete-title"
      aria-describedby="complete-desc"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-base-200 bg-white p-6 text-base-900 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-base-800 dark:bg-base-900 dark:text-base-100"
    >
      <div className="grid size-11 place-items-center rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400">
        <CircleCheckBig className="size-5" aria-hidden="true" />
      </div>
      <h2 id="complete-title" className="mt-4 text-lg font-semibold tracking-tight">
        Mark “{project.title}” as complete?
      </h2>
      <div id="complete-desc" className="mt-2 space-y-2 text-sm text-muted">
        <p>Every sub-task is checked off. Confirming will:</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>Move it to the bottom of your workspace and to Completed Goals</li>
          <li>Lock it as read-only (untick it later to reopen)</li>
          <li>End any running focus session</li>
        </ul>
      </div>
      <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <button type="button" onClick={onCancel} className={btnSecondary} autoFocus>
          Not yet
        </button>
        <button type="button" onClick={onConfirm} className={btnPrimary}>
          Confirm completion
        </button>
      </div>
    </dialog>
  );
}

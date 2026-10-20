import { useEffect, useRef, type ReactNode } from 'react';
import { CircleCheckBig, RotateCcw } from 'lucide-react';
import type { Project } from '../types';
import { btnPrimary, btnSecondary } from './ui';

/**
 * Human-in-the-loop confirmation. Uses the native <dialog>, which traps focus,
 * closes on Escape (counted as cancel) and returns focus to whatever opened it.
 */
function ConfirmDialog({
  open,
  icon,
  title,
  children,
  confirmLabel,
  cancelLabel,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  icon: ReactNode;
  title: string;
  children: ReactNode;
  confirmLabel: string;
  cancelLabel: string;
  onCancel: () => void;
  onConfirm: () => void;
}) {
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
      aria-labelledby="confirm-title"
      aria-describedby="confirm-desc"
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-2xl border border-base-200 bg-white p-6 text-base-900 shadow-2xl backdrop:bg-black/40 backdrop:backdrop-blur-sm dark:border-base-800 dark:bg-base-900 dark:text-base-100"
    >
      {open && (
        <>
          {icon}
          <h2 id="confirm-title" className="mt-4 text-lg font-semibold tracking-tight">
            {title}
          </h2>
          <div id="confirm-desc" className="mt-2 space-y-2 text-sm text-muted">
            {children}
          </div>
          <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button type="button" onClick={onCancel} className={btnSecondary} autoFocus>
              {cancelLabel}
            </button>
            <button type="button" onClick={onConfirm} className={btnPrimary}>
              {confirmLabel}
            </button>
          </div>
        </>
      )}
    </dialog>
  );
}

const iconClass = 'grid size-11 place-items-center rounded-full';

export function CompleteDialog({ project, open, onCancel, onConfirm }: { project: Project; open: boolean; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ConfirmDialog
      open={open}
      icon={
        <div className={`${iconClass} bg-emerald-50 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400`}>
          <CircleCheckBig className="size-5" aria-hidden="true" />
        </div>
      }
      title={`Mark “${project.title}” as complete?`}
      confirmLabel="Confirm completion"
      cancelLabel="Not yet"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>Every sub-task is checked off. Confirming will:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Move it to your Completed menu and the Completed Goals page</li>
        <li>Lock it as read-only (untick it later to reopen)</li>
        <li>End any running focus session</li>
      </ul>
    </ConfirmDialog>
  );
}

/** Shown when the owner unticks a completed goal. Nothing changes unless they confirm. */
export function ReopenDialog({ project, onCancel, onConfirm }: { project: Project | null; onCancel: () => void; onConfirm: () => void }) {
  return (
    <ConfirmDialog
      open={!!project}
      icon={
        <div className={`${iconClass} bg-accent-50 text-accent-600 dark:bg-accent-500/15 dark:text-accent-300`}>
          <RotateCcw className="size-5" aria-hidden="true" />
        </div>
      }
      title={`Make “${project?.title ?? ''}” live again?`}
      confirmLabel="Yes, make it live"
      cancelLabel="Keep it completed"
      onCancel={onCancel}
      onConfirm={onConfirm}
    >
      <p>Confirming will:</p>
      <ul className="list-disc space-y-1 pl-5">
        <li>Make it an active, editable goal in your workspace again</li>
        <li>Remove it from the Completed Goals page</li>
        <li>Show it to your team as in progress</li>
      </ul>
      <p>If you keep it completed, it stays locked, greyed out and on the Completed Goals page.</p>
    </ConfirmDialog>
  );
}

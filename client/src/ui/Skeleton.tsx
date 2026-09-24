import type { ReactNode } from 'react';
import { cx } from './cx';

export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden="true" className={cx('rounded-md bg-surface-secondary motion-safe:animate-pulse', className)} />;
}

/** Announces a loading region once; the skeleton blocks inside stay hidden from assistive tech. */
export function Loading({ label, className, children }: { label: string; className?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

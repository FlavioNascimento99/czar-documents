import { useId, type ReactNode } from 'react';
import { cx } from './cx';

type CardProps = {
  title?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  /** Drop the body padding, e.g. for edge-to-edge lists. */
  flush?: boolean;
  className?: string;
  children: ReactNode;
};

export function Card({ title, description, actions, flush = false, className, children }: CardProps) {
  const titleId = useId();
  return (
    <section
      aria-labelledby={title ? titleId : undefined}
      className={cx('rounded-lg border border-border bg-surface shadow-card', flush && 'overflow-hidden', className)}
    >
      {title && (
        <header className={cx('flex flex-wrap items-start justify-between gap-3', flush ? 'border-b border-border px-4 py-3 md:px-5' : 'px-4 pt-4 md:px-5 md:pt-5')}>
          <div className="min-w-0">
            <h2 id={titleId} className="text-h2 text-fg">
              {title}
            </h2>
            {description && <p className="mt-0.5 text-small text-fg-secondary">{description}</p>}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cx(!flush && (title ? 'px-4 pb-4 pt-4 md:px-5 md:pb-5' : 'p-4 md:p-5'))}>{children}</div>
    </section>
  );
}

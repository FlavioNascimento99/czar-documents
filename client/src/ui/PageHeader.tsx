import { Fragment, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { cx } from './cx';

export type Crumb = { label: string; to: string };

type PageHeaderProps = {
  title: ReactNode;
  description?: ReactNode;
  breadcrumbs?: Crumb[];
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, description, breadcrumbs, actions, className }: PageHeaderProps) {
  return (
    <header className={cx('mb-6', className)}>
      {breadcrumbs && breadcrumbs.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-2 text-small text-fg-secondary">
          <ol className="flex flex-wrap items-center gap-1.5">
            {breadcrumbs.map((c, i) => (
              <Fragment key={c.to}>
                {i > 0 && <li aria-hidden="true" className="text-fg-tertiary">/</li>}
                <li>
                  <Link to={c.to} className="rounded-sm transition-colors hover:text-fg">
                    {c.label}
                  </Link>
                </li>
              </Fragment>
            ))}
          </ol>
        </nav>
      )}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="break-words text-h1 text-fg">{title}</h1>
          {description && <div className="mt-1 text-body text-fg-secondary">{description}</div>}
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  );
}

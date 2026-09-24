import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { cx } from './cx';

type EmptyStateProps = {
  icon: IconName;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  headingLevel?: 'h1' | 'h2' | 'h3';
  className?: string;
};

export function EmptyState({ icon, title, description, action, headingLevel = 'h2', className }: EmptyStateProps) {
  const Heading = headingLevel;
  return (
    <div className={cx('flex flex-col items-center px-6 py-12 text-center', className)}>
      <span className="mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-surface-secondary text-fg-secondary">
        <Icon name={icon} size={24} />
      </span>
      <Heading className="text-h3 text-fg">{title}</Heading>
      {description && <p className="mt-1 max-w-sm text-small text-fg-secondary">{description}</p>}
      {action && <div className="mt-4 flex flex-wrap justify-center gap-2">{action}</div>}
    </div>
  );
}

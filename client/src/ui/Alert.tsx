import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { cx } from './cx';

type AlertTone = 'success' | 'danger' | 'info';

const tones: Record<AlertTone, { box: string; icon: string; name: IconName }> = {
  success: { box: 'border-success/25 bg-success-subtle', icon: 'text-success', name: 'circle-check' },
  danger: { box: 'border-danger/25 bg-danger-subtle', icon: 'text-danger', name: 'circle-alert' },
  info: { box: 'border-info/25 bg-info-subtle', icon: 'text-info', name: 'circle-alert' },
};

type AlertProps = { tone?: AlertTone; className?: string; children: ReactNode };

export function Alert({ tone = 'info', className, children }: AlertProps) {
  const t = tones[tone];
  return (
    <div
      role={tone === 'danger' ? 'alert' : 'status'}
      className={cx('flex items-start gap-2 rounded-md border px-3 py-2.5 text-body text-fg', t.box, className)}
    >
      <Icon name={t.name} className={cx('mt-0.5', t.icon)} />
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}

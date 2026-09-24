import { Icon, Spinner, cx } from '../ui';

export type SaveState = 'saved' | 'saving' | 'failed';

export function SaveStatus({ status }: { status: SaveState }) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cx('inline-flex items-center gap-1.5 text-small font-medium', status === 'failed' ? 'text-danger' : 'text-fg-secondary')}
    >
      {status === 'saving' && <Spinner size={14} />}
      {status === 'saved' && <Icon name="circle-check" size={14} className="text-success" />}
      {status === 'failed' && <Icon name="circle-alert" size={14} />}
      {status === 'saving' ? 'Saving…' : status === 'saved' ? 'Saved' : 'Save failed'}
    </span>
  );
}

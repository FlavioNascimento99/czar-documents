import { Icon } from './Icon';
import { cx } from './cx';

export function Spinner({ size = 16, className }: { size?: number; className?: string }) {
  return <Icon name="loader-circle" size={size} className={cx('animate-spin', className)} />;
}

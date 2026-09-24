import { initialsOf } from './initials';
import { cx } from './cx';

type AvatarSize = 'sm' | 'lg';

const sizes: Record<AvatarSize, string> = {
  sm: 'h-8 w-8 text-caption',
  lg: 'h-14 w-14 text-h2',
};

export function Avatar({ name, size = 'sm', className }: { name: string; size?: AvatarSize; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center rounded-full bg-primary-subtle font-semibold text-primary-subtle-fg',
        sizes[size],
        className,
      )}
    >
      {initialsOf(name)}
    </span>
  );
}

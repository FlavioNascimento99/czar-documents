import { forwardRef, type InputHTMLAttributes, type SelectHTMLAttributes } from 'react';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { cx } from './cx';

export type ControlSize = 'sm' | 'md';

const control =
  'w-full rounded-md border border-border-strong bg-surface text-fg placeholder:text-fg-tertiary ' +
  'transition-[border-color,box-shadow] hover:border-fg-tertiary/70 ' +
  'focus:border-primary focus:outline-none focus:ring-[3px] focus:ring-primary/20 ' +
  'disabled:cursor-not-allowed disabled:bg-surface-secondary disabled:text-fg-tertiary ' +
  'aria-[invalid=true]:border-danger aria-[invalid=true]:focus:ring-danger/20';

const heights: Record<ControlSize, string> = {
  sm: 'h-8 text-small',
  md: 'h-9 text-body',
};

type InputProps = Omit<InputHTMLAttributes<HTMLInputElement>, 'size'> & {
  controlSize?: ControlSize;
  icon?: IconName;
  /** Classes for the outer box (width, margins). */
  className?: string;
};

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { controlSize = 'md', icon, className, ...rest },
  ref,
) {
  return (
    <div className={cx('relative', className)}>
      {icon && (
        <Icon name={icon} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-fg-tertiary" />
      )}
      <input ref={ref} className={cx(control, heights[controlSize], icon ? 'pl-9 pr-3' : 'px-3')} {...rest} />
    </div>
  );
});

type SelectProps = Omit<SelectHTMLAttributes<HTMLSelectElement>, 'size'> & {
  controlSize?: ControlSize;
  className?: string;
};

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { controlSize = 'md', className, children, ...rest },
  ref,
) {
  return (
    <div className={cx('relative', className)}>
      <select
        ref={ref}
        className={cx(control, heights[controlSize], 'cursor-pointer appearance-none truncate pl-3 pr-9')}
        {...rest}
      >
        {children}
      </select>
      <Icon
        name="chevron-down"
        className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-fg-secondary"
      />
    </div>
  );
});

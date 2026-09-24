import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { Link, type LinkProps } from 'react-router-dom';
import { Icon } from './Icon';
import type { IconName } from './icons';
import { Spinner } from './Spinner';
import { cx } from './cx';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger' | 'danger-soft';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonStyle = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Square, icon-only button. Pair with aria-label. */
  square?: boolean;
  className?: string;
};

const base =
  'inline-flex select-none items-center justify-center gap-2 whitespace-nowrap rounded-md text-body font-medium ' +
  'transition-[color,background-color,border-color,opacity,transform] active:translate-y-px ' +
  'disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'bg-primary text-white hover:bg-primary-hover',
  secondary: 'border border-border-strong bg-surface text-fg hover:bg-surface-secondary',
  ghost: 'text-fg hover:bg-surface-secondary',
  danger: 'bg-danger text-white hover:bg-danger-hover',
  'danger-soft': 'border border-border-strong bg-surface text-danger hover:border-danger/40 hover:bg-danger-subtle',
};

const sizes: Record<ButtonSize, { box: string; square: string }> = {
  sm: { box: 'h-8 px-3', square: 'h-8 w-8' },
  md: { box: 'h-9 px-3.5', square: 'h-9 w-9' },
  lg: { box: 'h-10 px-4', square: 'h-10 w-10' },
};

function buttonClasses({ variant = 'secondary', size = 'md', square = false, className }: ButtonStyle): string {
  return cx(base, variants[variant], square ? sizes[size].square : sizes[size].box, className);
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> &
  ButtonStyle & {
    icon?: IconName;
    loading?: boolean;
    children?: ReactNode;
  };

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant, size, square, className, icon, loading = false, disabled, children, ...rest },
  ref,
) {
  return (
    <button
      ref={ref}
      className={buttonClasses({ variant, size, square, className })}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {loading ? <Spinner /> : icon && <Icon name={icon} />}
      {children}
    </button>
  );
});

type ButtonLinkProps = LinkProps & ButtonStyle & { icon?: IconName };

export function ButtonLink({ variant, size, square, className, icon, children, ...rest }: ButtonLinkProps) {
  return (
    <Link className={buttonClasses({ variant, size, square, className })} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </Link>
  );
}

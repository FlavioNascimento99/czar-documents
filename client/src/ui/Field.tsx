import type { ReactNode } from 'react';
import { cx } from './cx';

type LabelProps = { htmlFor: string; children: ReactNode; srOnly?: boolean };

export function Label({ htmlFor, children, srOnly = false }: LabelProps) {
  return (
    <label htmlFor={htmlFor} className={srOnly ? 'sr-only' : 'text-label text-fg'}>
      {children}
    </label>
  );
}

export const hintId = (id: string) => `${id}-hint`;

type FieldProps = {
  id: string;
  label: string;
  srOnlyLabel?: boolean;
  /** Help text; link it to the control with aria-describedby={hintId(id)}. */
  hint?: ReactNode;
  className?: string;
  children: ReactNode;
};

export function Field({ id, label, srOnlyLabel, hint, className, children }: FieldProps) {
  return (
    <div className={cx('flex flex-col gap-1.5', className)}>
      <Label htmlFor={id} srOnly={srOnlyLabel}>
        {label}
      </Label>
      {children}
      {hint && (
        <p id={hintId(id)} className="text-caption font-normal text-fg-secondary">
          {hint}
        </p>
      )}
    </div>
  );
}

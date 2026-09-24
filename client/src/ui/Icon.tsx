import { icons, type IconName } from './icons';
import { cx } from './cx';

type IconProps = {
  name: IconName;
  size?: number;
  className?: string;
  /** Accessible name; when omitted the icon is decorative and hidden from assistive tech. */
  label?: string;
};

export function Icon({ name, size = 16, className, label }: IconProps) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cx('shrink-0', className)}
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      focusable="false"
    >
      {icons[name]}
    </svg>
  );
}

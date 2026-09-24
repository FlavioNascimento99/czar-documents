import { cx } from './cx';

type BrandMarkSize = 'md' | 'lg';

const sizes: Record<BrandMarkSize, string> = {
  md: 'h-7 w-7 rounded-md text-[0.9375rem]',
  lg: 'h-10 w-10 rounded-lg text-xl',
};

export function BrandMark({ size = 'md', className }: { size?: BrandMarkSize; className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={cx(
        'inline-flex shrink-0 select-none items-center justify-center bg-primary font-bold leading-none text-white',
        sizes[size],
        className,
      )}
    >
      C
    </span>
  );
}

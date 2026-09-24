import type { ReactNode } from 'react';
import { cx } from './cx';

type ContainerSize = 'page' | 'reading' | 'narrow';

const widths: Record<ContainerSize, string> = {
  page: 'max-w-page',
  reading: 'max-w-reading',
  narrow: 'max-w-md',
};

export function Container({ size = 'page', className, children }: { size?: ContainerSize; className?: string; children: ReactNode }) {
  return <div className={cx('mx-auto w-full px-4 py-6 md:px-6 md:py-8', widths[size], className)}>{children}</div>;
}

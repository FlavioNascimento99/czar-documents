import type { ReactNode } from 'react';
import { TopNav } from './TopNav';

export function AppShell({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only z-tooltip rounded-md bg-surface px-3 py-2 text-body font-medium text-fg shadow-popover focus:not-sr-only focus:fixed focus:left-4 focus:top-3"
      >
        Skip to content
      </a>
      <TopNav />
      <main id="main" tabIndex={-1} className="flex-1 focus:outline-none">
        {children}
      </main>
      <footer className="border-t border-border bg-surface">
        <div className="mx-auto flex max-w-page flex-wrap items-center justify-between gap-2 px-4 py-6 text-small text-fg-secondary md:px-6">
          <span>Czar Documents</span>
          <span>Write, organize, share and publish.</span>
        </div>
      </footer>
    </div>
  );
}

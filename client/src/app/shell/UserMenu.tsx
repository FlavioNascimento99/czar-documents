import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Avatar, Icon, useDismiss, type DismissReason } from '../../ui';

const itemClass =
  'flex h-8 w-full items-center gap-2 rounded-md px-2.5 text-left text-body text-fg transition-colors hover:bg-surface-secondary';

export function UserMenu({ username, onLogout }: { username: string; onLogout: () => void }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();

  const close = useCallback((reason?: DismissReason) => {
    setOpen(false);
    if (reason === 'escape') buttonRef.current?.focus();
  }, []);
  useDismiss(rootRef, open, close);
  useEffect(() => setOpen(false), [pathname]);

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-expanded={open}
        aria-controls="user-menu"
        aria-label={`Account menu for @${username}`}
        onClick={() => setOpen((o) => !o)}
        className="flex h-10 items-center gap-2 rounded-full pl-1 pr-1 transition-colors hover:bg-surface-secondary lg:pr-2.5"
      >
        <Avatar name={username} />
        <span className="hidden max-w-[10rem] truncate text-body font-medium text-fg lg:inline">@{username}</span>
        <Icon name="chevron-down" className="hidden text-fg-secondary lg:block" />
      </button>
      {open && (
        <div
          id="user-menu"
          className="absolute right-0 top-full z-dropdown mt-1.5 w-60 animate-menu-in rounded-lg border border-border bg-surface p-1 shadow-popover"
        >
          <div className="mb-1 border-b border-border px-2.5 pb-2 pt-1.5">
            <p className="text-caption text-fg-secondary">Signed in as</p>
            <p className="truncate text-body font-medium text-fg">@{username}</p>
          </div>
          <Link to={'/@' + username} className={itemClass}>
            <Icon name="user" className="text-fg-secondary" />
            Your profile
          </Link>
          <button
            type="button"
            className={itemClass}
            onClick={() => {
              close();
              onLogout();
            }}
          >
            <Icon name="log-out" className="text-fg-secondary" />
            Log out
          </button>
        </div>
      )}
    </div>
  );
}

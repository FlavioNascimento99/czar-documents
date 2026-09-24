import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { useAuth } from '../../auth/store';
import { BrandMark, Button, ButtonLink, Icon, cx, useDismiss } from '../../ui';
import { primaryNav } from './navigation';
import { NavSearch } from './NavSearch';
import { UserMenu } from './UserMenu';

const linkClass = (isActive: boolean, mobile = false) =>
  cx(
    'inline-flex items-center gap-2 rounded-sm font-medium transition-colors',
    mobile ? 'h-10 px-3 text-body' : 'h-8 px-2.5 text-body',
    isActive ? 'bg-primary-subtle text-fg' : 'text-fg-secondary hover:bg-surface-secondary hover:text-fg',
  );

export function TopNav() {
  const { username, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const headerRef = useRef<HTMLElement>(null);
  const { pathname, search } = useLocation();

  const closeMenu = useCallback(() => setMenuOpen(false), []);
  useDismiss(headerRef, menuOpen, closeMenu);
  useEffect(closeMenu, [pathname, search, closeMenu]);

  return (
    <header ref={headerRef} className="sticky top-0 z-sticky border-b border-border bg-surface">
      <div className="mx-auto flex h-nav max-w-page items-center gap-2 px-4 md:px-6">
        <Link to="/" className="-ml-1 flex items-center gap-2.5 rounded-md px-1 py-1">
          <BrandMark />
          <span className="text-brand text-fg">Czar Documents</span>
        </Link>

        <nav aria-label="Primary" className="ml-5 hidden items-center gap-1 md:flex">
          {primaryNav.map((item) => (
            <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClass(isActive)}>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <NavSearch id="nav-search" className="hidden w-52 md:block lg:w-64" />
          {username ? (
            <UserMenu username={username} onLogout={logout} />
          ) : (
            <div className="hidden items-center gap-2 md:flex">
              <ButtonLink to="/login" variant="ghost" size="sm">
                Log in
              </ButtonLink>
              <ButtonLink to="/register" variant="primary" size="sm">
                Register
              </ButtonLink>
            </div>
          )}
          <Button
            type="button"
            variant="ghost"
            size="lg"
            square
            className="-mr-2 md:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((o) => !o)}
          >
            <Icon name={menuOpen ? 'x' : 'menu'} size={20} />
          </Button>
        </div>
      </div>

      <div id="mobile-nav" hidden={!menuOpen} className="animate-menu-in border-t border-border bg-surface md:hidden">
        <div className="flex flex-col gap-4 px-4 py-4">
          <NavSearch id="mobile-search" />
          <nav aria-label="Primary" className="flex flex-col gap-1">
            {primaryNav.map((item) => (
              <NavLink key={item.to} to={item.to} className={({ isActive }) => linkClass(isActive, true)}>
                <Icon name={item.icon} />
                {item.label}
              </NavLink>
            ))}
          </nav>
          {!username && (
            <div className="grid grid-cols-2 gap-2 border-t border-border pt-4">
              <ButtonLink to="/login" variant="secondary" size="lg">
                Log in
              </ButtonLink>
              <ButtonLink to="/register" variant="primary" size="lg">
                Register
              </ButtonLink>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}

import type { IconName } from '../../ui';

export type NavItem = { to: string; label: string; icon: IconName };

export const primaryNav: NavItem[] = [
  { to: '/docs', label: 'Documents', icon: 'file-text' },
  { to: '/search', label: 'Search', icon: 'search' },
];

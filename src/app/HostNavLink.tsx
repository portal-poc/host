import type { MouseEvent, ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Link } from '@portal-poc/ds';
import { useHostNavigate } from '@/shared/lib';
import { usePreloadIntent } from '@/shared/remotes';

export const HostNavLink = ({ to, children }: { to: string; children: ReactNode }) => {
  const navigate = useHostNavigate();
  // Hover / focus on a remote section warms its code and first data (no-op for host routes).
  const preloadIntent = usePreloadIntent(to);
  const { pathname } = useLocation();
  const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    navigate(to);
  };

  return (
    <Link href={to} onClick={handleClick} {...preloadIntent} fontWeight={isActive ? 'lg' : 'md'} aria-current={isActive ? 'page' : undefined}>
      {children}
    </Link>
  );
};

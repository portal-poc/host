import type { MouseEvent, ReactNode } from 'react';
import { useLocation } from 'react-router';
import { Link } from '@portal/ds';
import { useHostNavigate } from '@/shared/lib';

export const HostNavLink = ({ to, children }: { to: string; children: ReactNode }) => {
  const navigate = useHostNavigate();
  const { pathname } = useLocation();
  const isActive = to === '/' ? pathname === '/' : pathname.startsWith(to);

  const handleClick = (event: MouseEvent) => {
    event.preventDefault();
    navigate(to);
  };

  return (
    <Link href={to} onClick={handleClick} fontWeight={isActive ? 'lg' : 'md'} aria-current={isActive ? 'page' : undefined}>
      {children}
    </Link>
  );
};

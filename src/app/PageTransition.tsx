import { ViewTransition } from 'react';
import type { ReactNode } from 'react';

const DIRECTIONAL = { 'nav-forward': 'nav-forward', 'nav-back': 'nav-back', default: 'none' };

/** Page-level, type-keyed. `default="none"`: revalidations and remote-internal updates do not animate the page. */
export const PageTransition = ({ children }: { children: ReactNode }) => (
  <ViewTransition enter={DIRECTIONAL} exit={DIRECTIONAL} default="none">
    <div>{children}</div>
  </ViewTransition>
);

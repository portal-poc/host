import { addTransitionType, startTransition } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { getRemoteSections } from '../config';

type Direction = 'nav-forward' | 'nav-back';

const sectionIndex = (sections: readonly string[], path: string): number =>
  sections.findLastIndex((section) => (section === '/' ? path === '/' : path.startsWith(section)));

const isDescendant = (from: string, to: string) => to.startsWith(from) && to.length > from.length;

/** Deeper or later section (order of the stand config) → forward; otherwise back. */
export const getNavigationDirection = (from: string, to: string, sections: readonly string[]): Direction =>
  sectionIndex(sections, to) > sectionIndex(sections, from) || isDescendant(from, to) ? 'nav-forward' : 'nav-back';

/**
 * Host-owned route transitions with a direction type. React Router v8 updates its state after an await inside its
 * own startTransition; because our async action is still pending, that update is entangled with it and commits with
 * our `nav-forward` / `nav-back` types (verified in the browser). Browser back/forward (popstate) carries no type.
 */
export const useHostNavigate = () => {
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (to: string) => {
    const sections = ['/', ...getRemoteSections().map((section) => section.basePath)];
    const direction = getNavigationDirection(pathname, to, sections);
    startTransition(async () => {
      addTransitionType(direction);
      await navigate(to);
    });
  };
};

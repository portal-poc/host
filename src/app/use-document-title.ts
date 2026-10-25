import { useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router';
import { getRemoteSections } from '@/shared/config';
import { pageTitles } from '@/shared/platform';

const PORTAL = 'Portal';

const isInSection = (pathname: string, basePath: string) => pathname === basePath || pathname.startsWith(`${basePath}/`);

/** "<page> · <section> · Portal" from the app whose section is on screen; repeated parts are dropped. */
export const composeTitle = (pathname: string, titles: Readonly<Record<string, string>>): string => {
  const section = getRemoteSections().find((candidate) => isInSection(pathname, candidate.basePath));
  const parts = section ? [titles[section.name], section.title, PORTAL] : [titles['host'], PORTAL];
  return parts.filter((part, index): part is string => Boolean(part) && part !== parts[index + 1]).join(' · ');
};

/** The document title follows the route and the titles apps set (`usePageTitle` / `platform.document`). */
export const useDocumentTitle = () => {
  const { pathname } = useLocation();
  const titles = useSyncExternalStore(pageTitles.subscribe, pageTitles.getSnapshot);

  useEffect(() => {
    document.title = composeTitle(pathname, titles);
  }, [pathname, titles]);
};

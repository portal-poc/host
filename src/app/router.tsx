import { createBrowserRouter } from 'react-router';
import { HomePage } from '@/pages/home';
import { getRemoteSections } from '@/shared/config';
import { setHostNavigate } from '@/shared/platform';
import { RemoteApp } from '@/shared/remotes';
import { Layout } from './Layout';
import { PageTransition } from './PageTransition';

// Keys: route elements render at the same tree position, so without a key React sees an UPDATE of one
// PageTransition instead of exit + enter, and type-keyed enter/exit never fire.
export const createHostRouter = () => {
  const router = createBrowserRouter([
    {
      element: <Layout />,
      children: [
        { index: true, element: <PageTransition key="home"><HomePage /></PageTransition> },
        // One splat route per registered remote (from the stand config). Integrated remotes render their own
        // <Routes> under it (shared react-router singleton).
        ...getRemoteSections().map((section) => ({
          path: `${section.basePath.replace(/^\//, '')}/*`,
          element: (
            <PageTransition key={section.name}>
              <RemoteApp name={section.name} />
            </PageTransition>
          ),
        })),
      ],
    },
  ]);
  setHostNavigate((path) => {
    void router.navigate(path);
  });
  return router;
};

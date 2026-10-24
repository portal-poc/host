import { createBrowserRouter } from 'react-router';
import { HomePage } from '@/pages/home';
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
        // Integrated remotes render their own <Routes> under this splat route (shared react-router singleton).
        { path: 'tasks/*', element: <PageTransition key="tasks"><RemoteApp name="tasks" /></PageTransition> },
        { path: 'legacy/*', element: <PageTransition key="legacy"><RemoteApp name="legacy" /></PageTransition> },
      ],
    },
  ]);
  setHostNavigate((path) => {
    void router.navigate(path);
  });
  return router;
};

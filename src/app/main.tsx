import { QueryClientProvider } from '@tanstack/react-query';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { RouterProvider } from 'react-router/dom';
import { DsProvider } from '@portal-poc/ds';
import { PlatformProvider } from '@portal-poc/platform-runtime';
import { getHostQueryClient } from '@/shared/api';
import { loadHostConfig } from '@/shared/config';
import { getHostPlatform } from '@/shared/platform';
import { loadHostSingletons, registerConfiguredRemotes } from '@/shared/remotes';
import { createHostRouter } from './router';
// Side-effect import: global view-transition CSS of the host.
// oxlint-disable-next-line import/no-unassigned-import
import './view-transitions.css';

await loadHostConfig();
await loadHostSingletons();
registerConfiguredRemotes();
const router = createHostRouter();

const container = document.getElementById('root');
if (!container) {
  throw new Error('#root not found');
}

createRoot(container).render(
  <StrictMode>
    <DsProvider>
      <PlatformProvider value={getHostPlatform()}>
        <QueryClientProvider client={getHostQueryClient()}>
          {/* useTransitions: router updates run in transitions → ViewTransition + optimistic navigation state. */}
          <RouterProvider router={router} useTransitions />
        </QueryClientProvider>
      </PlatformProvider>
    </DsProvider>
  </StrictMode>,
);

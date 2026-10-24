import { useSyncExternalStore } from 'react';
import { Outlet, useNavigation } from 'react-router';
import { Box, Button, Sheet, Spinner, Stack, Typography } from '@portal-poc/ds';
import { DevtoolsToolbar, useClearCacheOnAccountChange } from '@portal-poc/platform-runtime';
import { useInvalidateBookmarksOnEvent } from '@/pages/home';
import { getHostHttp, getHostQueryClient } from '@/shared/api';
import { devtoolsRegistry, getHostPlatform, hostAuth } from '@/shared/platform';
import { QueryBoundary } from '@/shared/ui';
import { DemoPanel } from './DemoPanel';
import { HostNavLink } from './HostNavLink';
import { RemotesInfo } from './RemotesInfo';

const signIn = () => {
  void hostAuth.requestInteraction([]);
};

const SignedOut = () => {
  return (
    <Stack gap={1} alignItems="flex-start">
      <Typography>You are signed out.</Typography>
      <Button onClick={signIn}>Sign in</Button>
    </Stack>
  );
};

export const Layout = () => {
  useClearCacheOnAccountChange(getHostPlatform(), getHostQueryClient);
  useInvalidateBookmarksOnEvent(getHostHttp());
  const account = useSyncExternalStore(hostAuth.subscribe, hostAuth.getAccount);
  // Optimistic router state (`useTransitions`): stays non-idle while the target suspends (e.g. remote loading).
  const isNavigating = useNavigation().state !== 'idle';

  return (
    <Box>
      {/* Persistent element: isolated from the page snapshot during route transitions. */}
      <Sheet component="header" variant="soft" sx={{ px: 2, py: 1.5, viewTransitionName: 'host-header' }}>
        <Stack direction="row" gap={2} alignItems="center">
          <Typography level="title-lg">Portal</Typography>
          <HostNavLink to="/">Home</HostNavLink>
          <HostNavLink to="/tasks">Tasks</HostNavLink>
          <HostNavLink to="/legacy">Legacy</HostNavLink>
          {isNavigating && <Spinner size="sm" label="Navigating" />}
          <Typography level="body-sm" sx={{ ml: 'auto' }}>
            {account?.displayName ?? 'Signed out'}
          </Typography>
        </Stack>
      </Sheet>
      <Box component="main" sx={{ p: 2 }}>
        {account ? (
          <QueryBoundary>
            <Outlet />
          </QueryBoundary>
        ) : (
          <SignedOut />
        )}
      </Box>
      <DemoPanel />
      {devtoolsRegistry && <DevtoolsToolbar registry={devtoolsRegistry} extra={<RemotesInfo />} />}
    </Box>
  );
};

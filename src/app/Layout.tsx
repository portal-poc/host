import { useSyncExternalStore } from 'react';
import { Outlet, useNavigation } from 'react-router';
import { Box, Button, Sheet, Spinner, Stack, Typography } from '@portal-poc/ds';
import { DevtoolsToolbar, useClearCacheOnAccountChange } from '@portal-poc/platform-runtime';
import { PlatformLeaveBlocker } from '@portal-poc/platform-runtime/router';
import { useInvalidateBookmarksOnEvent } from '@/pages/home';
import { getHostQueryClient } from '@/shared/api';
import { getHostConfig, getRemoteSections } from '@/shared/config';
import { getDevtoolsRegistry, getHostPlatform, hostAuth, isDemoEnabled } from '@/shared/platform';
import { QueryBoundary } from '@/shared/ui';
import { DemoPanel } from './DemoPanel';
import { HostNavLink } from './HostNavLink';
import { LeaveDialog } from './LeaveDialog';
import { RemotesInfo } from './RemotesInfo';
import { useDocumentTitle } from './use-document-title';

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
  useInvalidateBookmarksOnEvent();
  useDocumentTitle();
  const account = useSyncExternalStore(hostAuth.subscribe, hostAuth.getAccount);
  // Optimistic router state (`useTransitions`): stays non-idle while the target suspends (e.g. remote loading).
  const isNavigating = useNavigation().state !== 'idle';
  const devtools = getDevtoolsRegistry();

  return (
    <Box>
      {/* The page's single router blocker: asks the leave guards of the host and of every app (contract navigation). */}
      <PlatformLeaveBlocker platform={getHostPlatform()} />
      <LeaveDialog />
      {/* Persistent element: isolated from the page snapshot during route transitions. */}
      <Sheet component="header" variant="soft" sx={{ px: 2, py: 1.5, viewTransitionName: 'host-header' }}>
        <Stack direction="row" gap={2} alignItems="center">
          <Typography level="title-lg">Portal</Typography>
          <HostNavLink to="/">Home</HostNavLink>
          {getRemoteSections().map((section) => (
            <HostNavLink key={section.name} to={section.basePath}>
              {section.title}
            </HostNavLink>
          ))}
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
      {isDemoEnabled(getHostConfig().env) && <DemoPanel />}
      {devtools && <DevtoolsToolbar registry={devtools} extra={<RemotesInfo />} />}
    </Box>
  );
};

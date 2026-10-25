import type { QueryClient } from '@tanstack/react-query';
import { create } from 'axios';
import { attachPlatformAuth } from '@portal-poc/http';
import { createPortalQueryClient, createQueryDevtoolsMount } from '@portal-poc/platform-runtime';
import { devtoolsRegistry, getHostPlatform } from '../platform';
import { fakeHostFetch } from './fake-backend';

const HOST_BFF_SCOPES = ['api://host-bff/Host.Read'] as const;

/**
 * The host's own client to host-bff: axios bound to the host's login like every app's (`@portal-poc/http`). The host
 * platform is a module-level value already, so no binding. PoC: answered by the fake host-bff (axios' fetch adapter).
 */
export const hostHttp = attachPlatformAuth(create({ timeout: 15_000, adapter: 'fetch', env: { fetch: fakeHostFetch } }), {
  platform: getHostPlatform,
  target: () => ({ baseUrl: 'https://host-bff.local/api', scopes: HOST_BFF_SCOPES }),
  clientVersion: `host@${PORTAL_HOST_COMPAT.hostVersion}`,
});

let queryClient: QueryClient | null = null;

/** The host's OWN QueryClient (no shared cache with remotes). Registered in devtools once as `host`. */
export const getHostQueryClient = (): QueryClient => {
  if (!queryClient) {
    queryClient = createPortalQueryClient({ telemetry: getHostPlatform().telemetry });
    devtoolsRegistry?.registerPanel('host', createQueryDevtoolsMount(queryClient));
  }
  return queryClient;
};

import type { QueryClient } from '@tanstack/react-query';
import { createHttpClient, createPortalQueryClient, createQueryDevtoolsMount } from '@portal/platform-runtime';
import { devtoolsRegistry, getHostPlatform } from '../platform';
import { fakeHostFetch } from './fake-backend';

const HOST_BFF_SCOPES = ['api://host-bff/Host.Read'] as const;

let http: ReturnType<typeof createHttpClient> | null = null;

export const getHostHttp = () => {
  const platform = getHostPlatform();
  http ??= createHttpClient({
    baseUrl: 'https://host-bff.local/api',
    scopes: HOST_BFF_SCOPES,
    auth: platform.auth,
    telemetry: platform.telemetry,
    fetch: fakeHostFetch, // PoC: hard-coded backend
  });
  return http;
};

let queryClient: QueryClient | null = null;

/** The host's OWN QueryClient (no shared cache with remotes). Registered in devtools once as `host`. */
export const getHostQueryClient = (): QueryClient => {
  if (!queryClient) {
    queryClient = createPortalQueryClient({ telemetry: getHostPlatform().telemetry });
    devtoolsRegistry?.registerPanel('host', createQueryDevtoolsMount(queryClient));
  }
  return queryClient;
};

/// <reference types="vite/client" />
import type { HostCompat } from '@portal-poc/mf-shared';

declare global {
  /** Injected by the host build (vite.config.ts): versions this host provides to remotes, and its commit. */
  const PORTAL_HOST_COMPAT: HostCompat & { commit?: string };
}

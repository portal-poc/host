/// <reference types="vite/client" />
import type { HostCompat } from '@portal/mf-shared';

declare global {
  /** Injected by the host build (vite.config.ts): versions this host provides to remotes. */
  const PORTAL_HOST_COMPAT: HostCompat;
}

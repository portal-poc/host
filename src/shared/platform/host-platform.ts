import { PLATFORM_CONTRACT_VERSION } from '@portal/platform-contract';
import type { PlatformContract, PlatformLocale } from '@portal/platform-contract';
import {
  createConsoleTelemetry,
  createDevtoolsRegistry,
  createMockPlatformAuth,
  createPlatformEventBus,
  createRemoteAuth,
  isDevtoolsEnabled,
} from '@portal/platform-runtime';
import { getHostConfig, getRemoteConfig } from '../config';
import { DEMO_KEYS, readFlag } from './demo-flags';
import { telemetryLog } from './telemetry-log';

/**
 * ONE auth for the page (mock by default; `createMsalPlatformAuth(pca)` from '@portal/platform-runtime/msal' in real
 * setups — one PCA per app registration, interaction only here). Remotes get a per-remote allowlisted wrapper.
 */
export const hostAuth = createMockPlatformAuth({
  storageKey: 'portal.mockAuth.account',
  tokenTtlMs: Number(readFlag(DEMO_KEYS.tokenTtlMs) ?? 10 * 60 * 1000),
});

export const hostEvents = createPlatformEventBus();

export const devtoolsRegistry = isDevtoolsEnabled(import.meta.env.DEV) ? createDevtoolsRegistry() : null;

const locale: PlatformLocale = { language: 'en', subscribe: () => () => {} };

const createTelemetry = (app: string) => createConsoleTelemetry({ app, onRecord: telemetryLog.push });

let navigateToHost: (path: string) => void = (path) => {
  window.location.assign(path);
};

/** Wired by the router once it exists (bridge remotes navigate the host through the contract). */
export const setHostNavigate = (navigate: (path: string) => void) => {
  navigateToHost = navigate;
};

const buildBase = (app: string): Omit<PlatformContract, 'auth'> => ({
  contractVersion: PLATFORM_CONTRACT_VERSION,
  env: { name: getHostConfig().env, hostOrigin: window.location.origin },
  events: hostEvents,
  telemetry: createTelemetry(app),
  locale,
  ...(devtoolsRegistry ? { devtools: devtoolsRegistry } : {}),
});

let hostPlatform: PlatformContract | null = null;

/** The host's own platform object (its pages use the same runtime as remotes). */
export const getHostPlatform = (): PlatformContract => {
  hostPlatform ??= { ...buildBase('host'), auth: hostAuth };
  return hostPlatform;
};

const remotePlatforms = new Map<string, PlatformContract>();

/** Stable per remote + mode: the contract a remote receives as a prop. */
export const buildPlatformForRemote = (name: string, mode: 'integrated' | 'bridge'): PlatformContract => {
  const key = `${name}:${mode}`;
  const cached = remotePlatforms.get(key);
  if (cached) {
    return cached;
  }
  const remote = getRemoteConfig(name);
  const telemetry = createTelemetry(name);
  const platform: PlatformContract = {
    ...buildBase(name),
    telemetry,
    auth: createRemoteAuth(hostAuth, name, remote.scopes, { telemetry }),
    ...(mode === 'bridge'
      ? { bridge: { basename: remote.basePath, navigateToHost: (path: string) => navigateToHost(path) } }
      : {}),
  };
  remotePlatforms.set(key, platform);
  return platform;
};

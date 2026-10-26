import { PLATFORM_CONTRACT_VERSION } from '@portal-poc/platform-contract';
import type { PlatformContract, PlatformLocale } from '@portal-poc/platform-contract';
import type { DevtoolsRegistry } from '@portal-poc/platform-runtime';
import {
  createConsoleTelemetry,
  createDevtoolsRegistry,
  createLeaveGuards,
  createMockPlatformAuth,
  createPlatformEventBus,
  createRemoteAuth,
  isDevtoolsEnabled,
} from '@portal-poc/platform-runtime';
import { getHostConfig, getRemoteEntry } from '../config';
import { DEMO_KEYS, readFlag } from './demo-flags';
import { leaveDialog } from './leave-dialog';
import { pageTitles } from './page-titles';
import { telemetryLog } from './telemetry-log';

/**
 * ONE auth for the page (mock by default; `createMsalPlatformAuth(pca)` from '@portal-poc/platform-runtime/msal' in real
 * setups — one PCA per app registration, interaction only here). Remotes get a per-remote allowlisted wrapper.
 */
export const hostAuth = createMockPlatformAuth({
  storageKey: 'portal.mockAuth.account',
  tokenTtlMs: Number(readFlag(DEMO_KEYS.tokenTtlMs) ?? 10 * 60 * 1000),
});

const hostEvents = createPlatformEventBus();

/** One registry of leave guards for the page: the host's blocker and every own router (bridge apps) ask it. */
const hostNavigation = createLeaveGuards({ ask: leaveDialog.ask, notifyLocked: leaveDialog.notifyLocked });

/** A guard holds the page: a reload now would make the browser ask (and could be cancelled). */
export const hasLeaveGuards = (): boolean => hostNavigation.hasGuards();

/** Stands where the devtools toolbar is on by default: the developers' snapshot stand (the PoC shows it there). */
const DEVTOOLS_STANDS = new Set(['dev3']);

let devtoolsRegistry: DevtoolsRegistry | null | undefined;

/**
 * The devtools registry, or null where the toolbar is off: on by default on the dev server and on dev3, elsewhere
 * behind `?devtools=1` / `localStorage['portal.devtools'] = '1'`. Decided once, after the stand config is loaded.
 */
export const getDevtoolsRegistry = (): DevtoolsRegistry | null => {
  if (devtoolsRegistry === undefined) {
    const onByDefault = import.meta.env.DEV || DEVTOOLS_STANDS.has(getHostConfig().env);
    devtoolsRegistry = isDevtoolsEnabled(onByDefault) ? createDevtoolsRegistry() : null;
  }
  return devtoolsRegistry;
};

const locale: PlatformLocale = { language: 'en', subscribe: () => () => {} };

const createTelemetry = (app: string) => createConsoleTelemetry({ app, onRecord: telemetryLog.push });

let navigateToHost: (path: string) => void = (path) => {
  window.location.assign(path);
};

/** Wired by the router once it exists (bridge remotes navigate the host through the contract). */
export const setHostNavigate = (navigate: (path: string) => void) => {
  navigateToHost = navigate;
};

const buildBase = (app: string): Omit<PlatformContract, 'auth'> => {
  const devtools = getDevtoolsRegistry();
  return {
    contractVersion: PLATFORM_CONTRACT_VERSION,
    env: { name: getHostConfig().env, hostOrigin: window.location.origin },
    events: hostEvents,
    telemetry: createTelemetry(app),
    locale,
    navigation: hostNavigation,
    // Per app: the layout shows the title of the section on screen.
    document: { setTitle: (title) => pageTitles.set(app, title) },
    ...(devtools ? { devtools } : {}),
  };
};

let hostPlatform: PlatformContract | null = null;

/** The host's own platform object (its pages use the same runtime as remotes). */
export const getHostPlatform = (): PlatformContract => {
  hostPlatform ??= { ...buildBase('host'), auth: hostAuth };
  return hostPlatform;
};

const remotePlatforms = new Map<string, PlatformContract>();

/** Stable per remote + version + mode: the contract a remote receives as a prop. */
export const buildPlatformForRemote = (name: string, version: string, mode: 'integrated' | 'bridge'): PlatformContract => {
  const key = `${name}@${version}:${mode}`;
  const cached = remotePlatforms.get(key);
  if (cached) {
    return cached;
  }
  const remote = getRemoteEntry(name);
  // Every telemetry record carries the exact remote version that produced it.
  const telemetry = createTelemetry(`${name}@${version}`);
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

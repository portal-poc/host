import { createRemoteAppComponent } from '@module-federation/bridge-react/base';
import { loadRemote, registerRemotes } from '@module-federation/runtime';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { describeConflict, findSingletonConflicts, toBridgeRemoteName } from '@portal/mf-shared';
import type { ManifestSharedEntry } from '@portal/mf-shared';
import type { PlatformContract } from '@portal/platform-contract';
import { isContractVersionSupported, isSameReactInstance } from '@portal/platform-runtime';
import type { ContractVersionRange } from '@portal/platform-runtime';
import { SpinnerFallback } from '@portal/ds';
import { getRemoteEntry, getRemoteNames } from '../config';
import type { RemoteEntry } from '../config';
import { DEMO_KEYS, readFlag } from '../platform';
import { attachToRemoteDevServer } from './dev-server';
import { remoteStatusStore } from './remote-status';

export type RemoteProps = { platform: PlatformContract; basename?: string };

export type LoadedRemote = {
  mode: 'integrated' | 'bridge';
  version: string;
  Component: ComponentType<RemoteProps>;
};

class IncompatibleRemoteError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'IncompatibleRemoteError';
  }
}

/** Main builds are registered up front; bridge variants only when needed. URLs come from the stand registry. */
export const registerConfiguredRemotes = () => {
  registerRemotes(getRemoteNames().map((name) => ({ name, entry: getRemoteEntry(name).manifest, type: 'module' })));
};

type RemoteRuntimeModule = { remoteCreateElement?: unknown; contractVersion?: unknown };

const loadModule = async <T,>(id: string): Promise<T> => {
  const module = await loadRemote<T>(id);
  if (!module) {
    throw new Error(`Module "${id}" could not be loaded.`);
  }
  return module;
};

const readManifestShared = async (url: string): Promise<ManifestSharedEntry[]> => {
  const response = await fetch(url, { cache: 'no-cache' });
  if (!response.ok) {
    throw new Error(`Manifest ${url} → HTTP ${response.status}${url.includes('localhost') ? ' (is the dev server running?)' : ''}`);
  }
  const manifest: { shared?: ManifestSharedEntry[] } = await response.json();
  return manifest.shared ?? [];
};

const getSupportedRange = (): ContractVersionRange =>
  readFlag(DEMO_KEYS.incompatibleContract) === '1' ? { min: 2, max: 2 } : PORTAL_HOST_COMPAT.contract;

const assertContract = (name: string, runtime: RemoteRuntimeModule) => {
  const range = getSupportedRange();
  if (!isContractVersionSupported(runtime.contractVersion, range)) {
    throw new IncompatibleRemoteError(
      `Remote "${name}" implements platform contract v${String(runtime.contractVersion)}, the host supports ` +
        `v${range.min}–v${range.max}. Align @portal/platform-contract between the host and the remote.`,
    );
  }
};

const BridgeError = ({ error }: { error: Error }) => createElement('pre', null, error.message);

const createBridgeComponent = (moduleName: string): ComponentType<RemoteProps> =>
  createRemoteAppComponent({
    loader: () => loadModule(`${moduleName}/RemoteBridge`),
    loading: createElement(SpinnerFallback),
    fallback: BridgeError,
  });

/** Isolated variant of the same version (own React/router/DS), published as `<version>/bridge/`. */
const loadBridgeVariant = async (name: string, entry: RemoteEntry, reason: string): Promise<LoadedRemote> => {
  if (!entry.bridgeManifest) {
    throw new IncompatibleRemoteError(`Remote "${name}@${entry.version}" is incompatible with this host and has no bridge build: ${reason}`);
  }
  const bridgeName = toBridgeRemoteName(name);
  registerRemotes([{ name: bridgeName, entry: entry.bridgeManifest, type: 'module' }]);
  assertContract(name, await loadModule<RemoteRuntimeModule>(`${bridgeName}/runtime`));
  return { mode: 'bridge', version: entry.version, Component: createBridgeComponent(bridgeName) };
};

const resolveRemote = async (name: string, entry: RemoteEntry): Promise<LoadedRemote> => {
  if (entry.devServer) {
    await attachToRemoteDevServer(new URL(entry.manifest).origin);
  }
  // 1. Before executing any remote code: do the remote's singleton requirements match what this host provides?
  //    (MF `singleton: true` would silently hand the remote the host's copy anyway.)
  const conflicts = findSingletonConflicts(await readManifestShared(entry.manifest), PORTAL_HOST_COMPAT.singletons);
  if (conflicts.length > 0) {
    return loadBridgeVariant(name, entry, conflicts.map(describeConflict).join('; '));
  }
  if (readFlag(DEMO_KEYS.forceBridge) === name) {
    return loadBridgeVariant(name, entry, 'forced by the demo panel');
  }
  // 2. Tiny `./runtime`: contract version + React identity (a remote that shares nothing, like legacy, differs).
  const runtime = await loadModule<RemoteRuntimeModule>(`${name}/runtime`);
  assertContract(name, runtime);
  if (!isSameReactInstance(runtime.remoteCreateElement)) {
    return { mode: 'bridge', version: entry.version, Component: createBridgeComponent(name) };
  }
  const module = await loadModule<{ default: ComponentType<RemoteProps> }>(`${name}/RemoteRoot`);
  return { mode: 'integrated', version: entry.version, Component: module.default };
};

export const loadRemoteEntry = async (name: string): Promise<LoadedRemote> => {
  const entry = getRemoteEntry(name);
  try {
    const loaded = await resolveRemote(name, entry);
    remoteStatusStore.set({ name, version: entry.version, source: entry.source, mode: loaded.mode });
    return loaded;
  } catch (error) {
    remoteStatusStore.set({ name, version: entry.version, source: entry.source, mode: 'error', detail: String(error) });
    throw error;
  }
};

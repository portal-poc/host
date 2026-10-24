import { createRemoteAppComponent } from '@module-federation/bridge-react/base';
import { loadRemote, registerRemotes } from '@module-federation/runtime';
import { createElement } from 'react';
import type { ComponentType } from 'react';
import { SUPPORTED_CONTRACT_VERSIONS } from '@portal/mf-shared';
import type { PlatformContract } from '@portal/platform-contract';
import { isContractVersionSupported, isSameReactInstance } from '@portal/platform-runtime';
import type { ContractVersionRange } from '@portal/platform-runtime';
import { SpinnerFallback } from '@portal/ds';
import { getHostConfig } from '../config';
import { DEMO_KEYS, readFlag } from '../platform';

export type RemoteProps = { platform: PlatformContract; basename?: string };

export type LoadedRemote = {
  mode: 'integrated' | 'bridge';
  Component: ComponentType<RemoteProps>;
};

class IncompatibleRemoteError extends Error {
  constructor(name: string, version: unknown, range: ContractVersionRange) {
    super(
      `Remote "${name}" implements platform contract v${String(version)}, the host supports ` +
        `v${range.min}–v${range.max}. Align @portal/platform-contract between the host and the remote.`,
    );
    this.name = 'IncompatibleRemoteError';
  }
}

/** Registers remotes from the runtime config (no URLs baked into the host build). */
export const registerConfiguredRemotes = () => {
  registerRemotes(
    Object.entries(getHostConfig().remotes).map(([name, remote]) => ({ name, entry: remote.entry, type: 'module' })),
  );
};

type RemoteRuntimeModule = { remoteCreateElement?: unknown; contractVersion?: unknown };

const loadModule = async <T,>(id: string): Promise<T> => {
  const module = await loadRemote<T>(id);
  if (!module) {
    throw new Error(`Module "${id}" could not be loaded.`);
  }
  return module;
};

const getSupportedRange = (): ContractVersionRange =>
  readFlag(DEMO_KEYS.incompatibleContract) === '1' ? { min: 2, max: 2 } : SUPPORTED_CONTRACT_VERSIONS;

const isBridgeForced = (name: string) => readFlag(DEMO_KEYS.forceBridge) === name;

const BridgeError = ({ error }: { error: Error }) => createElement('pre', null, error.message);

const loadBridge = (name: string): LoadedRemote => ({
  mode: 'bridge',
  Component: createRemoteAppComponent({
    loader: () => loadModule(`${name}/RemoteBridge`),
    loading: createElement(SpinnerFallback),
    fallback: BridgeError,
  }),
});

/**
 * Dual entry: `./runtime` is tiny. Same React instance (compared BY REFERENCE) → integrated mode (shared tree:
 * transitions, Suspense, context, ViewTransition cross the boundary). Otherwise → MF Bridge (own root).
 */
export const loadRemoteEntry = async (name: string): Promise<LoadedRemote> => {
  const runtime = await loadModule<RemoteRuntimeModule>(`${name}/runtime`);
  const supportedRange = getSupportedRange();
  if (!isContractVersionSupported(runtime.contractVersion, supportedRange)) {
    throw new IncompatibleRemoteError(name, runtime.contractVersion, supportedRange);
  }
  if (!isSameReactInstance(runtime.remoteCreateElement) || isBridgeForced(name)) {
    return loadBridge(name);
  }
  const module = await loadModule<{ default: ComponentType<RemoteProps> }>(`${name}/RemoteRoot`);
  return { mode: 'integrated', Component: module.default };
};

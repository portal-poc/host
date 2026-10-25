import { use } from 'react';
import { AsyncBoundary } from '@portal-poc/ds';
import { isStaleBuildError, reloadForStaleBuild } from '@portal-poc/platform-runtime';
import { getRemoteEntry } from '../config';
import { buildPlatformForRemote } from '../platform';
import { loadRemoteEntry } from './load-remote-entry';
import type { LoadedRemote } from './load-remote-entry';

const entries = new Map<string, Promise<LoadedRemote>>();

/** Never settles: the page is reloading. */
const RELOADING = new Promise<never>(() => {});

/**
 * A chunk of the remote is gone (this tab runs an earlier build that has been cleaned up): reload instead of showing
 * an error. A second failure right after the reload is a real one and reaches the boundary.
 */
const recoverStaleBuild = (error: unknown): Promise<never> => {
  if (isStaleBuildError(error) && reloadForStaleBuild()) {
    return RELOADING;
  }
  throw error;
};

const getEntry = (name: string) => {
  let entry = entries.get(name);
  if (!entry) {
    entry = loadRemoteEntry(name).catch(recoverStaleBuild);
    entries.set(name, entry);
  }
  return entry;
};

const RemoteAppContent = ({ name }: { name: string }) => {
  const { mode, version, Component } = use(getEntry(name));
  return <Component platform={buildPlatformForRemote(name, version, mode)} basename={getRemoteEntry(name).basePath} />;
};

/**
 * One host component hides integrated/bridge differences. Loading errors (dev server down, 404, incompatible
 * versions or contract) end up in AsyncBoundary with retry — the host keeps working.
 */
export const RemoteApp = ({ name }: { name: string }) => {
  const forgetEntry = () => {
    entries.delete(name);
  };
  return (
    <AsyncBoundary onReset={forgetEntry}>
      <RemoteAppContent name={name} />
    </AsyncBoundary>
  );
};

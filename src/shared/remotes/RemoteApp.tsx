import { use } from 'react';
import { AsyncBoundary } from '@portal/ds';
import { getRemoteConfig } from '../config';
import { buildPlatformForRemote } from '../platform';
import { loadRemoteEntry } from './load-remote-entry';
import type { LoadedRemote } from './load-remote-entry';

const entries = new Map<string, Promise<LoadedRemote>>();

const getEntry = (name: string) => {
  let entry = entries.get(name);
  if (!entry) {
    entry = loadRemoteEntry(name);
    entries.set(name, entry);
  }
  return entry;
};

const RemoteAppContent = ({ name }: { name: string }) => {
  const { mode, Component } = use(getEntry(name));
  return <Component platform={buildPlatformForRemote(name, mode)} basename={getRemoteConfig(name).basePath} />;
};

/**
 * One host component hides the integrated/bridge difference. Loading errors (network, 404 remoteEntry,
 * incompatible contract) end up in AsyncBoundary with retry — the host keeps working.
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

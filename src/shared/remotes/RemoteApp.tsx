import { use } from 'react';
import { AsyncBoundary } from '@portal-poc/ds';
import { getRemoteEntry } from '../config';
import { buildPlatformForRemote } from '../platform';
import { forgetEntry, getRenderedEntry } from './remote-entries';

const RemoteAppContent = ({ name }: { name: string }) => {
  const { mode, version, Component } = use(getRenderedEntry(name));
  return <Component platform={buildPlatformForRemote(name, version, mode)} basename={getRemoteEntry(name).basePath} />;
};

/**
 * One host component hides integrated/bridge differences. Loading errors (dev server down, 404, incompatible
 * versions or contract) end up in AsyncBoundary with retry — the host keeps working.
 */
export const RemoteApp = ({ name }: { name: string }) => {
  const retry = () => {
    forgetEntry(name);
  };
  return (
    <AsyncBoundary onReset={retry}>
      <RemoteAppContent name={name} />
    </AsyncBoundary>
  );
};

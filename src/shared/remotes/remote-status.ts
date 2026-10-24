type RemoteStatus = {
  name: string;
  version: string;
  source: 'registry' | 'local';
  mode: 'integrated' | 'bridge' | 'error';
  detail?: string;
};

let statuses: readonly RemoteStatus[] = [];
const listeners = new Set<() => void>();

/** What actually got loaded (shown in the devtools toolbar — "where does this remote come from?"). */
export const remoteStatusStore = {
  set: (status: RemoteStatus) => {
    statuses = [...statuses.filter((item) => item.name !== status.name), status];
    for (const listener of listeners) {
      listener();
    }
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => statuses,
};

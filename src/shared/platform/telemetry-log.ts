import type { TelemetryRecord } from '@portal-poc/platform-runtime';

const MAX_RECORDS = 5;
let records: readonly TelemetryRecord[] = [];
const listeners = new Set<() => void>();

/** In-memory sink so the demo panel can show the latest telemetry errors (e.g. scope allowlist violations). */
export const telemetryLog = {
  push: (record: TelemetryRecord) => {
    if (record.kind !== 'error') {
      return;
    }
    records = [record, ...records].slice(0, MAX_RECORDS);
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
  getSnapshot: () => records,
};

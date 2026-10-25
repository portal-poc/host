import type { PlatformLeaveGuard } from '@portal-poc/platform-contract';

type LeaveDialogState = {
  /** A navigation waits for "leave / stay" (a guard without its own dialog). */
  asking: { message: string; pathname: string; resolve: (leave: boolean) => void } | null;
  /** A lock guard refused a navigation: shown as a notice. */
  locked: { message: string; at: number } | null;
};

let state: LeaveDialogState = { asking: null, locked: null };
const listeners = new Set<() => void>();

const update = (next: Partial<LeaveDialogState>) => {
  state = { ...state, ...next };
  for (const listener of listeners) {
    listener();
  }
};

/** What the host's leave guards show: one dialog and one lock notice for every app on the page. */
export const leaveDialog = {
  ask: (guard: PlatformLeaveGuard, pathname: string) =>
    new Promise<boolean>((resolve) => {
      update({ asking: { message: guard.message, pathname, resolve } });
    }),
  answer: (leave: boolean) => {
    state.asking?.resolve(leave);
    update({ asking: null });
  },
  notifyLocked: (message: string) => {
    update({ locked: { message, at: Date.now() } });
  },
  dismissLocked: () => {
    update({ locked: null });
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => state,
};

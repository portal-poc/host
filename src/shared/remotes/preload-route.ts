import { loadRemote } from '@module-federation/runtime';
import { useEffect, useRef } from 'react';
import type { PlatformContract } from '@portal-poc/platform-contract';
import { getRemoteSections } from '../config';
import { buildPlatformForRemote, hostAuth } from '../platform';
import { loadEntry } from './remote-entries';

/** A remote's `./preload`: prefetch what the page at `path` (inside the remote) shows first. Must not throw. */
type RemotePreloadModule = { preload?: (platform: PlatformContract, params: { path: string }) => Promise<void> };

const INTENT_DELAY_MS = 100;
/** One preload per target in this window: a hover over the same link again does not repeat the work. */
const REPEAT_AFTER_MS = 30_000;
const recent = new Map<string, number>();

const targetOf = (to: string) => {
  const section = getRemoteSections().find((candidate) => to === candidate.basePath || to.startsWith(`${candidate.basePath}/`));
  return section ? { name: section.name, path: to.slice(section.basePath.length) || '/' } : null;
};

const isDataSaver = () => (navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData === true;

/**
 * Warms a remote route before the click: the remote's code (the same load RemoteApp renders, compatibility checks
 * included) and, for an integrated remote, the data of the target page through its `./preload` — into the very
 * QueryClient its RemoteRoot uses. Bridge remotes get the code only (their QueryClient lives in their own build).
 * Never throws: a failed preload costs nothing, the click loads as usual and shows any error there.
 */
export const preloadRoute = async (to: string): Promise<void> => {
  const target = targetOf(to);
  if (!target || isDataSaver() || !hostAuth.getAccount()) {
    return;
  }
  const key = `${target.name}:${target.path}`;
  if (Date.now() - (recent.get(key) ?? 0) < REPEAT_AFTER_MS) {
    return;
  }
  recent.set(key, Date.now());
  try {
    const { mode, version } = await loadEntry(target.name);
    if (mode !== 'integrated') {
      return;
    }
    const module = await loadRemote<RemotePreloadModule>(`${target.name}/preload`);
    await module?.preload?.(buildPlatformForRemote(target.name, version, mode), { path: target.path });
  } catch {
    recent.delete(key);
  }
};

/** Pointer resting on a link (not just passing over it), keyboard focus, or a touch: the user is about to go there. */
export const usePreloadIntent = (to: string) => {
  const timer = useRef<number | undefined>(undefined);
  const cancel = () => {
    window.clearTimeout(timer.current);
  };
  const start = () => {
    cancel();
    timer.current = window.setTimeout(() => void preloadRoute(to), INTENT_DELAY_MS);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  return {
    onPointerEnter: start,
    onPointerLeave: cancel,
    onFocus: start,
    onBlur: cancel,
    onTouchStart: () => void preloadRoute(to),
  };
};

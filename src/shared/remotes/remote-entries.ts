import { isStaleBuildError, reloadForStaleBuild } from '@portal-poc/platform-runtime';
import { loadRemoteEntry } from './load-remote-entry';
import type { LoadedRemote } from './load-remote-entry';

/** One load per remote for the page: preload (hover) and RemoteApp (render) share it. */
const loads = new Map<string, Promise<LoadedRemote>>();
/** What RemoteApp renders from: the same load, with the stale-build recovery on top. */
const rendered = new Map<string, Promise<LoadedRemote>>();

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

/** The remote's load (manifest, compatibility checks, module): started by a preload or the first render. */
export const loadEntry = (name: string): Promise<LoadedRemote> => {
  let load = loads.get(name);
  if (!load) {
    load = loadRemoteEntry(name);
    loads.set(name, load);
  }
  return load;
};

/** For rendering: only a click/render may reload the page, never a hover. */
export const getRenderedEntry = (name: string): Promise<LoadedRemote> => {
  let entry = rendered.get(name);
  if (!entry) {
    entry = loadEntry(name).catch(recoverStaleBuild);
    rendered.set(name, entry);
  }
  return entry;
};

/** Retry after an error: the next render loads again. */
export const forgetEntry = (name: string): void => {
  loads.delete(name);
  rendered.delete(name);
};

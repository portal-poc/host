import { z } from 'zod';

const remoteEntrySchema = z.object({
  version: z.string(),
  manifest: z.url(),
  bridgeManifest: z.url().optional(),
  basePath: z.string().startsWith('/'),
  scopes: z.array(z.string()),
  devServer: z.boolean().optional(),
});

/** `/config.json` of the stand = the registry entries for this stand (built by the config deploy job). */
const hostConfigSchema = z.object({
  env: z.string(),
  allowOverrides: z.boolean(),
  remotes: z.record(z.string(), remoteEntrySchema),
});

export type HostConfig = z.output<typeof hostConfigSchema>;
export type RemoteEntry = z.output<typeof remoteEntrySchema> & { source: 'registry' | 'override' };

const OVERRIDES_KEY = 'portal.remoteOverrides';
const OVERRIDE_PARAM = /^remote\.([a-z][a-z0-9]*)$/;

let hostConfig: HostConfig | null = null;
let overrides: Record<string, string> = {};

const readStoredOverrides = (): Record<string, string> => {
  try {
    const parsed: unknown = JSON.parse(sessionStorage.getItem(OVERRIDES_KEY) ?? '{}');
    return typeof parsed === 'object' && parsed !== null ? (parsed as Record<string, string>) : {};
  } catch {
    return {};
  }
};

/**
 * DX: `?remote.tasks=http://localhost:5174/mf-manifest.json` loads a local dev server into this stand's host
 * (kept for the browser session; `?remote.tasks=` clears it). Only on stands with `allowOverrides` (never prod);
 * the stand CSP still limits where code may come from.
 */
const collectOverrides = (allowOverrides: boolean): Record<string, string> => {
  if (!allowOverrides) {
    return {};
  }
  const next = readStoredOverrides();
  for (const [key, value] of new URLSearchParams(window.location.search)) {
    const name = OVERRIDE_PARAM.exec(key)?.[1];
    if (name && value) {
      next[name] = value;
    } else if (name) {
      delete next[name];
    }
  }
  try {
    sessionStorage.setItem(OVERRIDES_KEY, JSON.stringify(next));
  } catch {
    // ignore: overrides then last only for this page load
  }
  return next;
};

/** Runtime config (one host build → any stand). Loaded once in main.tsx before rendering. */
export const loadHostConfig = async (): Promise<HostConfig> => {
  const response = await fetch('/config.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`/config.json → HTTP ${response.status}. Is the stand config deployed (pnpm infra / registry build)?`);
  }
  hostConfig = hostConfigSchema.parse(await response.json());
  overrides = collectOverrides(hostConfig.allowOverrides);
  return hostConfig;
};

export const getHostConfig = (): HostConfig => {
  if (!hostConfig) {
    throw new Error('Host config is not loaded yet.');
  }
  return hostConfig;
};

/** Registry entry with the developer override applied (an override drops the bridge variant). */
export const getRemoteEntry = (name: string): RemoteEntry => {
  const entry = getHostConfig().remotes[name];
  if (!entry) {
    throw new Error(`Remote "${name}" is not registered on stand "${getHostConfig().env}".`);
  }
  const override = overrides[name];
  if (override) {
    return {
      version: 'local override',
      manifest: override,
      basePath: entry.basePath,
      scopes: entry.scopes,
      devServer: true,
      source: 'override',
    };
  }
  return { ...entry, source: 'registry' };
};

export const getRemoteNames = (): string[] => Object.keys(getHostConfig().remotes);

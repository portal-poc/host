import { z } from 'zod';

const remoteEntrySchema = z.object({
  version: z.string(),
  manifest: z.url(),
  bridgeManifest: z.url().optional(),
  basePath: z.string().startsWith('/'),
  scopes: z.array(z.string()),
  /** Served by a local Vite dev server (developer's .env.development.local or the local stand). */
  devServer: z.boolean().optional(),
});

/** `/config.json` of the stand = the registry entries for this stand (built by the config deploy job). */
const hostConfigSchema = z.object({
  env: z.string(),
  remotes: z.record(z.string(), remoteEntrySchema),
});

export type HostConfig = z.output<typeof hostConfigSchema>;
export type RemoteEntry = z.output<typeof remoteEntrySchema>;

let hostConfig: HostConfig | null = null;

/** Runtime config (one host build → any stand). Loaded once in main.tsx before rendering. */
export const loadHostConfig = async (): Promise<HostConfig> => {
  const response = await fetch('/config.json', { cache: 'no-store' });
  if (!response.ok) {
    throw new Error(`/config.json → HTTP ${response.status}: ${await response.text()}`);
  }
  hostConfig = hostConfigSchema.parse(await response.json());
  return hostConfig;
};

export const getHostConfig = (): HostConfig => {
  if (!hostConfig) {
    throw new Error('Host config is not loaded yet.');
  }
  return hostConfig;
};

export const getRemoteEntry = (name: string): RemoteEntry => {
  const entry = getHostConfig().remotes[name];
  if (!entry) {
    throw new Error(`Remote "${name}" is not registered on stand "${getHostConfig().env}".`);
  }
  return entry;
};

export const getRemoteNames = (): string[] => Object.keys(getHostConfig().remotes);

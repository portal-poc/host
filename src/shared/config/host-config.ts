import { z } from 'zod';

const hostConfigSchema = z.object({
  env: z.string(),
  remotes: z.record(
    z.string(),
    z.object({ entry: z.url(), basePath: z.string().startsWith('/'), scopes: z.array(z.string()) }),
  ),
});

export type HostConfig = z.output<typeof hostConfigSchema>;
export type RemoteConfig = HostConfig['remotes'][string];

let hostConfig: HostConfig | null = null;

/** Runtime config (one build → any stand). Loaded once in main.tsx before rendering. */
export const loadHostConfig = async (): Promise<HostConfig> => {
  const response = await fetch('/config.json');
  hostConfig = hostConfigSchema.parse(await response.json());
  return hostConfig;
};

export const getHostConfig = (): HostConfig => {
  if (!hostConfig) {
    throw new Error('Host config is not loaded yet.');
  }
  return hostConfig;
};

export const getRemoteConfig = (name: string): RemoteConfig => {
  const remote = getHostConfig().remotes[name];
  if (!remote) {
    throw new Error(`Unknown remote "${name}"`);
  }
  return remote;
};

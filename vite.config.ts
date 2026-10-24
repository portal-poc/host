import { readFileSync } from 'node:fs';
import { SINGLETONS, SUPPORTED_BUILD_TOOLING, SUPPORTED_CONTRACT_VERSIONS } from '@portal-poc/mf-shared';
import type { HostCompat } from '@portal-poc/mf-shared';
import { createHostViteConfig } from '@portal-poc/vite-config';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';
import { NO_STAND, parseDevEnv } from './build/dev-env.ts';
import type { DevEnv } from './build/dev-env.ts';

const PORT = 5173;
const appDir = new URL('.', import.meta.url).pathname;

// ---------- compat.json: what this host build provides ----------

const readVersion = (packageJsonUrl: URL): string => {
  const pkg: { version: string } = JSON.parse(readFileSync(packageJsonUrl, 'utf8'));
  return pkg.version;
};

/** `react-router/dom` → `react-router`, `@scope/pkg/sub` → `@scope/pkg`: subpaths carry the root package version. */
const packageNameOf = (specifier: string): string =>
  specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/');

const hostCompat: HostCompat = {
  hostVersion: readVersion(new URL('./package.json', import.meta.url)),
  contract: SUPPORTED_CONTRACT_VERSIONS,
  singletons: Object.fromEntries(
    Object.keys(SINGLETONS).map((name) => [name, readVersion(new URL(`./node_modules/${packageNameOf(name)}/package.json`, import.meta.url))]),
  ),
  remoteTooling: { mfPlugin: SUPPORTED_BUILD_TOOLING.mfPlugin },
};

/** Publishes compat.json with every host build (release gate input) and embeds it for the runtime manifest check. */
const hostCompatPlugin = (): Plugin => ({
  name: 'portal-host-compat',
  config: () => ({ define: { PORTAL_HOST_COMPAT: JSON.stringify(hostCompat) } }),
  generateBundle() {
    this.emitFile({ type: 'asset', fileName: 'compat.json', source: `${JSON.stringify(hostCompat, null, 2)}\n` });
  },
  configureServer(server) {
    server.middlewares.use('/compat.json', (_request, response) => {
      response.setHeader('Content-Type', 'application/json');
      response.end(JSON.stringify(hostCompat));
    });
  },
});

// ---------- local development: a deployed stand + the remotes I run, from my dev env ----------

/**
 * `.env.development.local` (not committed) — the only place local development is described; the registry knows
 * nothing about developer machines:
 *   PORTAL_STAND=dev3                                             # base config: a deployed stand, or `none`
 *   PORTAL_REMOTE_TASKS=http://localhost:5174/mf-manifest.json    # remotes I run locally (registered or not)
 *   PORTAL_REMOTE_REPORTS=http://localhost:5176/mf-manifest.json  # a new remote works before its first release
 * Only the local dev server does this; deployed hosts read the stand's /config.json and accept no overrides.
 */
/** Remote config environment when nothing is deployed underneath (`PORTAL_STAND=none`). */
const LOCAL_ENV = 'local';

type StandConfig = { env: string; remotes: Record<string, Record<string, unknown>> };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

const isStandConfig = (value: unknown): value is StandConfig =>
  isRecord(value) && typeof value['env'] === 'string' && isRecord(value['remotes']);

const fetchStandConfig = async ({ stand, infraUrl }: DevEnv): Promise<StandConfig> => {
  if (stand === NO_STAND) {
    return { env: LOCAL_ENV, remotes: {} };
  }
  const response = await fetch(`${infraUrl}/stands/${stand}/config.json`).catch(() => null);
  if (!response) {
    throw new Error(`Infra is not running at ${infraUrl}: start \`pnpm infra\` in platform, or set PORTAL_STAND=none.`);
  }
  if (!response.ok) {
    const known = await fetch(`${infraUrl}/stands.json`)
      .then((list) => list.json() as Promise<string[]>)
      .catch(() => []);
    throw new Error(`PORTAL_STAND=${stand}: no such deployed stand (known: ${[...known, NO_STAND].join(', ')}).`);
  }
  const config: unknown = await response.json();
  if (!isStandConfig(config)) {
    throw new Error(`Stand "${stand}" config has an unexpected shape.`);
  }
  return config;
};

/** A remote not registered on the stand yet: route = its name, scopes from its own config.json (dev server). */
const describeUnregisteredRemote = async (name: string, manifest: string, env: string) => {
  // Not every remote has one (legacy); a dev server then answers with its index.html.
  const config: unknown = await fetch(new URL('config.json', manifest))
    .then((response) => response.json())
    .catch(() => null);
  const environments = isRecord(config) && isRecord(config['environments']) ? config['environments'] : {};
  const environment = environments[env] ?? environments[LOCAL_ENV];
  const scopes = isRecord(environment) && Array.isArray(environment['scopes']) ? environment['scopes'] : [];
  return { basePath: `/${name}`, scopes };
};

const buildDevConfig = async (devEnv: DevEnv, warn: (message: string) => void): Promise<StandConfig> => {
  const config = await fetchStandConfig(devEnv);
  const registered = Object.keys(config.remotes).join(', ') || 'nothing';
  for (const [name, manifest] of Object.entries(devEnv.remotes)) {
    let entry = config.remotes[name];
    if (!entry) {
      warn(`"${name}" is not registered on ${devEnv.stand} (registered: ${registered}): added as a new remote at /${name}.`);
      entry = await describeUnregisteredRemote(name, manifest, config.env);
    }
    config.remotes[name] = { ...entry, version: 'local', manifest, devServer: true, bridgeManifest: undefined };
  }
  return config;
};

const devConfigPlugin = (): Plugin => ({
  name: 'portal-dev-config',
  apply: 'serve',
  configureServer(server) {
    // Shell variables override the file. Validated once at start: a typo stops the dev server with the offending key.
    const devEnv = parseDevEnv({ ...loadEnv('development', appDir, 'PORTAL_'), ...process.env });
    const warned = new Set<string>();
    const warnOnce = (message: string) => {
      if (!warned.has(message)) {
        warned.add(message);
        server.config.logger.warn(`[portal] ${message}`);
      }
    };
    server.middlewares.use('/config.json', (_request, response) => {
      buildDevConfig(devEnv, warnOnce)
        .then((config) => {
          response.setHeader('Content-Type', 'application/json');
          response.end(JSON.stringify(config));
        })
        .catch((error: unknown) => {
          response.statusCode = 502;
          response.end(String(error));
        });
    });
  },
});

/**
 * Remotes on their own dev servers bring a second React Refresh runtime, which finds React DOM only through
 * `hook.renderers`. Without the DevTools extension nothing fills that map, so create a recording hook before anything
 * else runs (MF host init loads React DOM before the app entry). Gives real Fast Refresh of local remotes.
 */
const RECORDING_DEVTOOLS_HOOK = `if (!window.__REACT_DEVTOOLS_GLOBAL_HOOK__) {
  let nextId = 0;
  window.__REACT_DEVTOOLS_GLOBAL_HOOK__ = {
    renderers: new Map(),
    supportsFiber: true,
    inject(renderer) { const id = nextId++; this.renderers.set(id, renderer); return id; },
    onScheduleFiberRoot() {},
    onCommitFiberRoot() {},
    onCommitFiberUnmount() {},
  };
}`;

const devRefreshHookPlugin = (): Plugin => ({
  name: 'portal-dev-refresh-hook',
  apply: 'serve',
  transformIndexHtml: () => [{ tag: 'script', injectTo: 'head-prepend', children: RECORDING_DEVTOOLS_HOOK }],
});

/** Dev CSP: remotes come from local dev servers and the local Nexus stand-in. Stands set their own (one origin). */
const devContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' http://localhost:*",
  "connect-src 'self' http://localhost:* ws://localhost:*",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
].join('; ');

export default createHostViteConfig({
  port: PORT,
  configUrl: import.meta.url,
  plugins: [hostCompatPlugin(), devConfigPlugin(), devRefreshHookPlugin()],
  extend: {
    server: { strictPort: true, headers: { 'Content-Security-Policy': devContentSecurityPolicy } },
    preview: { headers: { 'Content-Security-Policy': devContentSecurityPolicy } },
  },
});

import { readFileSync } from 'node:fs';
import { SINGLETONS, SUPPORTED_BUILD_TOOLING, SUPPORTED_CONTRACT_VERSIONS } from '@portal/mf-shared';
import type { HostCompat } from '@portal/mf-shared';
import { createHostViteConfig } from '@portal/vite-config';
import { loadEnv } from 'vite';
import type { Plugin } from 'vite';

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

// ---------- local development: stand config + developer overrides from the dev env ----------

/**
 * `.env.development.local` (not committed):
 *   PORTAL_STAND=uat                                            # where "everything else" comes from (default: local)
 *   PORTAL_REMOTE_TASKS=http://localhost:5174/mf-manifest.json  # remotes I run locally
 * Only the local dev server does this; deployed hosts read the stand's /config.json and accept no overrides.
 */
const devEnv = { ...loadEnv('development', appDir, 'PORTAL_'), ...process.env };
const STAND = devEnv['PORTAL_STAND'] ?? 'local';
const INFRA_URL = devEnv['PORTAL_INFRA_URL'] ?? 'http://localhost:4400';

const localRemotes = Object.fromEntries(
  Object.entries(devEnv).flatMap(([key, value]) => {
    const name = /^PORTAL_REMOTE_([A-Z0-9_]+)$/.exec(key)?.[1];
    return name && value ? [[name.toLowerCase(), value]] : [];
  }),
);

type StandConfig = { env: string; remotes: Record<string, Record<string, unknown>> };

const isStandConfig = (value: unknown): value is StandConfig =>
  typeof value === 'object' && value !== null && 'remotes' in value && typeof value.remotes === 'object' && value.remotes !== null;

const buildDevConfig = async (): Promise<StandConfig> => {
  const response = await fetch(`${INFRA_URL}/stands/${STAND}/config.json`);
  if (!response.ok) {
    throw new Error(`Stand "${STAND}" config not reachable at ${INFRA_URL} (HTTP ${response.status}). Run \`pnpm infra\`.`);
  }
  const stand: unknown = await response.json();
  if (!isStandConfig(stand)) {
    throw new Error(`Stand "${STAND}" config has an unexpected shape.`);
  }
  for (const [name, manifest] of Object.entries(localRemotes)) {
    const registered = stand.remotes[name];
    if (!registered) {
      throw new Error(`PORTAL_REMOTE_${name.toUpperCase()}: remote "${name}" is not registered on stand "${STAND}".`);
    }
    stand.remotes[name] = { ...registered, version: 'local', manifest, devServer: true, bridgeManifest: undefined };
  }
  return stand;
};

const devConfigPlugin = (): Plugin => ({
  name: 'portal-dev-config',
  apply: 'serve',
  configureServer(server) {
    server.middlewares.use('/config.json', (_request, response) => {
      buildDevConfig()
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

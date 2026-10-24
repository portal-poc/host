import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import babel from '@rolldown/plugin-babel';
import { federation } from '@module-federation/vite';
import { createSharedConfig, SINGLETONS, SUPPORTED_CONTRACT_VERSIONS } from '@portal/mf-shared';
import type { HostCompat } from '@portal/mf-shared';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import type { Plugin } from 'vite';

const PORT = 5173;
const STAND = process.env['PORTAL_STAND'] ?? 'local';
const INFRA_URL = process.env['PORTAL_INFRA_URL'] ?? 'http://localhost:4400';

const readVersion = (packageJsonUrl: URL): string => {
  const pkg: { version: string } = JSON.parse(readFileSync(packageJsonUrl, 'utf8'));
  return pkg.version;
};

/** `react-router/dom` → `react-router`, `@scope/pkg/sub` → `@scope/pkg`: subpaths carry the root package version. */
const packageNameOf = (specifier: string): string =>
  specifier.split('/').slice(0, specifier.startsWith('@') ? 2 : 1).join('/');

/** Exactly what this host build provides to remotes: installed singleton versions + supported contract range. */
const hostCompat: HostCompat = {
  hostVersion: readVersion(new URL('./package.json', import.meta.url)),
  contract: SUPPORTED_CONTRACT_VERSIONS,
  singletons: Object.fromEntries(
    Object.keys(SINGLETONS).map((name) => [name, readVersion(new URL(`./node_modules/${packageNameOf(name)}/package.json`, import.meta.url))]),
  ),
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

/**
 * DX (dev only): remotes on their own dev servers bring a second React Refresh runtime, which finds React DOM only
 * through `hook.renderers`. Without the DevTools extension nothing fills that map, so create a recording hook before
 * anything else runs (MF host init loads React DOM before the app entry).
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

/** Dev CSP: remotes come from dev servers / the local Nexus stand-in. Stands set their own CSP (one Nexus origin). */
const devContentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline' http://localhost:*",
  "connect-src 'self' http://localhost:* ws://localhost:*",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
].join('; ');

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: PORT,
    headers: { 'Content-Security-Policy': devContentSecurityPolicy },
    // DX: `PORTAL_STAND=uat pnpm dev` runs the local host against the remotes registered on uat.
    proxy: { '/config.json': { target: INFRA_URL, rewrite: () => `/stands/${STAND}/config.json` } },
  },
  preview: { port: PORT, headers: { 'Content-Security-Policy': devContentSecurityPolicy } },
  build: { target: 'es2023' },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    hostCompatPlugin(),
    devRefreshHookPlugin(),
    federation({ name: 'host', remotes: {}, dts: false, shared: createSharedConfig() }),
  ],
});

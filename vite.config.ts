import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import babel from '@rolldown/plugin-babel';
import { federation } from '@module-federation/vite';
import { createSharedConfig } from '@portal/mf-shared';
import react, { reactCompilerPreset } from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

const PORT = 5173;

type HostConfig = { remotes: Record<string, { entry: string }> };

const hostConfig = JSON.parse(readFileSync(new URL('./public/config.json', import.meta.url), 'utf8')) as HostConfig;
const remoteOrigins = [...new Set(Object.values(hostConfig.remotes).map((remote) => new URL(remote.entry).origin))];

/**
 * Minimum security baseline (accepted-risk ADR): CSP with an allowlist of remote origins.
 * 'unsafe-inline' scripts: Vite dev preamble + MF host init; styles: emotion. Tighten with nonces in production.
 */
const contentSecurityPolicy = [
  "default-src 'self'",
  `script-src 'self' 'unsafe-inline' ${remoteOrigins.join(' ')}`,
  `connect-src 'self' ws: ${remoteOrigins.join(' ')}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
].join('; ');

export default defineConfig({
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: { port: PORT, headers: { 'Content-Security-Policy': contentSecurityPolicy } },
  preview: { port: PORT, headers: { 'Content-Security-Policy': contentSecurityPolicy } },
  build: { target: 'es2023' },
  plugins: [
    react(),
    babel({ presets: [reactCompilerPreset()] }),
    // Remotes are registered at runtime from public/config.json (one build → any stand).
    federation({ name: 'host', remotes: {}, dts: false, shared: createSharedConfig() }),
  ],
});

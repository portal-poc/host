import { z } from 'zod';

/** No deployed stand underneath: only the remotes from the env. */
export const NO_STAND = 'none';

const REMOTE_KEY = /^PORTAL_REMOTE_([A-Z][A-Z0-9_]*)$/;
const KNOWN_KEYS = new Set(['PORTAL_STAND', 'PORTAL_STAND_URL']);
/** Read by portal-cli, may be exported in the same shell: not ours, not typos. */
const TOOLING_KEYS = new Set([
  'PORTAL_NEXUS_URL',
  'PORTAL_NEXUS_USER',
  'PORTAL_NEXUS_PASSWORD',
  'PORTAL_REGISTRY_DIR',
  'PORTAL_REGISTRY',
  'PORTAL_APP_VERSION',
]);

/** Where the PoC stands are served; `PORTAL_STAND_URL` points elsewhere (another domain, a stand behind a VPN). */
const standUrlOf = (stand: string) => `https://${stand}.poc.ashirokov.dev`;

const standSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'a stand name (lowercase, e.g. dev3, tst) or `none`')
  .default('dev3');

const manifestSchema = z.url().refine((value) => value.endsWith('/mf-manifest.json'), 'must end with /mf-manifest.json');

export type DevEnv = {
  stand: string;
  /** The deployed stand underneath (its `/config.json`); null with `PORTAL_STAND=none`. */
  standUrl: string | null;
  /** Remote name (kebab-case, as in the registry) → dev server manifest URL. */
  remotes: Record<string, string>;
};

/** `PORTAL_REMOTE_MY_REPORTS` → `my-reports`: env keys cannot hold dashes, remote names are kebab-case. */
export const toRemoteName = (envSuffix: string): string => envSuffix.toLowerCase().replaceAll('_', '-');

/**
 * Validates the developer's `.env.development.local` (+ shell) once, when the dev server starts: typos fail fast
 * with the offending key instead of surfacing as a broken host in the browser.
 */
export const parseDevEnv = (env: Record<string, string | undefined>): DevEnv => {
  const problems: string[] = [];
  const remotes: Record<string, string> = {};

  for (const [key, value] of Object.entries(env)) {
    // Empty value = switched off (`PORTAL_REMOTE_TASKS=` keeps the line in the file for later).
    if (!value || !key.startsWith('PORTAL_') || KNOWN_KEYS.has(key) || TOOLING_KEYS.has(key)) {
      continue;
    }
    const suffix = REMOTE_KEY.exec(key)?.[1];
    if (!suffix) {
      problems.push(`${key}: unknown variable (expected PORTAL_STAND, PORTAL_STAND_URL or PORTAL_REMOTE_<NAME>)`);
      continue;
    }
    const manifest = manifestSchema.safeParse(value);
    if (manifest.success) {
      remotes[toRemoteName(suffix)] = manifest.data;
    } else {
      problems.push(`${key}=${value ?? ''}: ${z.prettifyError(manifest.error)}`);
    }
  }

  const stand = standSchema.safeParse(env['PORTAL_STAND'] || undefined);
  if (!stand.success) {
    problems.push(`PORTAL_STAND=${env['PORTAL_STAND'] ?? ''}: ${z.prettifyError(stand.error)}`);
  }
  const standUrl = z.url().optional().safeParse(env['PORTAL_STAND_URL'] || undefined);
  if (!standUrl.success) {
    problems.push(`PORTAL_STAND_URL: ${z.prettifyError(standUrl.error)}`);
  }

  if (problems.length > 0 || !stand.success || !standUrl.success) {
    throw new Error(`Invalid local dev env (.env.development.local):\n${problems.map((line) => `  - ${line}`).join('\n')}`);
  }
  const url = stand.data === NO_STAND ? null : (standUrl.data ?? standUrlOf(stand.data));
  return { stand: stand.data, standUrl: url?.replace(/\/$/, '') ?? null, remotes };
};

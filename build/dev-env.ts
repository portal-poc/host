import { z } from 'zod';

/** No deployed stand underneath: only the remotes from the env. */
export const NO_STAND = 'none';

const REMOTE_KEY = /^PORTAL_REMOTE_([A-Z][A-Z0-9_]*)$/;
const KNOWN_KEYS = new Set(['PORTAL_STAND', 'PORTAL_INFRA_URL']);
/** Read by portal-cli / PoC infra, may be exported in the same shell: not ours, not typos. */
const TOOLING_KEYS = new Set(['PORTAL_INFRA_DIR', 'PORTAL_NEXUS_DIR', 'PORTAL_REGISTRY_DIR', 'PORTAL_HOST_DIR', 'PORTAL_REGISTRY', 'PORTAL_APP_VERSION']);

const standSchema = z
  .string()
  .regex(/^[a-z][a-z0-9-]*$/, 'a stand name (lowercase, e.g. dev3, tst) or `none`')
  .default('dev3');

const manifestSchema = z.url().refine((value) => value.endsWith('/mf-manifest.json'), 'must end with /mf-manifest.json');

export type DevEnv = {
  stand: string;
  infraUrl: string;
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
      problems.push(`${key}: unknown variable (expected PORTAL_STAND, PORTAL_INFRA_URL or PORTAL_REMOTE_<NAME>)`);
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
  const infraUrl = z.url().default('http://localhost:4400').safeParse(env['PORTAL_INFRA_URL'] || undefined);
  if (!infraUrl.success) {
    problems.push(`PORTAL_INFRA_URL: ${z.prettifyError(infraUrl.error)}`);
  }

  if (problems.length > 0 || !stand.success || !infraUrl.success) {
    throw new Error(`Invalid local dev env (.env.development.local):\n${problems.map((line) => `  - ${line}`).join('\n')}`);
  }
  return { stand: stand.data, infraUrl: infraUrl.data, remotes };
};

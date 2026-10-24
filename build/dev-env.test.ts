import { describe, expect, it } from 'vitest';
import { parseDevEnv, toRemoteName } from './dev-env';

const TASKS = 'http://localhost:5174/mf-manifest.json';

describe('parseDevEnv', () => {
  it('defaults to uat and the local infra', () => {
    expect(parseDevEnv({})).toEqual({ stand: 'uat', infraUrl: 'http://localhost:4400', remotes: {} });
  });

  it('collects local remotes under their registry names', () => {
    const env = parseDevEnv({ PORTAL_STAND: 'none', PORTAL_REMOTE_TASKS: TASKS, PORTAL_REMOTE_MY_REPORTS: TASKS });
    expect(env.stand).toBe('none');
    expect(env.remotes).toEqual({ tasks: TASKS, 'my-reports': TASKS });
  });

  it('ignores foreign and portal tooling variables, and switched-off remotes', () => {
    expect(parseDevEnv({ HOME: '/home/dev', PORTAL_REGISTRY_DIR: '../registry', PORTAL_REMOTE_TASKS: '' }).remotes).toEqual({});
  });

  it.each([
    [{ PORTAL_REMOTES_TASKS: TASKS }, 'PORTAL_REMOTES_TASKS: unknown variable'],
    [{ PORTAL_REMOTE_TASKS: 'localhost:5174' }, 'PORTAL_REMOTE_TASKS=localhost:5174'],
    [{ PORTAL_REMOTE_TASKS: 'http://localhost:5174/' }, 'must end with /mf-manifest.json'],
    [{ PORTAL_STAND: 'UAT' }, 'PORTAL_STAND=UAT'],
  ])('rejects %o', (env, message) => {
    expect(() => parseDevEnv(env)).toThrow(message);
  });
});

describe('toRemoteName', () => {
  it('maps env suffixes to kebab-case remote names', () => {
    expect(toRemoteName('LEGACY')).toBe('legacy');
    expect(toRemoteName('MY_REPORTS')).toBe('my-reports');
  });
});

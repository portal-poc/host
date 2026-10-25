import { describe, expect, it } from 'vitest';
import { parseDevEnv, toRemoteName } from './dev-env';

const TASKS = 'http://localhost:5174/mf-manifest.json';

describe('parseDevEnv', () => {
  it('defaults to the hosted dev3 stand', () => {
    expect(parseDevEnv({})).toEqual({ stand: 'dev3', standUrl: 'https://dev3.poc.ashirokov.dev', remotes: {} });
  });

  it('takes the stand address from PORTAL_STAND_URL, and none without a stand', () => {
    expect(parseDevEnv({ PORTAL_STAND: 'dev1', PORTAL_STAND_URL: 'https://dev1.example/' }).standUrl).toBe('https://dev1.example');
    expect(parseDevEnv({ PORTAL_STAND: 'none' }).standUrl).toBeNull();
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
    [{ PORTAL_STAND_URL: 'dev3.poc' }, 'PORTAL_STAND_URL'],
    [{ PORTAL_INFRA_URL: 'http://localhost:4400' }, 'PORTAL_INFRA_URL: unknown variable'],
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

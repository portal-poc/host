import { beforeEach, describe, expect, it, vi } from 'vitest';

const preload = vi.fn(async () => {});
const state = { mode: 'integrated', account: { id: 'alice' } as { id: string } | null };

vi.mock('@module-federation/runtime', () => ({ loadRemote: vi.fn(async () => ({ preload })) }));
vi.mock('../config', () => ({ getRemoteSections: () => [{ name: 'tasks', basePath: '/tasks', title: 'Tasks' }] }));
vi.mock('../platform', () => ({
  buildPlatformForRemote: (name: string) => ({ name }),
  hostAuth: { getAccount: () => state.account },
}));
vi.mock('./remote-entries', () => ({ loadEntry: vi.fn(async () => ({ mode: state.mode, version: '1.7.0' })) }));

const { preloadRoute } = await import('./preload-route');

describe('preloadRoute', () => {
  beforeEach(() => {
    preload.mockClear();
    state.mode = 'integrated';
    state.account = { id: 'alice' };
  });

  it("calls the remote's preload with the path inside the remote, once per target in a while", async () => {
    await preloadRoute('/tasks/42');
    await preloadRoute('/tasks/42');
    await preloadRoute('/tasks');

    expect(preload.mock.calls).toEqual([
      [{ name: 'tasks' }, { path: '/42' }],
      [{ name: 'tasks' }, { path: '/' }],
    ]);
  });

  it('warms nothing for host routes, signed-out users and data of bridge remotes', async () => {
    await preloadRoute('/');
    await preloadRoute('/tasksboard');
    state.account = null;
    await preloadRoute('/tasks/7');
    state.account = { id: 'alice' };
    state.mode = 'bridge';
    await preloadRoute('/tasks/8');

    expect(preload).not.toHaveBeenCalled();
  });
});

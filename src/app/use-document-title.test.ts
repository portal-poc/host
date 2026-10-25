import { describe, expect, it, vi } from 'vitest';
import { composeTitle } from './use-document-title';

vi.mock('@/shared/config', () => ({
  getRemoteSections: () => [
    { name: 'tasks', basePath: '/tasks', title: 'Tasks' },
    { name: 'legacy', basePath: '/legacy', title: 'Legacy' },
  ],
}));

describe('composeTitle', () => {
  it('shows the page title of the app whose section is on screen', () => {
    expect(composeTitle('/tasks/new', { tasks: 'New task', legacy: 'About' })).toBe('New task · Tasks · Portal');
  });

  it('falls back to the section, and never shows a title left by another app', () => {
    expect(composeTitle('/legacy', { tasks: 'New task' })).toBe('Legacy · Portal');
    expect(composeTitle('/tasks', { tasks: 'Tasks' })).toBe('Tasks · Portal');
  });

  it('uses the host title outside remote sections, and does not mistake a prefix for a section', () => {
    expect(composeTitle('/', {})).toBe('Portal');
    expect(composeTitle('/tasksboard', { host: 'Board', tasks: 'New task' })).toBe('Board · Portal');
  });
});

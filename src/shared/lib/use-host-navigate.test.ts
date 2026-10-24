import { describe, expect, it } from 'vitest';
import { getNavigationDirection } from './use-host-navigate';

describe('getNavigationDirection', () => {
  it.each([
    ['/', '/tasks', 'nav-forward'],
    ['/tasks', '/', 'nav-back'],
    ['/tasks', '/legacy', 'nav-forward'],
    ['/legacy', '/tasks', 'nav-back'],
    ['/', '/tasks/3', 'nav-forward'],
    ['/tasks', '/tasks/3', 'nav-forward'],
  ])('%s → %s is %s', (from, to, expected) => {
    expect(getNavigationDirection(from, to)).toBe(expected);
  });
});

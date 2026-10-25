import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { leaveDialog } from '@/shared/platform';
import { LeaveDialog } from './LeaveDialog';

const guard = (message: string) => ({ message });

describe('LeaveDialog', () => {
  afterEach(cleanup);

  it('answers the waiting navigation, and a newer question makes the older one stay', async () => {
    // Joy renders with its default theme without DsProvider (which needs matchMedia, absent in jsdom).
    render(<LeaveDialog />);

    let first: Promise<boolean> = Promise.resolve(true);
    let second: Promise<boolean> = Promise.resolve(false);
    await act(async () => {
      first = leaveDialog.ask(guard('Tasks: not saved'), '/');
    });
    await act(async () => {
      second = leaveDialog.ask(guard('Legacy: not saved'), '/legacy');
    });

    await expect(first).resolves.toBe(false);
    expect(screen.getByRole('alertdialog').textContent).toContain('Legacy: not saved');
    await act(async () => screen.getByText('Leave').click());
    await expect(second).resolves.toBe(true);
  });
});

import { useQueryErrorResetBoundary } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { AsyncBoundary } from '@portal-poc/ds';

export const QueryBoundary = ({ children }: { children: ReactNode }) => {
  const { reset } = useQueryErrorResetBoundary();
  return <AsyncBoundary onReset={reset}>{children}</AsyncBoundary>;
};

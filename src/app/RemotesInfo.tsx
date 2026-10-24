import { useSyncExternalStore } from 'react';
import { Chip, Stack, Typography } from '@portal/ds';
import { getHostConfig } from '@/shared/config';
import { remoteStatusStore } from '@/shared/remotes';

const MODE_COLOR = { integrated: 'success', bridge: 'warning', error: 'danger' } as const;

/** DX: which stand, which remote versions, from where (stand registry or a local dev server), in which mode. */
export const RemotesInfo = () => {
  const statuses = useSyncExternalStore(remoteStatusStore.subscribe, remoteStatusStore.getSnapshot);
  return (
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
      <Typography level="body-xs">stand: {getHostConfig().env}</Typography>
      {statuses.map((status) => (
        <Chip key={status.name} size="sm" variant="soft" color={MODE_COLOR[status.mode]} title={status.detail}>
          {status.name}@{status.version} · {status.source} · {status.mode}
        </Chip>
      ))}
    </Stack>
  );
};

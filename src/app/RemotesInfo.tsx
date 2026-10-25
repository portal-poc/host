import { useSyncExternalStore } from 'react';
import { Chip, Stack, Typography } from '@portal-poc/ds';
import { getHostConfig } from '@/shared/config';
import { remoteStatusStore } from '@/shared/remotes';

const MODE_COLOR = { integrated: 'success', bridge: 'warning', error: 'danger' } as const;

/** `8d55cff…` → `8d55cff` (keeps `-dirty`): what to check out to reproduce a build. */
const shortCommit = (commit: string | undefined) => (commit ? ` · ${commit.replace(/^([0-9a-f]{7})[0-9a-f]*/, '$1')}` : '');

/**
 * DX: which stand, which host and remote builds (version · commit), from where (stand registry or a local dev
 * server), in which mode.
 */
export const RemotesInfo = () => {
  const statuses = useSyncExternalStore(remoteStatusStore.subscribe, remoteStatusStore.getSnapshot);
  return (
    <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
      <Typography level="body-xs">
        stand: {getHostConfig().env} · host {PORTAL_HOST_COMPAT.hostVersion}
        {shortCommit(PORTAL_HOST_COMPAT.commit)}
      </Typography>
      {statuses.map((status) => (
        <Chip key={status.name} size="sm" variant="soft" color={MODE_COLOR[status.mode]} title={status.detail}>
          {status.name}@{status.version}
          {shortCommit(status.commit)} · {status.source} · {status.mode}
        </Chip>
      ))}
    </Stack>
  );
};

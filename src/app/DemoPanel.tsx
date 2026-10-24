import { useState, useSyncExternalStore } from 'react';
import { Button, Checkbox, Option, Select, Sheet, Stack, Typography } from '@portal-poc/ds';
import { DEMO_KEYS, hostAuth, readFlag, telemetryLog, writeFlag } from '@/shared/platform';
import { RemotesInfo } from './RemotesInfo';

const DELAYS = ['100', '400', '800', '3000'];
const TTLS = [
  { value: String(10 * 60 * 1000), label: '10 min' },
  { value: '20000', label: '20 s' },
];

const describeError = (error: unknown) => (error instanceof Error ? error.message : String(error));

const reloadWith = (key: string, value: string | null) => {
  writeFlag(key, value);
  window.location.reload();
};

/** Dev-only switches for the demo scenarios (docs/demo.md). */
export const DemoPanel = () => {
  const [isOpen, setIsOpen] = useState(false);
  const account = useSyncExternalStore(hostAuth.subscribe, hostAuth.getAccount);
  const errors = useSyncExternalStore(telemetryLog.subscribe, telemetryLog.getSnapshot);
  const [delay, setDelay] = useState(() => readFlag(DEMO_KEYS.delayMs) ?? '400');
  const [ttl, setTtl] = useState(() => String(hostAuth.getTokenTtlMs()));

  const handleAccount = (_event: unknown, value: string | null) => {
    if (!value) {
      hostAuth.logout();
    } else if (account) {
      hostAuth.switchAccount(value);
    } else {
      hostAuth.login(value);
    }
  };
  const handleDelay = (_event: unknown, value: string | null) => {
    if (value) {
      setDelay(value);
      writeFlag(DEMO_KEYS.delayMs, value);
    }
  };
  const handleTtl = (_event: unknown, value: string | null) => {
    if (value) {
      setTtl(value);
      writeFlag(DEMO_KEYS.tokenTtlMs, value);
      hostAuth.setTokenTtlMs(Number(value));
    }
  };
  const toggleOpen = () => {
    setIsOpen((open) => !open);
  };

  if (!isOpen) {
    return (
      <Button size="sm" variant="soft" sx={{ position: 'fixed', left: 12, bottom: 12 }} onClick={toggleOpen}>
        Demo panel
      </Button>
    );
  }

  return (
    <Sheet variant="outlined" sx={{ position: 'fixed', left: 12, bottom: 12, p: 2, borderRadius: 'md', width: 320, zIndex: 1000 }}>
      <Stack gap={1.5}>
        <Stack direction="row" justifyContent="space-between">
          <Typography level="title-sm">Demo panel</Typography>
          <Button size="sm" variant="plain" onClick={toggleOpen}>
            Close
          </Button>
        </Stack>
        <Select size="sm" value={account?.id ?? ''} onChange={handleAccount}>
          <Option value="">Signed out</Option>
          {hostAuth.accounts.map((candidate) => (
            <Option key={candidate.id} value={candidate.id}>
              {candidate.displayName}
            </Option>
          ))}
        </Select>
        <Select size="sm" value={delay} onChange={handleDelay} startDecorator="BFF delay">
          {DELAYS.map((value) => (
            <Option key={value} value={value}>
              {value} ms
            </Option>
          ))}
        </Select>
        <Select size="sm" value={ttl} onChange={handleTtl} startDecorator="Token TTL">
          {TTLS.map((option) => (
            <Option key={option.value} value={option.value}>
              {option.label}
            </Option>
          ))}
        </Select>
        <Checkbox
          size="sm"
          label="Force bridge build for tasks (reload)"
          checked={readFlag(DEMO_KEYS.forceBridge) === 'tasks'}
          onChange={(event) => reloadWith(DEMO_KEYS.forceBridge, event.target.checked ? 'tasks' : null)}
        />
        <Checkbox
          size="sm"
          label="Simulate incompatible contract (reload)"
          checked={readFlag(DEMO_KEYS.incompatibleContract) === '1'}
          onChange={(event) => reloadWith(DEMO_KEYS.incompatibleContract, event.target.checked ? '1' : null)}
        />
        <RemotesInfo />
        <Typography level="body-xs">Telemetry errors:</Typography>
        {errors.length === 0 && <Typography level="body-xs">—</Typography>}
        {errors.map((record) => (
          <Typography key={record.at} level="body-xs" color="danger">
            [{record.app}] {record.kind === 'error' ? describeError(record.error) : record.name}
          </Typography>
        ))}
      </Stack>
    </Sheet>
  );
};

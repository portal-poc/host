import type { HttpTarget } from '@portal-poc/http';

const HOST_BFF_SCOPES = ['api://host-bff/Host.Read'];

/**
 * host-bff of every environment (the stand's `env`), the counterpart of a remote's `config.json`: one host build runs
 * on any stand. `local`: the dev server without a stand underneath. PoC: the fake host-bff answers on any address.
 */
const HOST_BFF: Readonly<Record<string, HttpTarget>> = Object.fromEntries(
  Object.entries({
    local: 'https://host-bff.local/api',
    dev3: 'https://host-bff.dev3.bank.example/api',
    dev2: 'https://host-bff.dev2.bank.example/api',
    dev1: 'https://host-bff.dev1.bank.example/api',
    tst: 'https://host-bff.tst.bank.example/api',
  }).map(([env, baseUrl]) => [env, { baseUrl, scopes: HOST_BFF_SCOPES }]),
);

export const getHostBffTarget = (env: string): HttpTarget => {
  const target = HOST_BFF[env];
  if (!target) {
    throw new Error(`host: no host-bff address for environment "${env}" (src/shared/config/host-bff.ts)`);
  }
  return target;
};

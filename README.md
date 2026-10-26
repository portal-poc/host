# host

> Part of the portal PoC. Start at the [platform README](https://github.com/portal-poc/platform#readme) — how all pieces interact: [overview](https://github.com/portal-poc/platform/blob/main/docs/overview.md).

Portal host: data router (React Router v8), stand config read at runtime (`/config.json`), remotes loaded by
manifest with compatibility checks (contract, singletons, build tooling) and bridge fallback, host-owned route view
transitions, devtools toolbar, demo panel, reload of tabs left on a cleaned-up build. Builds with
`@portal-poc/vite-config`.

## What the host gives

**To every remote** (as the `platform` prop, `@portal-poc/platform-contract`; built per remote in
`shared/platform/host-platform.ts`):

| Capability | How the host provides it | Remote uses |
|---|---|---|
| One login | one `PlatformAuth` for the page (mock in the PoC, `createMsalPlatformAuth` in production); per remote a wrapper that only grants the scopes of its registry entry and forwards login to the host | `@portal-poc/http`, `@portal-poc/realtime`, `usePlatformAuth()` |
| Route and menu entry | `basePath` + `title` from the stand's `/config.json` (the registry): adding a remote never touches host code | — |
| Loading with checks (gate 3) | manifest → contract version, singletons, tooling vs this host → mount integrated, or the bridge build, or an error with retry inside the remote's area | `./RemoteRoot`, `./RemoteBridge` |
| Leave guards | one router blocker + one dialog / lock notice for every app (`LeaveDialog`) | `useLeaveGuard` |
| Page titles | `<page> · <section> · Portal` from the section on screen | `usePageTitle` |
| Event bus | `platform.events` shared by all apps on the page | `@portal-poc/events` |
| Preload | hover / focus / touch on a link to a remote loads its code and calls its `./preload(path)` | `src/app/exposes/preload.ts` |
| Devtools drawer | toolbar with every app's TanStack devtools and the remotes panel (version · commit · source) | `createQueryDevtoolsMount` |
| Stale tabs | one reload when a chunk of an old deploy is gone (never while a guard holds the page) | — |
| Telemetry, locale, env | console sink (PoC), language, `env.name` = the stand | `usePlatformTelemetry`, `usePlatformEnv` |

**To people**:

| What | Where |
|---|---|
| Demo panel: mock accounts, BFF delay, forced bridge, incompatible contract | dev server and dev stands; `tst` with `?demo=1` (`?demo=0` hides) |
| Devtools + remotes panel | dev server and dev3 always; other stands with `?devtools=1` or `localStorage['portal.devtools'] = '1'` |
| Which build runs | remotes panel, `compat.json` (`hostVersion`, `commit`, singletons, contract range) at the stand root |

**Files a stand serves** (`portal-stands/<stand>/`): the host build, `compat.json` (what this host provides; remotes
are gated against it), `/config.json` (written by the registry's Config deploy):

```json
{
  "env": "dev2",
  "remotes": {
    "tasks": {
      "version": "1.8.0-rc.17",
      "manifest": "https://nexus…/portal-releases/tasks/1.8.0-rc.17/mf-manifest.json",
      "bridgeManifest": "https://nexus…/portal-releases/tasks/1.8.0-rc.17/bridge/mf-manifest.json",
      "basePath": "/tasks",
      "scopes": ["api://tasks-bff/Tasks.ReadWrite"],
      "title": "Tasks"
    }
  }
}
```

**Dev server variables** (`.env.development.local`, validated at start by `build/dev-env.ts`):

| Variable | Meaning |
|---|---|
| `PORTAL_STAND` | `dev3` (default), `dev2`, `dev1`, `tst`: run on top of that stand's `/config.json`; `none`: only local remotes |
| `PORTAL_STAND_URL` | a stand at another address |
| `PORTAL_REMOTE_<NAME>` | `http://localhost:<port>/mf-manifest.json` of a remote you run locally (`MY_REPORTS` → `my-reports`) |

Scenarios (local development, deploys, rollbacks): [platform `docs/playbook.md`](https://github.com/portal-poc/platform/blob/main/docs/playbook.md).

## Local setup

One-time (see the platform repository for the full guide):

```sh
# ~/.npmrc — internal scope from GitHub Packages (token needs read:packages)
@portal-poc:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=<token>
```

All repositories side by side: `~/projects/portal-poc/{platform,registry,host,tasks-remote,legacy-remote}`.

## Run

```sh
pnpm install
pnpm dev            # :5173 — the remotes deployed on PORTAL_STAND (default: dev3)
```

The dev server reads the stand's own `/config.json` (`https://<stand>.poc.ashirokov.dev`, every page load), so the
host runs exactly the remotes deployed there; nothing else has to run. Work on remotes locally: copy
`.env.development.local.example` to `.env.development.local` and list the remotes you run
(`PORTAL_REMOTE_TASKS=http://localhost:5174/mf-manifest.json`), start their `pnpm dev`, then `pnpm dev` here.
A remote that is not registered anywhere yet works the same way (route `/<name>`, scopes from its `config.json`);
`PORTAL_STAND=none` gives only your local remotes. `PORTAL_STAND_URL` points at a stand elsewhere. Local development
never touches the registry. The dev server validates these variables at start (`build/dev-env.ts`): unknown
`PORTAL_*` keys, non-manifest URLs and bad stand names stop it with the offending line; a remote missing on the stand
is reported as a warning. `pnpm build && pnpm preview` runs the production build the same way.

Demo panel (mock accounts, BFF delay, forced bridge, incompatible contract): on the dev server and the dev stands;
on `tst` only with `?demo=1` (remembered in the browser, `?demo=0` hides it). Devtools: always on the dev server and dev3, elsewhere `?devtools=1`.

## Deploy

Actions → **Deploy** → Run workflow: pick the stand and the branch or tag. The host rides the same release train as
the remotes and follows the same stand rules (registry `stands.json`), checked before the build:

| Stand | Ref | Result |
|---|---|---|
| `dev3` | any branch (`main`, `feature/…`) | built as `1.8.0-snapshot.<run>+<sha>`, installed in place |
| `dev2` | the newest `release/X.Y` or its tags | `X.Y.<next>-rc.<run>` / `X.Y.Z`, published once to `portal-releases/host/<version>/`, commit to `dev2/_host.json`; the config deploy installs it |
| `dev1` | the pilot line (`release/1.5`) or its tags | the same, `dev1/_host.json` |
| `tst` | — | refused: Promote in the registry brings dev1's host |

Every build passes the reverse gate first: each remote registered on the stand must still work with it, otherwise
the stand keeps its current host. Rollback: deploy the previous tag (same artifact) or
`portal-cli host release --stand dev2 --version <older>`. `package.json` holds the line `main` builds (bump it when a
release line is cut); fixes go to `release/X.Y` and are forward-merged to newer lines and `main`.

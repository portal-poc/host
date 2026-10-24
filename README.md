# host

Portal host: data router (React Router v8), stand config read at runtime (`/config.json`), remotes loaded by
manifest with compatibility checks (contract, singletons, build tooling) and bridge fallback, host-owned route view
transitions, devtools toolbar, demo panel. Builds with `@portal-poc/vite-config`.

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
pnpm dev            # :5173 — remotes as registered on PORTAL_STAND (default: dev3)
```

Work on remotes locally: copy `.env.development.local.example` to `.env.development.local`, list the remotes you run
(`PORTAL_REMOTE_TASKS=http://localhost:5174/mf-manifest.json`), start `pnpm infra` in `platform`, the remotes'
`pnpm dev`, then `pnpm dev` here. Everything else runs the version registered on `PORTAL_STAND`. A remote that is not
registered anywhere yet works the same way (route `/<name>`, scopes from its `config.json`); `PORTAL_STAND=none`
gives only your local remotes, without infra. Local development never touches the registry.
The dev server validates these variables at start (`build/dev-env.ts`): unknown `PORTAL_*` keys, non-manifest URLs
and bad stand names stop it with the offending line; a remote missing on the stand is reported as a warning.

Deploy to the PoC stands: `pnpm build`, then in `platform`: `pnpm deploy:host dev3` (dev2, dev1, tst).

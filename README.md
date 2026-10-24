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
pnpm dev            # :5173 — remotes from the stand in .env.development.local (default: local)
```

Work on a remote locally: copy `.env.development.local.example` to `.env.development.local`
(`PORTAL_STAND=uat`, `PORTAL_REMOTE_TASKS=http://localhost:5174/mf-manifest.json`), start `pnpm infra` in
`platform`, the remote's `pnpm dev`, then `pnpm dev` here. Everything not overridden runs the version registered on
that stand.

Deploy to the PoC uat stand: `pnpm build`, then in `platform`: `pnpm deploy:host uat`.

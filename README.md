# host

Portal host: data router (React Router v8, `useTransitions`), runtime remote registration from `public/config.json`,
`<RemoteApp name>` with dual entry (integrated if the React instance is the same, MF Bridge otherwise), host-owned
route view transitions, bookmarks widget, devtools toolbar, demo panel, CSP with remote allowlist.

```sh
pnpm dev       # :5173 (start tasks-remote / legacy-remote dev servers too, or run `pnpm dev` at the root)
```

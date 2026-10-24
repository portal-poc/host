type RefreshRuntime = { injectIntoGlobalHook: (target: Window) => void };

type HotContext = { on: (event: string, callback: () => void) => void };

type ViteClient = { createHotContext: (ownerPath: string) => HotContext };

type PreambleWindow = Window & {
  $RefreshReg$?: () => void;
  $RefreshSig$?: () => (type: unknown) => unknown;
  __vite_plugin_react_preamble_installed__?: boolean;
};

const attached = new Set<string>();

const reload = () => {
  window.location.reload();
};

/**
 * DX: lets a remote served by its Vite dev server (local stand, or a developer override on a deployed stand) run
 * inside this host with live updates.
 * - Installs the remote's React Refresh runtime (Vite injects that preamble only into its own pages).
 * - Loads the remote's Vite client: it connects to the remote's HMR channel (with the WS token Vite requires).
 * - Host in dev (development React): real Fast Refresh of the remote's components.
 *   Deployed host (production React, no Fast Refresh): every saved change reloads the page; overrides survive.
 */
export const attachToRemoteDevServer = async (origin: string): Promise<void> => {
  if (attached.has(origin)) {
    return;
  }
  attached.add(origin);
  const runtime: { default: RefreshRuntime } = await import(/* @vite-ignore */ `${origin}/@react-refresh`);
  const target: PreambleWindow = window;
  runtime.default.injectIntoGlobalHook(window);
  target.$RefreshReg$ ??= () => {};
  target.$RefreshSig$ ??= () => (type) => type;
  // Flag name is defined by @vitejs/plugin-react.
  // oxlint-disable-next-line no-underscore-dangle
  target.__vite_plugin_react_preamble_installed__ = true;

  const client: ViteClient = await import(/* @vite-ignore */ `${origin}/@vite/client`);
  const hot = client.createHotContext('/@portal-host');
  hot.on('vite:beforeFullReload', reload);
  if (!import.meta.env.DEV) {
    hot.on('vite:beforeUpdate', reload);
  }
};

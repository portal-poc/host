/** Dev demo switches (host demo panel). localStorage with try/catch: conveniences only. */
export const DEMO_KEYS = {
  delayMs: 'portal.mock.delayMs',
  forceBridge: 'portal.demo.forceBridge',
  incompatibleContract: 'portal.demo.incompatibleContract',
  tokenTtlMs: 'portal.demo.tokenTtlMs',
} as const;

export const readFlag = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const DEMO_ENABLED_KEY = 'portal.demo';
/** Stands shown to the business: no demo panel and no demo switches unless asked for. */
const BUSINESS_STANDS = new Set(['tst']);

/**
 * Demo panel and demo switches (forced bridge, incompatible contract): on the dev server and the dev stands; on a
 * business stand only after `?demo=1` (remembered in this browser; `?demo=0` turns it off anywhere).
 */
export const isDemoEnabled = (env: string, search: string = window.location.search): boolean => {
  const fromUrl = new URLSearchParams(search).get('demo');
  if (fromUrl === '1' || fromUrl === '0') {
    writeFlag(DEMO_ENABLED_KEY, fromUrl);
  }
  const chosen = readFlag(DEMO_ENABLED_KEY);
  return chosen === null ? import.meta.env.DEV || !BUSINESS_STANDS.has(env) : chosen === '1';
};

export const writeFlag = (key: string, value: string | null) => {
  try {
    if (value === null) {
      localStorage.removeItem(key);
    } else {
      localStorage.setItem(key, value);
    }
  } catch {
    // ignore: demo convenience only
  }
};

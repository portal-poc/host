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

let titles: Readonly<Record<string, string>> = {};
const listeners = new Set<() => void>();

/**
 * The page title each app asked for (`platform.document.setTitle`), by app name (`host` or the remote's name). The
 * layout shows the one of the section on screen, so a title left by an app the user has left is never shown.
 */
export const pageTitles = {
  set: (app: string, title: string | null) => {
    const { [app]: _previous, ...others } = titles;
    titles = title ? { ...others, [app]: title } : others;
    for (const listener of listeners) {
      listener();
    }
  },
  subscribe: (listener: () => void) => {
    listeners.add(listener);
    return () => {
      listeners.delete(listener);
    };
  },
  getSnapshot: () => titles,
};

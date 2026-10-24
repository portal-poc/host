import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { z } from 'zod';
import type { HttpClient } from '@portal-poc/platform-runtime';
import { usePlatformEvents } from '@portal-poc/platform-runtime';

const bookmarkSchema = z.object({ taskId: z.string(), title: z.string(), path: z.string(), source: z.string() });

export type Bookmark = z.output<typeof bookmarkSchema>;

export const bookmarksOptions = (http: HttpClient) =>
  queryOptions({
    queryKey: ['host', 'bookmarks'],
    queryFn: ({ signal }) => http.get('/bookmarks', z.array(bookmarkSchema), { signal }),
  });

/**
 * Owned by the page that displays bookmarks, but mounted by the app layout for the whole session: the event usually
 * fires while the widget is NOT mounted (user is inside a remote). Invalidating an inactive query marks it stale,
 * so the widget refetches on its next mount. Realtime is out of scope: remotes announce changes on the local bus;
 * `refetchOnWindowFocus` covers other tabs.
 */
export const useInvalidateBookmarksOnEvent = (http: HttpClient) => {
  const events = usePlatformEvents();
  const queryClient = useQueryClient();
  const { queryKey } = bookmarksOptions(http);

  useEffect(
    () =>
      events.subscribe('bookmarks.changed', () => {
        void queryClient.invalidateQueries({ queryKey });
      }),
    // queryKey is static for this hook.
    // oxlint-disable-next-line react/exhaustive-deps
    [events, queryClient],
  );
};

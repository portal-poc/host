import { queryOptions, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { z } from 'zod';
import { bookmarksChanged, subscribeEvent } from '@portal-poc/events';
import { parseResponse } from '@portal-poc/http';
import { usePlatform } from '@portal-poc/platform-runtime';
import { hostHttp } from '@/shared/api';

const bookmarkSchema = z.object({ taskId: z.string(), title: z.string(), path: z.string(), source: z.string() });

export type Bookmark = z.output<typeof bookmarkSchema>;

export const bookmarksOptions = () =>
  queryOptions({
    queryKey: ['host', 'bookmarks'],
    queryFn: ({ signal }) => hostHttp.get('/bookmarks', { signal }).then(parseResponse(z.array(bookmarkSchema))),
  });

/**
 * Owned by the page that displays bookmarks, but mounted by the app layout for the whole session: the event usually
 * fires while the widget is NOT mounted (user is inside a remote). Invalidating an inactive query marks it stale,
 * so the widget refetches on its next mount. Realtime is out of scope: remotes announce changes on the local bus
 * (`bookmarks.changed` of the event catalog, validated); `refetchOnWindowFocus` covers other tabs.
 */
export const useInvalidateBookmarksOnEvent = () => {
  const platform = usePlatform();
  const queryClient = useQueryClient();
  const { queryKey } = bookmarksOptions();

  useEffect(
    () =>
      subscribeEvent(platform, bookmarksChanged, () => {
        void queryClient.invalidateQueries({ queryKey });
      }),
    // queryKey is static for this hook.
    // oxlint-disable-next-line react/exhaustive-deps
    [platform, queryClient],
  );
};

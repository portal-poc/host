/**
 * PoC stand-in for host-bff: GET /bookmarks aggregates bookmarks (tasks writes them into localStorage, the same
 * "database" the real host-bff would read from tasks-bff). Hard-coded, delayed like the remote's fake backend.
 */
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const readUserId = (authorization: string | null): string | null => {
  const token = authorization?.replace(/^Bearer /, '');
  if (!token?.startsWith('mock.')) {
    return null;
  }
  try {
    const payload: unknown = JSON.parse(atob(token.slice(5).replaceAll('-', '+').replaceAll('_', '/')));
    return typeof payload === 'object' && payload !== null && 'sub' in payload ? String(payload.sub) : null;
  } catch {
    return null;
  }
};

const readJson = (key: string): unknown => {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null');
  } catch {
    return null;
  }
};

export const fakeHostFetch: typeof fetch = async (input, init) => {
  const request = new Request(input, init);
  await new Promise((resolve) => setTimeout(resolve, Number(readJson('portal.mock.delayMs') ?? 400)));
  const userId = readUserId(request.headers.get('authorization'));
  if (!userId) {
    return json({ error: 'unauthorized' }, 401);
  }
  if (new URL(request.url).pathname.endsWith('/bookmarks')) {
    const bookmarks = readJson(`portal.mock.bookmarks.${userId}`);
    return json((Array.isArray(bookmarks) ? bookmarks : []).map((item: unknown) => ({ ...(item as object), source: 'tasks' })));
  }
  return json({ error: 'not found' }, 404);
};

import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { backend } from '../server/backend';
beforeEach(() => {
  process.env.GAS_WEB_APP_URL = 'https://script.google.com/macros/s/test/exec';
  process.env.GAS_SHARED_SECRET = 's'.repeat(48);
});
afterEach(() => vi.unstubAllGlobals());
it('follows the approved ContentService redirect without forwarding signed payload', async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(null, {
        status: 302,
        headers: {
          location: 'https://script.googleusercontent.com/macros/echo?key=test',
        },
      }),
    )
    .mockResolvedValueOnce(
      Response.json({ success: true, data: { News: [] }, requestId: 'test' }),
    );
  vi.stubGlobal('fetch', f);
  expect(await backend('public')).toEqual({ News: [] });
  expect(f.mock.calls[1][1].method).toBeUndefined();
  expect(f.mock.calls[1][1].body).toBeUndefined();
});
it('rejects redirect to other domains', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(
      new Response(null, {
        status: 302,
        headers: { location: 'https://evil.invalid' },
      }),
    ),
  );
  await expect(backend('public')).rejects.toMatchObject({
    code: 'BACKEND_UNAVAILABLE',
  });
});
it('safely handles backend failure, invalid response and timeout', async () => {
  for (const error of [
    Error('secret details'),
    new DOMException('timeout', 'TimeoutError'),
  ]) {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(error));
    await expect(backend('public')).rejects.toMatchObject({
      status: 503,
      code: 'BACKEND_UNAVAILABLE',
    });
  }
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue(Response.json({ bad: true })),
  );
  await expect(backend('public')).rejects.toMatchObject({ status: 503 });
});
it('uses a bounded timeout signal', async () => {
  const f = vi
    .fn()
    .mockResolvedValue(
      Response.json({ success: true, data: [], requestId: 'test' }),
    );
  vi.stubGlobal('fetch', f);
  await backend('public');
  expect(f.mock.calls[0][1].signal).toBeInstanceOf(AbortSignal);
});

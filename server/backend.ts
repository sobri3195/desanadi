import { z } from 'zod';
import { ApiError, envelope } from './security';
const resultSchema = z.discriminatedUnion('success', [
  z.object({
    success: z.literal(true),
    data: z.unknown(),
    requestId: z.string(),
  }),
  z.object({
    success: z.literal(false),
    error: z.object({ code: z.string(), message: z.string() }),
    requestId: z.string(),
  }),
]);
export async function backend(
  action: string,
  params: unknown = {},
  actor?: { sub: string; email?: string; name?: string },
) {
  const url = process.env.GAS_WEB_APP_URL;
  if (!url)
    throw new ApiError(
      503,
      'BACKEND_NOT_CONFIGURED',
      'Layanan belum dikonfigurasi. Hubungi pengelola.',
    );
  const target = new URL(url);
  if (
    target.protocol !== 'https:' ||
    target.hostname !== 'script.google.com' ||
    !target.pathname.startsWith('/macros/s/')
  )
    throw new ApiError(503, 'CONFIGURATION', 'Alamat backend tidak valid.');
  try {
    const signal = AbortSignal.timeout(15000);
    let response = await fetch(target, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(envelope({ action, params, actor })),
      redirect: 'manual',
      signal,
    });
    if ([301, 302, 303].includes(response.status)) {
      const location = new URL(response.headers.get('location') || '');
      if (
        location.protocol !== 'https:' ||
        location.hostname !== 'script.googleusercontent.com'
      )
        throw Error('redirect');
      response = await fetch(location, { signal, redirect: 'error' });
    }
    if (!response.ok) throw Error('upstream');
    const result = resultSchema.parse(await response.json());
    if (!result.success) {
      const code = result.error.code;
      throw new ApiError(
        code === 'UNAUTHORIZED'
          ? 401
          : code === 'FORBIDDEN'
            ? 403
            : code === 'RATE_LIMIT'
              ? 429
              : code === 'NOT_FOUND'
                ? 404
                : 400,
        code,
        result.error.message,
      );
    }
    return result.data;
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(
      503,
      'BACKEND_UNAVAILABLE',
      'Layanan tidak tersedia sementara. Silakan coba lagi.',
    );
  }
}

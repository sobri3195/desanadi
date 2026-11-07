import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto';
export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
  }
}
export function secret(name: string) {
  const value = process.env[name];
  if (!value || value.length < 32)
    throw new ApiError(
      503,
      'CONFIGURATION',
      'Konfigurasi keamanan belum tersedia.',
    );
  return value;
}
export function constantEqual(a: string, b: string) {
  const x = Buffer.from(a),
    y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}
export function sign(value: string, key: string) {
  return createHmac('sha256', key).update(value).digest('hex');
}
export type Session = { sub: string; exp: number; csrf: string };
export function encodeSession(sub: string) {
  const session: Session = {
    sub,
    exp: Date.now() + 8 * 60 * 60 * 1000,
    csrf: randomBytes(32).toString('hex'),
  };
  const data = Buffer.from(JSON.stringify(session)).toString('base64url');
  return {
    token: `${data}.${sign(data, secret('JWT_SESSION_SECRET'))}`,
    session,
  };
}
export function readSession(cookie: string = ''): Session {
  const token = cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith('nadi_session='))
    ?.slice(13);
  if (!token)
    throw new ApiError(401, 'UNAUTHORIZED', 'Silakan masuk terlebih dahulu.');
  const [data, signature] = token.split('.');
  if (
    !signature ||
    !constantEqual(sign(data, secret('JWT_SESSION_SECRET')), signature)
  )
    throw new ApiError(401, 'UNAUTHORIZED', 'Sesi tidak valid.');
  try {
    const s = JSON.parse(Buffer.from(data, 'base64url').toString());
    if (
      typeof s.sub !== 'string' ||
      typeof s.csrf !== 'string' ||
      typeof s.exp !== 'number' ||
      s.exp <= Date.now()
    )
      throw Error();
    return s;
  } catch {
    throw new ApiError(401, 'EXPIRED', 'Sesi telah berakhir.');
  }
}
export function envelope(payload: unknown) {
  const timestamp = Date.now(),
    nonce = randomBytes(24).toString('hex'),
    payloadJson = JSON.stringify(payload);
  return {
    timestamp,
    nonce,
    payloadJson,
    signature: sign(
      `${timestamp}\n${nonce}\n${payloadJson}`,
      secret('GAS_SHARED_SECRET'),
    ),
  };
}
export { can, scope } from './permissions';

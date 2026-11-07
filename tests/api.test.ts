import { beforeEach, describe, expect, it, vi } from 'vitest';
import { handler, submissionSchema } from '../server/handler';
import { encodeSession, readSession, sign } from '../server/security';
import { can } from '../server/permissions';
const mocks = vi.hoisted(() => ({ backend: vi.fn(), verify: vi.fn() }));
vi.mock('../server/backend', () => ({ backend: mocks.backend }));
vi.mock('google-auth-library', () => ({
  OAuth2Client: class {
    verifyIdToken = mocks.verify;
  },
}));
function response() {
  return {
    statusCode: 200,
    headers: {} as Record<string, unknown>,
    body: null as any,
    setHeader(k: string, v: unknown) {
      this.headers[k] = v;
      return this;
    },
    status(n: number) {
      this.statusCode = n;
      return this;
    },
    json(body: unknown) {
      this.body = body;
      return this;
    },
  };
}
async function call(endpoint: string, req: Record<string, unknown>) {
  const r = response();
  await handler(endpoint)(
    {
      method: 'POST',
      headers: { origin: 'https://example.invalid' },
      ...req,
    } as any,
    r as any,
  );
  return r;
}
beforeEach(() => {
  vi.resetAllMocks();
  process.env.JWT_SESSION_SECRET = 'a'.repeat(48);
  process.env.GAS_SHARED_SECRET = 'b'.repeat(48);
  process.env.PUBLIC_SITE_URL = 'https://example.invalid';
  process.env.GOOGLE_CLIENT_ID = 'client';
  process.env.ADMIN_EMAILS = 'admin@example.invalid';
});
describe('API boundaries', () => {
  it('serves public content with shared caching only on public endpoint', async () => {
    mocks.backend.mockResolvedValue({ News: [] });
    const r = await call('public', { method: 'GET' });
    expect(r.statusCode).toBe(200);
    expect(r.headers['Cache-Control']).toContain('s-maxage');
  });
  it('rejects unauthorized admin requests', async () =>
    expect((await call('admin', { body: {} })).statusCode).toBe(401));
  it('rejects an invalid Google ID token', async () => {
    mocks.verify.mockRejectedValue(Error('bad'));
    expect(
      (await call('login', { body: { credential: 'bad' } })).statusCode,
    ).toBe(401);
  });
  it('expires and rejects tampered sessions', () => {
    const data = Buffer.from(
      JSON.stringify({ sub: 'admin', exp: Date.now() - 1, csrf: 'a' }),
    ).toString('base64url');
    expect(() =>
      readSession(
        `nadi_session=${data}.${sign(data, process.env.JWT_SESSION_SECRET!)}`,
      ),
    ).toThrow('berakhir');
    expect(() => readSession('nadi_session=bad.wrong')).toThrow();
  });
  it('sets HttpOnly Secure SameSite cookies after verified Google login', async () => {
    mocks.verify.mockResolvedValue({
      getPayload: () => ({
        sub: 'valid',
        email: 'admin@example.invalid',
        email_verified: true,
      }),
    });
    mocks.backend.mockResolvedValue({ role: 'Super Admin' });
    const r = await call('login', { body: { credential: 'valid' } });
    expect(r.statusCode).toBe(200);
    expect(r.headers['Set-Cookie']).toContain(
      'HttpOnly; Secure; SameSite=Strict',
    );
  });
  it('rejects unverified identity and cross origin login', async () => {
    mocks.verify.mockResolvedValue({
      getPayload: () => ({ sub: 'valid', email_verified: false }),
    });
    expect(
      (await call('login', { body: { credential: 'x' } })).statusCode,
    ).toBe(401);
    expect(
      (
        await call('login', {
          headers: { origin: 'https://evil.invalid' },
          body: { credential: 'x' },
        })
      ).statusCode,
    ).toBe(403);
  });
  it('checks role restrictions and CSRF', async () => {
    const { token, session } = encodeSession('editor');
    mocks.backend.mockResolvedValue({ role: 'Editor Konten' });
    const headers = {
      origin: 'https://example.invalid',
      cookie: `nadi_session=${token}`,
      'x-csrf-token': session.csrf,
    };
    expect(
      (
        await call('admin', {
          headers,
          body: { operation: 'list', entity: 'Budgets' },
        })
      ).statusCode,
    ).toBe(403);
    expect(
      (
        await call('admin', {
          headers: { ...headers, 'x-csrf-token': '' },
          body: { operation: 'list', entity: 'News' },
        })
      ).statusCode,
    ).toBe(403);
  });
  it('denies unknown roles and validates payload', async () => {
    expect(can('unknown', 'content')).toBe(false);
    expect(submissionSchema.safeParse({ subject: 'x' }).success).toBe(false);
    expect(
      (await call('complaints', { body: { subject: 'x' } })).statusCode,
    ).toBe(400);
  });
  it('rejects unsupported HTTP methods', async () =>
    expect((await call('admin', { method: 'GET' })).statusCode).toBe(405));
});

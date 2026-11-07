import type {
  ApiRequest as VercelRequest,
  ApiResponse as VercelResponse,
} from './http';
import { OAuth2Client } from 'google-auth-library';
import { z } from 'zod';
import { backend } from './backend';
import {
  ApiError,
  can,
  constantEqual,
  encodeSession,
  readSession,
  scope,
} from './security';
import { createHash, randomUUID } from 'node:crypto';
export const submissionSchema = z
  .object({
    kind: z.enum(['services', 'complaints', 'proposals']),
    serviceId: z.string().max(100).optional(),
    category: z.string().max(100).optional(),
    locationCategory: z.string().max(100).optional(),
    subject: z.string().trim().min(5).max(160),
    description: z.string().trim().min(15).max(2000),
    consent: z.literal(true),
    website: z.literal(''),
    idempotencyKey: z.uuid(),
  })
  .strict();
const trackSchema = z
  .object({
    reference: z.string().min(10).max(100),
    verification: z.string().min(32).max(128),
  })
  .strict();
const adminSchema = z
  .object({
    operation: z.enum([
      'list',
      'save',
      'archive',
      'deleteDraft',
      'transition',
      'media',
    ]),
    entity: z.string().max(50),
    id: z.string().max(100).optional(),
    record: z
      .record(
        z.string(),
        z.union([z.string().max(20000), z.number().finite(), z.boolean()]),
      )
      .optional(),
    status: z.string().max(60).optional(),
    note: z.string().max(2000).optional(),
  })
  .strict();
function body(req: VercelRequest) {
  const b = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
  if (JSON.stringify(b ?? {}).length > 100000)
    throw new ApiError(413, 'TOO_LARGE', 'Permintaan terlalu besar.');
  return b;
}
function origin(req: VercelRequest) {
  if (
    !process.env.PUBLIC_SITE_URL ||
    req.headers.origin !== new URL(process.env.PUBLIC_SITE_URL).origin
  )
    throw new ApiError(403, 'ORIGIN', 'Asal permintaan tidak diizinkan.');
}
function requireAdminAllowlist(role: string, email: string) {
  if (
    role === 'Super Admin' &&
    !(process.env.ADMIN_EMAILS || '')
      .split(',')
      .map((s) => s.trim().toLowerCase())
      .includes(email.toLowerCase())
  )
    throw new ApiError(
      403,
      'FORBIDDEN',
      'Administrator tidak ada pada allowlist deployment.',
    );
}
async function staff(req: VercelRequest) {
  const s = readSession(req.headers.cookie);
  const user = (await backend('user', { sub: s.sub })) as {
    googleSub: string;
    role: string;
    displayName: string;
    email: string;
  };
  requireAdminAllowlist(user.role, user.email);
  if (req.method !== 'GET') {
    origin(req);
    if (!constantEqual(String(req.headers['x-csrf-token'] || ''), s.csrf))
      throw new ApiError(403, 'CSRF', 'Verifikasi permintaan gagal.');
  }
  return { s, user };
}
export function handler(endpoint: string) {
  return async (req: VercelRequest, res: VercelResponse) => {
    const requestId = randomUUID();
    res.setHeader('Cache-Control', 'no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    try {
      const allowed =
        endpoint === 'health' || endpoint === 'public' || endpoint === 'me'
          ? ['GET']
          : ['POST'];
      if (!allowed.includes(req.method || '')) {
        res.setHeader('Allow', allowed.join(', '));
        throw new ApiError(405, 'METHOD', 'Metode tidak diizinkan.');
      }
      if (endpoint === 'health')
        return res.status(200).json({
          success: true,
          data: {
            status: 'ok',
            backendConfigured: Boolean(process.env.GAS_WEB_APP_URL),
          },
          requestId,
        });
      if (endpoint === 'public') {
        const data = await backend('public');
        res.setHeader(
          'Cache-Control',
          'public, s-maxage=30, stale-while-revalidate=60',
        );
        return res.json({ success: true, data, requestId });
      }
      if (endpoint === 'login') {
        origin(req);
        const { credential } = z
          .object({ credential: z.string().max(10000) })
          .strict()
          .parse(body(req));
        if (!process.env.GOOGLE_CLIENT_ID)
          throw new ApiError(
            503,
            'CONFIGURATION',
            'Login Google belum dikonfigurasi.',
          );
        let identity;
        try {
          identity = (
            await new OAuth2Client(process.env.GOOGLE_CLIENT_ID).verifyIdToken({
              idToken: credential,
              audience: process.env.GOOGLE_CLIENT_ID,
            })
          ).getPayload();
        } catch {
          throw new ApiError(
            401,
            'INVALID_TOKEN',
            'Identitas Google tidak valid.',
          );
        }
        if (!identity?.sub || !identity.email_verified)
          throw new ApiError(
            401,
            'INVALID_TOKEN',
            'Identitas Google belum terverifikasi.',
          );
        const account = (await backend('user', { sub: identity.sub })) as {
          role: string;
        };
        requireAdminAllowlist(account.role, identity.email || '');
        const { token, session } = encodeSession(identity.sub);
        res.setHeader(
          'Set-Cookie',
          `nadi_session=${token}; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=28800`,
        );
        return res.json({
          success: true,
          data: { csrf: session.csrf },
          requestId,
        });
      }
      if (endpoint === 'me') {
        const { s, user } = await staff(req);
        return res.json({
          success: true,
          data: { ...user, csrf: s.csrf },
          requestId,
        });
      }
      if (endpoint === 'logout') {
        await staff(req);
        res.setHeader(
          'Set-Cookie',
          'nadi_session=; HttpOnly; Secure; SameSite=Strict; Path=/; Max-Age=0',
        );
        return res.json({ success: true, data: null, requestId });
      }
      if (endpoint === 'admin') {
        const { s, user } = await staff(req);
        const params = adminSchema.parse(body(req));
        if (!can(user.role, scope(params.entity)))
          throw new ApiError(403, 'FORBIDDEN', 'Hak akses tidak mencukupi.');
        const data = await backend('admin', params, { sub: s.sub });
        return res.json({ success: true, data, requestId });
      }
      origin(req);
      const raw = body(req);
      const operation = raw?.operation;
      if (operation === 'track') {
        const p = trackSchema.parse(raw.params);
        const data = await backend('track', { ...p, kind: endpoint });
        return res.json({ success: true, data, requestId });
      }
      const input = submissionSchema.parse({ ...raw, kind: endpoint });
      // Vercel supplies x-real-ip; hash it before persistence. Durable counters live in Sheets.
      const ip = String(
        req.headers['x-real-ip'] || req.headers['x-forwarded-for'] || 'unknown',
      ).split(',')[0];
      const clientHash = createHash('sha256')
        .update(ip + (process.env.GAS_SHARED_SECRET || ''))
        .digest('hex');
      const data = await backend('submit', { ...input, clientHash });
      return res.status(201).json({ success: true, data, requestId });
    } catch (error) {
      const err =
        error instanceof ApiError
          ? error
          : error instanceof z.ZodError || error instanceof SyntaxError
            ? new ApiError(
                400,
                'VALIDATION',
                'Periksa kelengkapan dan format isian.',
              )
            : new ApiError(500, 'INTERNAL', 'Permintaan tidak dapat diproses.');
      return res.status(err.status).json({
        success: false,
        error: { code: err.code, message: err.message },
        requestId,
      });
    }
  };
}

import { beforeEach, describe, expect, it } from 'vitest';
import { gas } from './gas-harness';
let g: ReturnType<typeof gas>;
beforeEach(() => (g = gas()));
describe('Sheets backend — deterministic Apps Script runtime', () => {
  it('initializes all sheets and preserves records on repeat setup', () => {
    g.ctx.put('News', { id: 'persist', title: 'Titre' });
    g.ctx.setupDatabase();
    expect(g.tables.size).toBe(25);
    expect(g.ctx.rows('News')[0].id).toBe('persist');
  });
  it('preserves existing header order during additive migrations', () => {
    g.tables.set('News', [
      ['id', 'title'],
      ['one', 'Conservé'],
    ]);
    g.ctx.setupDatabase();
    expect(g.ctx.rows('News')[0].title).toBe('Conservé');
  });
  it('rejects an invalid HMAC', () =>
    expect(
      g.call('public', {}, null, { signature: '0'.repeat(64) }).error.code,
    ).toBe('INVALID_SIGNATURE'));
  it('rejects expired envelopes', () =>
    expect(
      g.call('public', {}, null, { timestamp: Date.now() - 400000 }).error.code,
    ).toBe('EXPIRED'));
  it('persists nonces and prevents replay', () => {
    const original = g.ctx.verifyEnvelope;
    let saved: any;
    g.ctx.verifyEnvelope = (e: any) => {
      saved = e;
      return original(e);
    };
    expect(g.call('public').success).toBe(true);
    expect(() => original(saved)).toThrow('Permintaan telah digunakan');
  });
  it('rejects unknown actions and anonymous administration', () => {
    expect(g.call('bad').error.code).toBe('UNKNOWN_ACTION');
    expect(
      g.call('admin', { entity: 'News', operation: 'list' }, null).error.code,
    ).toBe('UNAUTHORIZED');
  });
  it('persists create, publish, edit and archive with public separation and audit', () => {
    let result = g.call('admin', {
      entity: 'News',
      operation: 'save',
      record: {
        title: 'Berita pengujian',
        slug: 'berita-pengujian',
        content: 'Teks aman',
        status: 'draft',
      },
    });
    expect(result.success).toBe(true);
    const id = result.data.id;
    expect(g.call('public').data.News).toHaveLength(0);
    expect(
      g.call('admin', {
        entity: 'News',
        operation: 'save',
        id,
        record: { status: 'published' },
      }).success,
    ).toBe(true);
    expect(g.call('public').data.News[0].title).toBe('Berita pengujian');
    g.call('admin', {
      entity: 'News',
      operation: 'save',
      id,
      record: { title: 'Berita diperbarui' },
    });
    expect(g.call('public').data.News[0].title).toBe('Berita diperbarui');
    g.call('admin', { entity: 'News', operation: 'archive', id });
    expect(g.call('public').data.News).toHaveLength(0);
    expect(g.ctx.rows('AuditLogs')).toHaveLength(4);
  });
  it('rejects invalid values, duplicate slugs and formula injection', () => {
    expect(g.ctx.safeCell(' =IMPORTXML()')).toBe("' =IMPORTXML()");
    expect(g.ctx.safeCell('@SUM()')).toBe("'@SUM()");
    const p = {
      entity: 'News',
      operation: 'save',
      record: { title: 'Berita', slug: 'unik', content: 'Isi' },
    };
    expect(g.call('admin', p).success).toBe(true);
    expect(g.call('admin', p).error.code).toBe('CONFLICT');
    expect(
      g.call('admin', {
        entity: 'Budgets',
        operation: 'save',
        record: { plannedAmount: -1 },
      }).error.code,
    ).toBe('VALIDATION');
  });
  it('checks authorization on every operation and immediately revokes disabled accounts', () => {
    g.ctx.put('Users', {
      id: 'editor',
      googleSub: 'editor-sub',
      role: 'Editor Konten',
      status: 'active',
    });
    expect(
      g.call(
        'admin',
        { entity: 'Budgets', operation: 'list' },
        { sub: 'editor-sub' },
      ).error.code,
    ).toBe('FORBIDDEN');
    g.ctx.put('Users', {
      id: 'editor',
      googleSub: 'editor-sub',
      role: 'Editor Konten',
      status: 'disabled',
    });
    expect(
      g.call(
        'admin',
        { entity: 'News', operation: 'list' },
        { sub: 'editor-sub' },
      ).error.code,
    ).toBe('UNAUTHORIZED');
  });
  it('requires business consent and financial sources before publication', () => {
    expect(
      g.call('admin', {
        entity: 'Businesses',
        operation: 'save',
        record: { name: 'Usaha Uji', status: 'published' },
      }).error.code,
    ).toBe('VALIDATION');
    expect(
      g.call('admin', {
        entity: 'Budgets',
        operation: 'save',
        record: { category: 'Uji', publicationStatus: 'published' },
      }).error.code,
    ).toBe('VALIDATION');
  });
  it('prevents scheduling future articles into public responses', () => {
    g.ctx.put('News', {
      id: 'future',
      status: 'published',
      publishedAt: '2200-01-01',
    });
    expect(g.call('public').data.News).toHaveLength(0);
  });
  const input = () => ({
    kind: 'complaints',
    subject: 'Jalan umum',
    description: 'Permintaan pengujian non sensitif.',
    category: 'Fasilitas',
    locationCategory: 'Umum',
    consent: true,
    website: '',
    idempotencyKey: '11111111-1111-4111-8111-111111111111',
    clientHash: 'test-ip',
  });
  it('persists one request on duplicate submission and requires a second tracking factor', () => {
    const r = g.call('submit', input());
    expect(r.success).toBe(true);
    expect(g.call('submit', input()).data).toEqual(r.data);
    expect(g.ctx.rows('Complaints')).toHaveLength(1);
    expect(
      g.call('track', {
        kind: 'complaints',
        reference: r.data.reference,
        verification: 'x'.repeat(72),
      }).error.code,
    ).toBe('NOT_FOUND');
    const tracked = g.call('track', {
      kind: 'complaints',
      reference: r.data.reference,
      verification: r.data.verification,
    });
    expect(tracked.data.status).toBe('Submitted');
    expect(tracked.data.description).toBeUndefined();
    expect(g.call('public').data.Complaints).toBeUndefined();
  });
  it('repairs an interrupted submission from its journal without duplicates', () => {
    const original = g.ctx.put;
    let broken = true;
    g.ctx.put = (name: string, r: any) => {
      if (name === 'Complaints' && broken) {
        broken = false;
        throw Error('simulated write interruption');
      }
      return original(name, r);
    };
    expect(g.call('submit', input()).success).toBe(false);
    expect(g.call('submit', input()).success).toBe(true);
    expect(g.ctx.rows('Complaints')).toHaveLength(1);
    expect(g.ctx.rows('RequestHistory')).toHaveLength(1);
  });
  it('operator transitions are visible through verified tracking with private notes excluded', () => {
    const r = g.call('submit', input()).data;
    g.ctx.put('Users', {
      id: 'op',
      googleSub: 'operator',
      role: 'Operator Pengaduan',
      status: 'active',
    });
    expect(
      g.call(
        'admin',
        {
          entity: 'Complaints',
          operation: 'transition',
          id: r.id,
          status: 'Under Review',
          note: 'Catatan rahasia',
        },
        { sub: 'operator' },
      ).success,
    ).toBe(true);
    const t = g.call('track', {
      kind: 'complaints',
      reference: r.reference,
      verification: r.verification,
    });
    expect(t.data.status).toBe('Under Review');
    expect(JSON.stringify(t)).not.toContain('rahasia');
    expect(
      g.call('admin', {
        entity: 'Complaints',
        operation: 'transition',
        id: r.id,
        status: 'Completed',
      }).error.code,
    ).toBe('VALIDATION');
  });
  it('limits durable submissions and rejects reuse with a different payload', () => {
    g.call('submit', input());
    expect(
      g.call('submit', { ...input(), subject: 'Hal berbeda' }).error.code,
    ).toBe('CONFLICT');
    for (let i = 0; i < 4; i++)
      expect(
        g.call('submit', {
          ...input(),
          idempotencyKey: `22222222-2222-4222-8222-${String(i).padStart(12, '0')}`,
        }).success,
      ).toBe(true);
    expect(
      g.call('submit', {
        ...input(),
        idempotencyKey: '33333333-3333-4333-8333-333333333333',
      }).error.code,
    ).toBe('RATE_LIMIT');
  });
  it('fails closed if pilot privacy requirements are not configured', () => {
    g.tables.set('SiteSettings', [['key', 'value', 'updatedAt', 'updatedBy']]);
    expect(g.call('submit', input()).error.code).toBe('CONFIGURATION');
  });
  it('serializes critical write paths with a script lock', () => {
    let waited = 0,
      released = 0;
    g.ctx.LockService.getScriptLock = () => ({
      waitLock: () => waited++,
      hasLock: () => true,
      releaseLock: () => released++,
    });
    g.call('submit', input());
    expect(waited).toBe(1);
    expect(released).toBe(1);
  });
});

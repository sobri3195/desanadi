var ROLES = {
  'Super Admin': ['*'],
  'Admin Desa': [
    'content',
    'finance',
    'services',
    'complaints',
    'health',
    'readiness',
  ],
  'Editor Konten': ['content'],
  'Operator Layanan': ['services'],
  'Operator Pengaduan': ['complaints'],
  'Pengelola Informasi Kesehatan': ['health'],
  Viewer: [],
};
function entityScope(entity) {
  if (['ServiceRequests', 'Services', 'Proposals'].indexOf(entity) >= 0)
    return 'services';
  if (entity === 'Complaints') return 'complaints';
  if (entity === 'HealthAgenda') return 'health';
  if (['Budgets', 'Projects'].indexOf(entity) >= 0) return 'finance';
  if (entity === 'Readiness') return 'readiness';
  if (['Users', 'AuditLogs', 'SiteSettings'].indexOf(entity) >= 0) return '*';
  return 'content';
}
function activeUser(sub) {
  var u = rows('Users').find(function (r) {
    return r.googleSub === sub && r.status === 'active';
  });
  if (!u) fail('UNAUTHORIZED', 'Akun tidak aktif atau belum diberi akses.');
  return {
    googleSub: u.googleSub,
    role: u.role,
    displayName: u.displayName,
    email: u.email,
  };
}
function authorize(actor, entity) {
  if (!actor || !actor.sub) fail('UNAUTHORIZED', 'Silakan masuk.');
  var u = activeUser(actor.sub),
    p = ROLES[u.role] || [];
  if (p.indexOf('*') < 0 && p.indexOf(entityScope(entity)) < 0)
    fail('FORBIDDEN', 'Hak akses tidak mencukupi.');
  return u;
}
function verifyEnvelope(envelope) {
  var t = envelope.timestamp,
    n = envelope.nonce,
    p = envelope.payloadJson;
  if (typeof t !== 'number' || Math.abs(Date.now() - t) > 300000)
    fail('EXPIRED', 'Permintaan kedaluwarsa.');
  if (
    typeof n !== 'string' ||
    !/^[a-f0-9]{48}$/.test(n) ||
    typeof p !== 'string' ||
    p.length > 100000
  )
    fail('VALIDATION', 'Format permintaan tidak valid.');
  var key =
    PropertiesService.getScriptProperties().getProperty('GAS_SHARED_SECRET');
  if (!key || key.length < 32)
    fail('CONFIGURATION', 'Rahasia belum dikonfigurasi.');
  var expected = Utilities.computeHmacSha256Signature(
    t + '\n' + n + '\n' + p,
    key,
    Utilities.Charset.UTF_8,
  )
    .map(function (b) {
      return ('0' + ((b + 256) % 256).toString(16)).slice(-2);
    })
    .join('');
  if (!equal(expected, envelope.signature))
    fail('INVALID_SIGNATURE', 'Tanda tangan tidak valid.');
  if (
    rows('ReplayNonces').some(function (r) {
      return r.id === n;
    })
  )
    fail('REPLAY', 'Permintaan telah digunakan.');
  put('ReplayNonces', { id: n, expiresAt: new Date(t + 300000).toISOString() });
  return JSON.parse(p);
}
function rateLimit(key, limit, windowMs) {
  var id = hash(key + ':' + Math.floor(Date.now() / windowMs)),
    old = rows('RateLimits').find(function (r) {
      return r.id === id;
    }),
    count = old ? Number(old.count) + 1 : 1;
  if (count > limit)
    fail('RATE_LIMIT', 'Batas permintaan tercapai. Coba lagi nanti.');
  put('RateLimits', {
    id: id,
    count: count,
    expiresAt: new Date(Date.now() + windowMs).toISOString(),
  });
}

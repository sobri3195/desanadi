var PUBLIC_ENTITIES = [
  'VillageProfile',
  'Officials',
  'News',
  'Announcements',
  'Budgets',
  'Projects',
  'Services',
  'Businesses',
  'Tourism',
  'HealthAgenda',
  'PopulationStats',
  'FAQ',
  'Media',
  'Activities',
];
var ADMIN_ENTITIES = PUBLIC_ENTITIES.concat([
  'SiteSettings',
  'ServiceRequests',
  'Complaints',
  'Proposals',
  'Users',
  'AuditLogs',
  'Readiness',
]);
var REQUEST_STATUSES = [
  'Submitted',
  'Under Review',
  'Additional Information Required',
  'In Progress',
  'Completed',
  'Rejected',
  'Cancelled',
];
var TRANSITIONS = {
  Submitted: ['Under Review', 'Cancelled'],
  'Under Review': [
    'Additional Information Required',
    'In Progress',
    'Rejected',
    'Cancelled',
  ],
  'Additional Information Required': ['Under Review', 'Cancelled'],
  'In Progress': ['Completed', 'Rejected', 'Cancelled'],
  Completed: [],
  Rejected: ['Under Review'],
  Cancelled: [],
};
function text(value, min, max) {
  if (
    typeof value !== 'string' ||
    value.trim().length < min ||
    value.length > max
  )
    fail('VALIDATION', 'Panjang teks tidak valid.');
  return value.trim();
}
function validateRecord(entity, input, old, actor) {
  if (!input || typeof input !== 'object' || Array.isArray(input))
    fail('VALIDATION', 'Data tidak valid.');
  var record = Object.assign({}, old || {}),
    allowed = SCHEMA[entity];
  Object.keys(input).forEach(function (k) {
    if (allowed.indexOf(k) < 0) fail('VALIDATION', 'Kolom tidak diizinkan.');
    var v = input[k];
    if (
      !['string', 'number', 'boolean'].includes(typeof v) ||
      (typeof v === 'string' && v.length > 20000)
    )
      fail('VALIDATION', 'Nilai kolom tidak valid.');
    record[k] = v;
  });
  if (entity === 'SiteSettings') {
    text(record.key, 1, 80);
    if (
      ![
        'villageName',
        'region',
        'logoUrl',
        'heroUrl',
        'welcome',
        'contact',
        'officeHours',
        'headMessage',
        'retentionDays',
        'privacyNotice',
      ].includes(record.key)
    )
      fail('VALIDATION', 'Pengaturan tidak dikenal.');
  } else record.id = old ? old.id : uuid();
  [
    'plannedAmount',
    'realizedAmount',
    'budgetAmount',
    'value',
    'displayOrder',
    'progress',
    'fiscalYear',
    'reportingYear',
  ].forEach(function (k) {
    if (record[k] !== undefined && record[k] !== '') {
      var n = Number(record[k]);
      if (
        !isFinite(n) ||
        n < 0 ||
        (k === 'progress' && n > 100) ||
        (['fiscalYear', 'reportingYear'].includes(k) &&
          (!Number.isInteger(n) || n < 1900 || n > 2200))
      )
        fail('VALIDATION', 'Angka tidak valid.');
      record[k] = n;
    }
  });
  [
    'imageUrl',
    'photoUrl',
    'coverUrl',
    'locationUrl',
    'relatedUrl',
    'evidenceUrl',
    'sourceDocument',
    'logoUrl',
    'heroUrl',
    'publicContact',
  ].forEach(function (k) {
    var value = record[k];
    if (value && !/^https:\/\/[^\s]+$/.test(String(value)))
      fail('VALIDATION', 'Gunakan tautan HTTPS yang sah.');
  });
  if (
    entity === 'SiteSettings' &&
    ['logoUrl', 'heroUrl'].includes(record.key) &&
    record.value &&
    !/^https:\/\/[^\s]+$/.test(record.value)
  )
    fail('VALIDATION', 'Gunakan HTTPS untuk media.');
  var statusKey = allowed.includes('publicationStatus')
    ? 'publicationStatus'
    : 'status';
  if (PUBLIC_ENTITIES.includes(entity)) {
    record[statusKey] = record[statusKey] || 'draft';
    if (!['draft', 'published', 'archived'].includes(record[statusKey]))
      fail('VALIDATION', 'Status publikasi tidak valid.');
    if (record[statusKey] === 'published') {
      var label =
        record.title ||
        record.name ||
        record.question ||
        record.indicator ||
        record.category;
      if (!label) fail('VALIDATION', 'Isi judul atau nama sebelum publikasi.');
      if (entity === 'Businesses' && record.consentConfirmed !== true)
        fail('VALIDATION', 'Persetujuan pemilik UMKM wajib dicatat.');
      if (
        ['Budgets', 'PopulationStats'].includes(entity) &&
        !(record.sourceDocument || record.source)
      )
        fail('VALIDATION', 'Sumber data wajib diisi.');
      if (entity === 'News') {
        text(record.content, 1, 20000);
        record.publishedAt = record.publishedAt || now();
      }
    }
  }
  if (record.slug && !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(record.slug))
    fail('VALIDATION', 'Slug tidak valid.');
  if (entity === 'News' && !record.slug)
    fail('VALIDATION', 'Slug berita wajib diisi.');
  if (entity === 'Users') {
    if (old && record.googleSub !== old.googleSub)
      fail('VALIDATION', 'Identitas tetap tidak boleh diubah.');
    if (
      !ROLES[record.role] ||
      !['active', 'disabled'].includes(record.status) ||
      !record.googleSub
    )
      fail('VALIDATION', 'Identitas, peran, atau status tidak valid.');
    if (
      old &&
      old.googleSub === actor.sub &&
      (record.status !== 'active' || record.role !== 'Super Admin')
    )
      fail('VALIDATION', 'Jangan mencabut akun administrator sendiri.');
  }
  ['slug', 'googleSub', 'driveFileId'].forEach(function (k) {
    if (
      record[k] &&
      rows(entity).some(function (r) {
        return r.id !== record.id && r[k] === record[k];
      })
    )
      fail('CONFLICT', 'Nilai unik sudah digunakan.');
  });
  ['eventDate', 'startDate', 'endDate', 'publishedAt', 'reviewedAt'].forEach(
    function (k) {
      if (record[k] && isNaN(Date.parse(record[k])))
        fail('VALIDATION', 'Tanggal tidak valid.');
    },
  );
  if (allowed.includes('createdAt'))
    record.createdAt = old ? old.createdAt : now();
  if (allowed.includes('updatedAt')) record.updatedAt = now();
  if (allowed.includes('updatedBy')) record.updatedBy = actor.sub;
  if (allowed.includes('authorId'))
    record.authorId = old ? old.authorId : actor.sub;
  return record;
}

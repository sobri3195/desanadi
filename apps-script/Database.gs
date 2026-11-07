function fail(code, message) {
  var e = new Error(message);
  e.code = code;
  throw e;
}
function db() {
  var id =
    PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  if (!id) fail('CONFIGURATION', 'Basis data belum dikonfigurasi.');
  return SpreadsheetApp.openById(id);
}
function table(name) {
  if (!SCHEMA[name]) fail('VALIDATION', 'Jenis data tidak dikenal.');
  var s = db().getSheetByName(name);
  if (!s) fail('CONFIGURATION', 'Jalankan inisialisasi basis data.');
  return s;
}
function headers(s) {
  return s.getRange(1, 1, 1, s.getLastColumn()).getValues()[0];
}
function rows(name) {
  var s = table(name),
    h = headers(s);
  if (s.getLastRow() < 2) return [];
  return s
    .getRange(2, 1, s.getLastRow() - 1, h.length)
    .getValues()
    .map(function (r) {
      var o = {};
      h.forEach(function (k, i) {
        o[k] = r[i] instanceof Date ? r[i].toISOString() : r[i];
      });
      return o;
    });
}
function safeCell(v) {
  if (typeof v === 'string' && /^[\s]*[=+\-@]/.test(v)) return "'" + v;
  return v === undefined || v === null ? '' : v;
}
function put(name, record) {
  var s = table(name),
    h = headers(s),
    key = name === 'SiteSettings' ? 'key' : 'id',
    data = rows(name),
    index = data.findIndex(function (r) {
      return r[key] === record[key];
    });
  var row = h.map(function (k) {
    return safeCell(record[k]);
  });
  s.getRange(
    index < 0 ? s.getLastRow() + 1 : index + 2,
    1,
    1,
    h.length,
  ).setValues([row]);
  return record;
}
function erase(name, id) {
  var s = table(name),
    index = rows(name).findIndex(function (r) {
      return r.id === id;
    });
  if (index < 0) fail('NOT_FOUND', 'Data tidak ditemukan.');
  s.deleteRow(index + 2);
}
function now() {
  return new Date().toISOString();
}
function uuid() {
  return Utilities.getUuid();
}
function hash(value) {
  return Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    value,
    Utilities.Charset.UTF_8,
  )
    .map(function (b) {
      return ('0' + ((b + 256) % 256).toString(16)).slice(-2);
    })
    .join('');
}
function equal(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length)
    return false;
  var x = 0;
  for (var i = 0; i < a.length; i++) x |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return x === 0;
}
function audit(actor, action, entity, id, requestId) {
  put('AuditLogs', {
    id: uuid(),
    actorId: actor ? actor.sub : 'public',
    action: action,
    entityType: entity,
    entityId: id,
    timestamp: now(),
    summary: action + ' ' + entity,
    requestId: requestId,
  });
}
function setupDatabase() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    var book = db();
    Object.keys(SCHEMA).forEach(function (name) {
      var s = book.getSheetByName(name) || book.insertSheet(name);
      var existing = s.getLastRow() ? headers(s) : [];
      var missing = SCHEMA[name].filter(function (k) {
        return existing.indexOf(k) < 0;
      });
      if (missing.length)
        s.getRange(1, existing.length + 1, 1, missing.length).setValues([
          missing,
        ]);
      s.setFrozenRows(1);
    });
    PropertiesService.getScriptProperties().setProperty('SCHEMA_VERSION', '1');
  } finally {
    lock.releaseLock();
  }
}
// Run manually from the Apps Script editor; never exposed as a web action.
function provisionInitialAdmin(googleSub, email, displayName) {
  var allow = (
    PropertiesService.getScriptProperties().getProperty('ADMIN_EMAILS') || ''
  )
    .split(',')
    .map(function (s) {
      return s.trim().toLowerCase();
    });
  if (!googleSub || allow.indexOf(String(email).toLowerCase()) < 0)
    fail('FORBIDDEN', 'Administrator harus ada pada allowlist.');
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    if (
      rows('Users').some(function (r) {
        return r.googleSub === googleSub;
      })
    )
      fail('VALIDATION', 'Identitas sudah terdaftar.');
    put('Users', {
      id: uuid(),
      googleSub: googleSub,
      email: email,
      displayName: displayName,
      role: 'Super Admin',
      status: 'active',
      createdAt: now(),
      updatedAt: now(),
    });
  } finally {
    lock.releaseLock();
  }
}

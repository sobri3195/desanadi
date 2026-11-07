function requestEntity(kind) {
  if (kind === 'services') return 'ServiceRequests';
  if (kind === 'complaints') return 'Complaints';
  if (kind === 'proposals') return 'Proposals';
  fail('VALIDATION', 'Jenis permohonan tidak valid.');
}
function submitRequest(p, requestId) {
  var entity = requestEntity(p.kind);
  var settings = rows('SiteSettings');
  if (
    !settings.some(function (r) {
      return r.key === 'privacyNotice' && String(r.value).length > 30;
    }) ||
    !settings.some(function (r) {
      return r.key === 'contact' && r.value;
    }) ||
    !settings.some(function (r) {
      return r.key === 'retentionDays' && Number(r.value) >= 7;
    })
  )
    fail(
      'CONFIGURATION',
      'Pilot belum diotorisasi: lengkapi privasi, kontak, dan retensi.',
    );
  text(p.subject, 5, 160);
  text(p.description, 15, 2000);
  if (
    p.consent !== true ||
    p.website !== '' ||
    !/^[a-f0-9-]{36}$/.test(p.idempotencyKey)
  )
    fail('VALIDATION', 'Persetujuan atau kunci permohonan tidak valid.');
  if (
    p.kind === 'services' &&
    !rows('Services').some(function (r) {
      return r.id === p.serviceId && published(r);
    })
  )
    fail('VALIDATION', 'Layanan tidak tersedia.');
  var fingerprint = hash(
    JSON.stringify([
      p.kind,
      p.serviceId || '',
      p.category || '',
      p.locationCategory || '',
      p.subject,
      p.description,
    ]),
  );
  var existing = rows('Idempotency').find(function (r) {
    return r.id === p.idempotencyKey;
  });
  if (existing) {
    if (existing.fingerprint !== fingerprint)
      fail('CONFLICT', 'Kunci sudah dipakai untuk data berbeda.');
    var journal = JSON.parse(existing.result);
    ensureSubmission(entity, journal, requestId);
    return journal.receipt;
  }
  rateLimit('submit:' + p.clientHash, 5, 3600000);
  var id = uuid(),
    reference = 'NADI-' + uuid(),
    verification = uuid() + uuid(),
    record = {
      id: id,
      serviceId: p.serviceId || '',
      applicantReference: reference,
      referenceCode: reference,
      verificationHash: hash(verification),
      category: p.category || '',
      locationCategory: p.locationCategory || '',
      subject: p.subject,
      description: p.description,
      status: 'Submitted',
      assignedTo: '',
      createdAt: now(),
      updatedAt: now(),
    };
  // Persist the recovery receipt first. A retry repairs interrupted writes using the same ID and factor.
  var result = { reference: reference, verification: verification, id: id },
    journal = { receipt: result, record: record };
  put('Idempotency', {
    id: p.idempotencyKey,
    action: p.kind,
    fingerprint: fingerprint,
    result: JSON.stringify(journal),
    createdAt: now(),
  });
  ensureSubmission(entity, journal, requestId);
  return result;
}
function trackRequest(p) {
  var entity = requestEntity(p.kind);
  text(p.reference, 10, 100);
  text(p.verification, 32, 128);
  rateLimit('track:' + hash(p.reference), 20, 3600000);
  var r = rows(entity).find(function (r) {
    return (
      (r.referenceCode || r.applicantReference) === p.reference &&
      equal(r.verificationHash, hash(p.verification))
    );
  });
  if (!r) fail('NOT_FOUND', 'Referensi atau kunci verifikasi tidak cocok.');
  return {
    reference: p.reference,
    status: r.status,
    createdAt: r.createdAt,
    updatedAt: r.updatedAt,
    history: rows('RequestHistory')
      .filter(function (h) {
        return h.entityId === r.id;
      })
      .map(function (h) {
        return { status: h.status, createdAt: h.createdAt };
      }),
  };
}
function transition(entity, p, actor, requestId) {
  var r = rows(entity).find(function (r) {
    return r.id === p.id;
  });
  if (!r) fail('NOT_FOUND', 'Data tidak ditemukan.');
  if (!(TRANSITIONS[r.status] || []).includes(p.status))
    fail('VALIDATION', 'Perubahan status tidak diizinkan.');
  r.status = p.status;
  r.updatedAt = now();
  put(entity, r);
  put('RequestHistory', {
    id: uuid(),
    entityType: entity,
    entityId: r.id,
    status: p.status,
    note: p.note || '',
    actorId: actor.sub,
    createdAt: now(),
  });
  audit(actor, 'transition', entity, r.id, requestId);
  return { id: r.id, status: r.status };
}

function ensureSubmission(entity, journal, requestId) {
  var r = journal.record;
  if (
    !rows(entity).some(function (old) {
      return old.id === r.id;
    })
  )
    put(entity, r);
  if (
    !rows('RequestHistory').some(function (h) {
      return h.id === r.id + '-submit';
    })
  )
    put('RequestHistory', {
      id: r.id + '-submit',
      entityType: entity,
      entityId: r.id,
      status: 'Submitted',
      note: '',
      actorId: 'public',
      createdAt: r.createdAt,
    });
  if (
    !rows('AuditLogs').some(function (a) {
      return a.entityId === r.id && a.action === 'submit';
    })
  )
    audit(null, 'submit', entity, r.id, requestId);
}

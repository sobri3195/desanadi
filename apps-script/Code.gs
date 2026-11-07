function doPost(e) {
  var requestId = uuid(),
    lock = LockService.getScriptLock(),
    response;
  try {
    if (!e || !e.postData || e.postData.contents.length > 150000)
      fail('VALIDATION', 'Permintaan tidak valid.');
    lock.waitLock(25000);
    var payload = verifyEnvelope(JSON.parse(e.postData.contents)),
      p = payload.params || {},
      data;
    switch (payload.action) {
      case 'public':
        data = publicData();
        break;
      case 'user':
        data = activeUser(p.sub);
        break;
      case 'submit':
        data = submitRequest(p, requestId);
        break;
      case 'track':
        data = trackRequest(p);
        break;
      case 'admin':
        if (!ADMIN_ENTITIES.includes(p.entity))
          fail('VALIDATION', 'Jenis data tidak diizinkan.');
        authorize(payload.actor, p.entity);
        if (p.operation === 'list') {
          data = rows(p.entity).map(function (r) {
            var copy = Object.assign({}, r);
            delete copy.verificationHash;
            return copy;
          });
          break;
        }
        if (p.entity === 'AuditLogs')
          fail('FORBIDDEN', 'Log audit tidak dapat diubah.');
        if (['ServiceRequests', 'Complaints', 'Proposals'].includes(p.entity)) {
          if (p.operation !== 'transition')
            fail('FORBIDDEN', 'Gunakan perubahan status untuk permohonan.');
          data = transition(p.entity, p, payload.actor, requestId);
          break;
        }
        var old = rows(p.entity).find(function (r) {
          return p.entity === 'SiteSettings'
            ? r.key === (p.record || {}).key
            : r.id === p.id;
        });
        if (p.id && !old) fail('NOT_FOUND', 'Data tidak ditemukan.');
        if (p.operation === 'archive') {
          if (!old || p.entity === 'Users' || p.entity === 'SiteSettings')
            fail('VALIDATION', 'Pengarsipan tidak tersedia.');
          old[
            SCHEMA[p.entity].includes('publicationStatus')
              ? 'publicationStatus'
              : 'status'
          ] = 'archived';
          old.updatedAt = now();
          put(p.entity, old);
          data = old;
        } else if (p.operation === 'deleteDraft') {
          if (!old || (old.status || old.publicationStatus) !== 'draft')
            fail('FORBIDDEN', 'Hanya draf yang dapat dihapus.');
          erase(p.entity, p.id);
          data = { id: p.id };
        } else if (['save', 'media'].includes(p.operation)) {
          var input = p.entity === 'Media' ? registerMedia(p.record) : p.record;
          data = validateRecord(p.entity, input, old, payload.actor);
          put(p.entity, data);
        } else fail('VALIDATION', 'Operasi tidak dikenal.');
        audit(
          payload.actor,
          p.operation,
          p.entity,
          data.id || data.key,
          requestId,
        );
        break;
      default:
        fail('UNKNOWN_ACTION', 'Aksi tidak dikenal.');
    }
    response = { success: true, data: data, requestId: requestId };
  } catch (err) {
    response = {
      success: false,
      error: {
        code: err.code || 'INTERNAL',
        message: err.code ? err.message : 'Permintaan tidak dapat diproses.',
      },
      requestId: requestId,
    };
  } finally {
    if (lock.hasLock()) lock.releaseLock();
  }
  return ContentService.createTextOutput(JSON.stringify(response)).setMimeType(
    ContentService.MimeType.JSON,
  );
}
// Install a daily time trigger. Retention must be explicitly configured by the authorized controller.
function maintenance() {
  var lock = LockService.getScriptLock();
  lock.waitLock(30000);
  try {
    ['RateLimits', 'ReplayNonces'].forEach(function (entity) {
      rows(entity)
        .filter(function (r) {
          return Date.parse(r.expiresAt) < Date.now();
        })
        .reverse()
        .forEach(function (r) {
          erase(entity, r.id);
        });
    });
    var setting = rows('SiteSettings').find(function (r) {
        return r.key === 'retentionDays';
      }),
      days = setting ? Number(setting.value) : 0;
    if (days >= 7) {
      ['ServiceRequests', 'Complaints', 'Proposals'].forEach(function (entity) {
        rows(entity)
          .filter(function (r) {
            return (
              ['Completed', 'Rejected', 'Cancelled'].includes(r.status) &&
              Date.parse(r.updatedAt) < Date.now() - days * 86400000
            );
          })
          .forEach(function (r) {
            rows('RequestHistory')
              .filter(function (h) {
                return h.entityId === r.id;
              })
              .forEach(function (h) {
                erase('RequestHistory', h.id);
              });
            rows('Idempotency')
              .filter(function (i) {
                return JSON.parse(i.result).receipt.id === r.id;
              })
              .forEach(function (i) {
                erase('Idempotency', i.id);
              });
            erase(entity, r.id);
          });
      });
    }
  } finally {
    lock.releaseLock();
  }
}

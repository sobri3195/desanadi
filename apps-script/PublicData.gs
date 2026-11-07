function published(row) {
  if ((row.publicationStatus || row.status) !== 'published') return false;
  if (row.publishedAt && Date.parse(row.publishedAt) > Date.now()) return false;
  if (row.startDate && Date.parse(row.startDate) > Date.now()) return false;
  if (row.endDate && Date.parse(row.endDate) < Date.now()) return false;
  return true;
}
function publicData() {
  var data = {};
  PUBLIC_ENTITIES.forEach(function (entity) {
    data[entity] = rows(entity)
      .filter(published)
      .map(function (row) {
        var result = {};
        SCHEMA[entity].forEach(function (k) {
          if (
            ![
              'updatedBy',
              'authorId',
              'consentConfirmed',
              'driveFileId',
            ].includes(k)
          )
            result[k] = row[k];
        });
        return result;
      });
  });
  data.SiteSettings = rows('SiteSettings')
    .filter(function (r) {
      return [
        'villageName',
        'region',
        'logoUrl',
        'heroUrl',
        'welcome',
        'contact',
        'officeHours',
        'headMessage',
        'privacyNotice',
      ].includes(r.key);
    })
    .map(function (r) {
      return { key: r.key, value: r.value, updatedAt: r.updatedAt };
    });
  return data;
}
function registerMedia(record) {
  var id = text(record.driveFileId, 10, 150),
    file = DriveApp.getFileById(id),
    folderId =
      PropertiesService.getScriptProperties().getProperty('MEDIA_FOLDER_ID'),
    parents = file.getParents(),
    inside = false;
  while (parents.hasNext())
    if (parents.next().getId() === folderId) inside = true;
  if (!inside)
    fail('FORBIDDEN', 'Berkas harus berada di folder media yang diizinkan.');
  var type = file.getMimeType();
  if (
    !['image/jpeg', 'image/png', 'image/webp', 'application/pdf'].includes(
      type,
    ) ||
    file.getSize() > 10000000
  )
    fail('VALIDATION', 'Jenis atau ukuran berkas tidak didukung.');
  if (
    record.publicationStatus === 'published' &&
    file.getSharingAccess() !== DriveApp.Access.ANYONE_WITH_LINK &&
    file.getSharingAccess() !== DriveApp.Access.ANYONE
  )
    fail('VALIDATION', 'Berkas belum disetujui untuk akses publik.');
  return Object.assign({}, record, {
    mimeType: type,
    publicUrl:
      type === 'application/pdf'
        ? 'https://drive.google.com/file/d/' + id + '/view'
        : 'https://drive.google.com/thumbnail?id=' + id + '&sz=w1600',
  });
}

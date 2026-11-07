# Kamus data dan migrasi

Versi skema: 1. Semua waktu disimpan ISO 8601 UTC, ditampilkan Asia/Jakarta. ID UUID; jumlah uang bilangan non-negatif rupiah. Data teks disimpan sebagai teks aman terhadap formula.

## SiteSettings

`key, value, updatedAt, updatedBy`

## VillageProfile

`id, section, title, content, imageUrl, status, updatedAt, updatedBy`

## Officials

`id, name, position, description, photoUrl, displayOrder, status, updatedAt`

## News

`id, title, slug, category, excerpt, content, coverUrl, authorId, status, publishedAt, createdAt, updatedAt`

## Announcements

`id, title, content, category, startDate, endDate, status, createdAt, updatedAt`

## Budgets

`id, fiscalYear, category, description, plannedAmount, realizedAmount, publicationStatus, sourceDocument, updatedAt`

## Projects

`id, title, description, location, fiscalYear, budgetAmount, progress, status, imageUrl, updatedAt`

## Services

`id, name, slug, description, requirements, stages, processingTime, responsibleUnit, status, updatedAt`

## ServiceRequests

`id, serviceId, applicantReference, verificationHash, subject, description, status, assignedTo, createdAt, updatedAt`

## Complaints

`id, referenceCode, verificationHash, category, subject, description, locationCategory, status, assignedTo, createdAt, updatedAt`

## Businesses

`id, name, category, description, productName, publicContact, imageUrl, status, createdAt, updatedAt, consentConfirmed`

## Tourism

`id, name, slug, category, description, locationUrl, facilities, imageUrl, status, updatedAt`

## HealthAgenda

`id, title, category, description, location, eventDate, organizer, status, updatedAt`

## PopulationStats

`id, reportingYear, category, indicator, value, unit, source, publicationStatus, updatedAt`

## FAQ

`id, category, question, answer, relatedUrl, status, updatedAt`

## Users

`id, googleSub, email, displayName, role, status, createdAt, updatedAt`

## Media

`id, title, driveFileId, publicUrl, mimeType, category, publicationStatus, createdAt, altText, attribution`

## AuditLogs

`id, actorId, action, entityType, entityId, timestamp, summary, requestId`

## Activities

`id, title, description, eventDate, location, status, updatedAt`

## Proposals

`id, referenceCode, verificationHash, subject, description, status, assignedTo, createdAt, updatedAt`

## Readiness

`id, title, category, status, evidenceUrl, responsiblePerson, reviewedAt, issues, updatedAt`

## RequestHistory

`id, entityType, entityId, status, note, actorId, createdAt`

## Idempotency

`id, action, fingerprint, result, createdAt`

## RateLimits

`id, count, expiresAt`

## ReplayNonces

`id, expiresAt`

Sheet internal Idempotency, RateLimits, ReplayNonces dan RequestHistory tidak dipublikasikan. Tambahan consentConfirmed untuk persetujuan UMKM, altText/attribution untuk media. Activities, Proposals dan Readiness mendukung partisipasi dan checklist internal. setupDatabase hanya membuat sheet dan menambahkan kolom yang belum ada; urutan kolom dibaca berdasarkan header. Selalu salin spreadsheet sebelum migrasi. Pulihkan seluruh salinan spreadsheet dan arahkan SPREADSHEET_ID ke salinan yang diuji. Jangan menghapus riwayat idempotensi selama masa retensi permohonan.

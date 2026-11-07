import { Link } from 'react-router-dom';
import { FileText, ArrowUpRight, RefreshCw } from 'lucide-react';
import type { Row } from '../lib/schema';
import { date, rupiah } from '../lib/api';
export function Empty({
  text = 'Informasi belum dipublikasikan.',
}: {
  text?: string;
}) {
  return (
    <div className="empty">
      <FileText aria-hidden="true" />
      <h3>Belum ada informasi</h3>
      <p>{text}</p>
    </div>
  );
}
export function ErrorState({
  retry,
  message,
}: {
  retry: () => void;
  message: string;
}) {
  return (
    <div className="notice" role="alert">
      <h3>Informasi belum dapat dimuat</h3>
      <p>{message}</p>
      <button onClick={retry}>
        <RefreshCw size={16} />
        Coba lagi
      </button>
    </div>
  );
}
export function Loading() {
  return (
    <div role="status" className="skeleton">
      Memuat informasi desa…
    </div>
  );
}
export function Card({ row, entity }: { row: Row; entity: string }) {
  return (
    <article className="card">
      {Boolean(row.imageUrl || row.coverUrl || row.photoUrl) && (
        <img
          loading="lazy"
          src={String(row.imageUrl || row.coverUrl || row.photoUrl)}
          alt={String(row.altText || row.title || row.name || '')}
          referrerPolicy="no-referrer"
        />
      )}
      <div className="card-body">
        <span className="eyebrow">
          {String(
            row.category || row.section || row.position || 'Informasi desa',
          )}
        </span>
        <h3>
          {String(
            row.title ||
              row.name ||
              row.question ||
              row.indicator ||
              row.category ||
              'Informasi',
          )}
        </h3>
        <p className="prose">
          {String(
            row.excerpt || row.description || row.content || row.answer || '',
          )}
        </p>
        {entity === 'News' && (
          <Link to={`/berita/${row.slug}`}>
            Baca selengkapnya <ArrowUpRight size={15} />
          </Link>
        )}
        {entity === 'Services' && (
          <>
            <p>
              Persyaratan: {String(row.requirements || 'Hubungi unit terkait.')}
            </p>
            <p>Tahapan: {String(row.stages || 'Belum dikonfigurasi.')}</p>
            <p>
              {String(row.processingTime || '')} ·{' '}
              {String(row.responsibleUnit || '')}
            </p>
            <Link to={`/permohonan?service=${row.id}`}>
              Ajukan janji temu <ArrowUpRight size={15} />
            </Link>
          </>
        )}
        {entity === 'Budgets' && (
          <>
            <strong>{rupiah(row.plannedAmount)}</strong>
            <p>Realisasi: {rupiah(row.realizedAmount)}</p>
            <progress
              max={100}
              value={
                Number(row.plannedAmount)
                  ? Math.min(
                      100,
                      (Number(row.realizedAmount) / Number(row.plannedAmount)) *
                        100,
                    )
                  : 0
              }
              aria-label="Persentase realisasi"
            />
            {Boolean(row.sourceDocument) && (
              <a
                href={String(row.sourceDocument)}
                rel="noreferrer"
                target="_blank"
              >
                Dokumen sumber
              </a>
            )}
          </>
        )}
        {entity === 'PopulationStats' && (
          <>
            <strong className="stat-value">
              {String(row.value)} {String(row.unit)}
            </strong>
            <p>
              Sumber: {String(row.source)} · {String(row.reportingYear)}
            </p>
          </>
        )}
        {entity === 'Projects' && (
          <>
            <progress
              max={100}
              value={Number(row.progress) || 0}
              aria-label="Kemajuan pembangunan"
            />
            <p>
              {String(row.progress || 0)}% · {String(row.location || '')}
            </p>
          </>
        )}
        {entity === 'Businesses' && (
          <>
            <p>{String(row.productName || '')}</p>
            {Boolean(row.publicContact) && (
              <a
                href={String(row.publicContact)}
                rel="noreferrer"
                target="_blank"
              >
                Hubungi usaha
              </a>
            )}
          </>
        )}
        {entity === 'Tourism' && (
          <>
            <p>{String(row.facilities || '')}</p>
            {Boolean(row.locationUrl) && (
              <a
                href={String(row.locationUrl)}
                rel="noreferrer"
                target="_blank"
              >
                Lihat lokasi
              </a>
            )}
          </>
        )}
        {Boolean(row.eventDate) && (
          <p>
            {date(row.eventDate)} · {String(row.location || '')}
          </p>
        )}
        {Boolean(row.relatedUrl) && (
          <a href={String(row.relatedUrl)} rel="noreferrer" target="_blank">
            Lihat sumber
          </a>
        )}
        <small>Diperbarui {date(row.updatedAt || row.createdAt)}</small>
      </div>
    </article>
  );
}

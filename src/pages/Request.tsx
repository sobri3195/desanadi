import { useState, useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useLocation, useSearchParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api, type PublicData, date } from '../lib/api';
import { requestStatuses } from '../lib/modules';
const formSchema = z.object({
  serviceId: z.string(),
  category: z.string(),
  locationCategory: z.string(),
  subject: z.string().trim().min(5, 'Minimal 5 karakter.').max(160),
  description: z.string().trim().min(15, 'Minimal 15 karakter.').max(2000),
  consent: z.boolean().refine(Boolean, 'Persetujuan diperlukan.'),
  website: z.literal(''),
});
type Values = z.infer<typeof formSchema>;
export default function RequestPage() {
  const loc = useLocation(),
    [params] = useSearchParams();
  const kind =
    loc.pathname === '/pengaduan'
      ? 'complaints'
      : loc.pathname === '/usulan'
        ? 'proposals'
        : 'services';
  const tracking = loc.pathname === '/lacak';
  const [receipt, setReceipt] = useState<{
      reference: string;
      verification: string;
    } | null>(null),
    [error, setError] = useState(''),
    [status, setStatus] = useState<{
      status: string;
      updatedAt: string;
      history: { status: string; createdAt: string }[];
    } | null>(null),
    [busy, setBusy] = useState(false);
  const idempotency = useRef(crypto.randomUUID());
  const q = useQuery({
    queryKey: ['public'],
    queryFn: () => api<PublicData>('public'),
    enabled: !tracking && kind === 'services',
  });
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      serviceId: params.get('service') || '',
      category: '',
      locationCategory: '',
      subject: '',
      description: '',
      consent: false,
      website: '',
    },
  });
  async function submit(values: Values) {
    setError('');
    try {
      setReceipt(
        await api(kind, { ...values, idempotencyKey: idempotency.current }),
      );
    } catch (e) {
      setError((e as Error).message);
    }
  }
  return (
    <>
      <div className="page-banner">
        <div className="container">
          <span className="eyebrow">KANAL PARTISIPASI WARGA</span>
          <h1>
            {tracking
              ? 'Lacak Permohonan'
              : kind === 'complaints'
                ? 'Pengaduan & Aspirasi'
                : kind === 'proposals'
                  ? 'Usulan Pembangunan'
                  : 'Permohonan Janji Temu'}
          </h1>
          <p>Terhubung dengan pengelola desa melalui kanal yang terarah.</p>
        </div>
      </div>
      <section className="container section narrow">
        <div className="notice">
          Layanan ini merupakan pilot permohonan non-sensitif, bukan penerbitan
          dokumen elektronik yang mengikat secara hukum. Jangan masukkan NIK,
          foto KTP, informasi medis, identitas orang lain, atau data sensitif.{' '}
          <Link to="/privasi">Baca pemberitahuan privasi.</Link>
        </div>
        {error && (
          <p role="alert" className="notice danger">
            {error}
          </p>
        )}
        {receipt ? (
          <div className="card card-body" role="status">
            <h2>Permohonan tersimpan</h2>
            <p>
              Simpan kedua informasi ini. Kunci verifikasi hanya ditampilkan
              pada tanda terima ini, dan tidak disimpan pada peramban Anda.
            </p>
            <label>
              Referensi<output>{receipt.reference}</output>
            </label>
            <label>
              Kunci verifikasi<output>{receipt.verification}</output>
            </label>
            <button
              onClick={() => {
                const url = URL.createObjectURL(
                  new Blob(
                    [
                      `DESA NADI\nReferensi: ${receipt.reference}\nKunci: ${receipt.verification}\nJenis: ${kind}`,
                    ],
                    { type: 'text/plain' },
                  ),
                );
                const a = document.createElement('a');
                a.href = url;
                a.download = 'tanda-terima-nadi.txt';
                a.click();
                URL.revokeObjectURL(url);
              }}
            >
              Unduh tanda terima
            </button>
            <Link to="/lacak">Lacak status</Link>
          </div>
        ) : tracking ? (
          <>
            <form
              className="form card-body card"
              onSubmit={async (e) => {
                e.preventDefault();
                setBusy(true);
                setError('');
                setStatus(null);
                const data = new FormData(e.currentTarget);
                try {
                  setStatus(
                    await api(String(data.get('kind')), {
                      operation: 'track',
                      params: {
                        reference: data.get('reference'),
                        verification: data.get('verification'),
                      },
                    }),
                  );
                } catch (err) {
                  setError((err as Error).message);
                } finally {
                  setBusy(false);
                }
              }}
            >
              <label>
                Jenis permohonan
                <select name="kind">
                  <option value="services">Layanan</option>
                  <option value="complaints">Pengaduan</option>
                  <option value="proposals">Usulan</option>
                </select>
              </label>
              <label>
                Referensi
                <input
                  name="reference"
                  required
                  minLength={10}
                  autoComplete="off"
                />
              </label>
              <label>
                Kunci verifikasi
                <input
                  name="verification"
                  type="password"
                  required
                  minLength={32}
                  autoComplete="off"
                />
              </label>
              <button className="primary" disabled={busy}>
                {busy ? 'Memeriksa…' : 'Periksa status'}
              </button>
            </form>
            {status && (
              <div className="card card-body" role="status">
                <h2>{requestStatuses[status.status]}</h2>
                <p>Diperbarui {date(status.updatedAt)}</p>
                <ul>
                  {status.history.map((h, i) => (
                    <li key={i}>
                      {requestStatuses[h.status]} · {date(h.createdAt)}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        ) : (
          <form className="form card card-body" onSubmit={handleSubmit(submit)}>
            {kind === 'services' && (
              <label>
                Layanan
                <select {...register('serviceId')} required>
                  <option value="">Pilih layanan yang dipublikasikan</option>
                  {q.data?.Services?.map((r) => (
                    <option key={String(r.id)} value={String(r.id)}>
                      {String(r.name)}
                    </option>
                  ))}
                </select>
                {q.isError && <span role="alert">{q.error.message}</span>}
              </label>
            )}
            {kind === 'complaints' && (
              <>
                <label>
                  Kategori
                  <input
                    {...register('category')}
                    placeholder="Contoh: fasilitas umum"
                    maxLength={100}
                  />
                </label>
                <label>
                  Kategori lokasi
                  <input
                    {...register('locationCategory')}
                    placeholder="Contoh: ruang publik"
                    maxLength={100}
                  />
                </label>
              </>
            )}
            <label>
              Pokok permohonan
              <input {...register('subject')} aria-invalid={!!errors.subject} />
              {errors.subject && (
                <span role="alert">{errors.subject.message}</span>
              )}
            </label>
            <label>
              Uraian
              <textarea
                {...register('description')}
                rows={6}
                aria-invalid={!!errors.description}
              />
              {errors.description && (
                <span role="alert">{errors.description.message}</span>
              )}
            </label>
            <label className="honeypot" aria-hidden="true">
              Situs web
              <input
                {...register('website')}
                tabIndex={-1}
                autoComplete="off"
              />
            </label>
            <label className="check">
              <input type="checkbox" {...register('consent')} />
              Saya telah membaca pemberitahuan privasi dan memahami batasan
              pilot ini.
            </label>
            {errors.consent && (
              <span role="alert">{errors.consent.message}</span>
            )}
            <button
              className="primary"
              disabled={
                isSubmitting ||
                (kind === 'services' && !q.data?.Services?.length)
              }
            >
              {isSubmitting ? 'Mengirim…' : 'Kirim permohonan'}
            </button>
            <Link to="/lacak">Sudah memiliki referensi? Lacak status</Link>
          </form>
        )}
      </section>
    </>
  );
}

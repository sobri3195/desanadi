import { useEffect, useState } from 'react';
import {
  useLocation,
  useParams,
  useSearchParams,
  Link,
} from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { Search, Download } from 'lucide-react';
import { api, type PublicData, date } from '../lib/api';
import { modules } from '../lib/modules';
import { Card, Empty, ErrorState, Loading } from '../components/Content';
export default function PublicPage() {
  const location = useLocation(),
    { slug } = useParams(),
    [params] = useSearchParams();
  const module = modules.find(
    (m) => '/' + m.path === location.pathname.split('/').slice(0, 2).join('/'),
  );
  const [search, setSearch] = useState(params.get('q') || ''),
    [category, setCategory] = useState(''),
    [page, setPage] = useState(1);
  const q = useQuery({
    queryKey: ['public'],
    queryFn: () => api<PublicData>('public'),
  });
  useEffect(() => {
    setSearch(params.get('q') || '');
    setCategory('');
    setPage(1);
    document.title = `${module?.title || 'Informasi'} — DESA NADI`;
  }, [location.pathname]);
  if (!module)
    return (
      <div className="container section">
        <h1>Halaman tidak ditemukan</h1>
        <Link to="/">Kembali ke beranda</Link>
      </div>
    );
  let all =
    module.path === 'profil'
      ? [...(q.data?.VillageProfile || []), ...(q.data?.Officials || [])]
      : q.data?.[module.entity] || [];
  if (module.path === 'asisten')
    all = ['FAQ', 'Services', 'News', 'Announcements'].flatMap((e) =>
      (q.data?.[e] || []).map((r) => ({
        ...r,
        relatedUrl:
          r.relatedUrl ||
          `${window.location.origin}/${e === 'Services' ? 'layanan' : e === 'News' ? 'berita/' + r.slug : 'pengumuman'}`,
      })),
    );
  const categoryKey = module.entity === 'Budgets' ? 'fiscalYear' : 'category';
  const cats = [
    ...new Set(all.map((r) => String(r[categoryKey] || '')).filter(Boolean)),
  ];
  const filtered = all.filter(
    (r) =>
      (!category || String(r[categoryKey]) === category) &&
      (!search ||
        Object.values(r)
          .join(' ')
          .toLocaleLowerCase('id')
          .includes(search.toLocaleLowerCase('id'))),
  );
  if (slug) {
    const row = all.find((r) => r.slug === slug);
    return (
      <section className="container section narrow">
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <ErrorState message={q.error.message} retry={() => q.refetch()} />
        ) : row ? (
          <>
            <Link to="/berita">← Semua berita</Link>
            <span className="eyebrow">{String(row.category)}</span>
            <h1>{String(row.title)}</h1>
            <p>{date(row.publishedAt)}</p>
            {Boolean(row.coverUrl) && (
              <img
                className="article-cover"
                src={String(row.coverUrl)}
                alt={String(row.title)}
              />
            )}
            <div className="prose">{String(row.content)}</div>
          </>
        ) : (
          <Empty text="Berita tidak ditemukan atau belum dipublikasikan." />
        )}
      </section>
    );
  }
  function csv() {
    const keys = [
      'reportingYear',
      'category',
      'indicator',
      'value',
      'unit',
      'source',
      'updatedAt',
    ];
    const cell = (s: unknown) =>
      '"' +
      String(s ?? '')
        .replace(/^[\s]*[=+\-@]/, "'$&")
        .replaceAll('"', '""') +
      '"';
    const text = [
      keys.join(','),
      ...filtered.map((r) => keys.map((k) => cell(r[k])).join(',')),
    ].join('\r\n');
    const url = URL.createObjectURL(
      new Blob(['\uFEFF' + text], { type: 'text/csv;charset=utf-8' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'statistik-publik.csv';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="page-banner">
        <div className="container">
          <span className="eyebrow">DESA NADI / INFORMASI PUBLIK</span>
          <h1>{module.title}</h1>
          <p>{module.subtitle}</p>
        </div>
      </div>
      <section className="container section">
        {module.path === 'sehat' && (
          <div className="notice">
            Informasi ini untuk edukasi, bukan diagnosis atau anjuran
            pengobatan. Dalam keadaan darurat, hubungi fasilitas kesehatan
            setempat melalui kontak resmi yang telah diverifikasi pengelola.
          </div>
        )}
        {module.path === 'profil' && (
          <div className="subnav">
            {[
              'Sejarah',
              'Visi dan Misi',
              'Wilayah',
              'Pemerintahan',
              'Perangkat Desa',
              'Potensi',
              'Fasilitas',
              'Kontak',
            ].map((s) => (
              <button
                key={s}
                onClick={() => {
                  setSearch(s);
                  setPage(1);
                }}
              >
                {s}
              </button>
            ))}
            <button onClick={() => setSearch('')}>Semua</button>
          </div>
        )}
        {module.path === 'partisipasi' && (
          <Link className="button primary" to="/usulan">
            Ajukan usulan pembangunan
          </Link>
        )}
        <div className="filters">
          <label>
            <Search size={17} />
            <span className="sr-only">Cari informasi</span>
            <input
              value={search}
              placeholder="Cari informasi…"
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
          <label>
            <span className="sr-only">Filter kategori atau tahun</span>
            <select
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setPage(1);
              }}
            >
              <option value="">
                Semua {module.entity === 'Budgets' ? 'tahun' : 'kategori'}
              </option>
              {cats.map((c) => (
                <option key={c}>{c}</option>
              ))}
            </select>
          </label>
          {module.entity === 'PopulationStats' && (
            <button onClick={csv} disabled={!filtered.length}>
              <Download size={16} />
              Ekspor CSV
            </button>
          )}
        </div>
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <ErrorState message={q.error.message} retry={() => q.refetch()} />
        ) : (
          <>
            {module.entity === 'Budgets' && filtered.length > 0 && (
              <div
                className="chart"
                role="img"
                aria-label="Grafik anggaran dan realisasi; angka tersedia pada kartu di bawah"
              >
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={filtered}>
                    <XAxis dataKey="category" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar
                      dataKey="plannedAmount"
                      name="Anggaran"
                      fill="#12376B"
                    />
                    <Bar
                      dataKey="realizedAmount"
                      name="Realisasi"
                      fill="#16865D"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
            {filtered.length ? (
              <div className="card-grid three">
                {filtered.slice((page - 1) * 9, page * 9).map((r) => (
                  <Card key={String(r.id)} row={r} entity={module.entity} />
                ))}
              </div>
            ) : (
              <Empty
                text={
                  search
                    ? 'Tidak ditemukan informasi yang sesuai. Coba kata kunci lain.'
                    : 'Konten akan tersedia setelah dipublikasikan pengelola.'
                }
              />
            )}
            {filtered.length > 9 && (
              <div className="pagination">
                <button disabled={page === 1} onClick={() => setPage(page - 1)}>
                  Sebelumnya
                </button>
                <span>
                  Halaman {page} dari {Math.ceil(filtered.length / 9)}
                </span>
                <button
                  disabled={page * 9 >= filtered.length}
                  onClick={() => setPage(page + 1)}
                >
                  Berikutnya
                </button>
              </div>
            )}
          </>
        )}
      </section>
    </>
  );
}

import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  ArrowRight,
  ArrowUpRight,
  FileCheck,
  MessageSquare,
  ChartNoAxesCombined,
  Store,
  HeartPulse,
  Compass,
  CalendarDays,
  Search,
  Sprout,
  Landmark,
  BookOpen,
} from 'lucide-react';
import { api, type PublicData } from '../lib/api';
import { Card, Empty, ErrorState, Loading } from '../components/Content';
const shortcuts = [
  ['layanan', 'Layanan Desa', 'Persyaratan & janji temu', FileCheck],
  [
    'transparansi',
    'Transparansi',
    'Anggaran & pembangunan',
    ChartNoAxesCombined,
  ],
  ['pengaduan', 'Pengaduan', 'Sampaikan aspirasi Anda', MessageSquare],
  ['umkm', 'UMKM Desa', 'Dukung produk lokal', Store],
  ['sehat', 'Desa Sehat', 'Jadwal & edukasi kesehatan', HeartPulse],
  ['wisata', 'Wisata Desa', 'Temukan potensi desa', Compass],
] as const;
export default function Home() {
  const q = useQuery({
    queryKey: ['public'],
    queryFn: () => api<PublicData>('public'),
  });
  const setting = (key: string) =>
    String(q.data?.SiteSettings?.find((r) => r.key === key)?.value || '');
  return (
    <>
      <section className="hero">
        <div className="container hero-grid">
          <div>
            <span className="pill">
              <span />
              TERBUKA · TERHUBUNG · INKLUSIF
            </span>
            <h1>
              Desa yang terhubung.
              <br />
              <em>Warga yang berdaya.</em>
            </h1>
            <p>
              {setting('welcome') ||
                'Akses informasi desa, pantau pembangunan, dan sampaikan aspirasi Anda. Satu ruang digital untuk tumbuh bersama.'}
            </p>
            <div className="hero-actions">
              <Link className="button gold" to="/layanan">
                Temukan layanan <ArrowUpRight size={18} />
              </Link>
              <Link className="hero-link" to="/profil">
                Kenali desa kami <ArrowRight size={18} />
              </Link>
            </div>
            <form action="/asisten" className="hero-search">
              <Search size={19} />
              <label className="sr-only" htmlFor="home-search">
                Cari informasi desa
              </label>
              <input
                id="home-search"
                name="q"
                placeholder="Cari layanan, berita, atau informasi desa…"
              />
              <button type="submit" aria-label="Cari">
                <ArrowRight size={18} />
              </button>
            </form>
          </div>
          <div className="hero-art">
            {setting('heroUrl') ? (
              <img
                src={setting('heroUrl')}
                alt="Bentang desa yang dikonfigurasi pengelola"
              />
            ) : (
              <div
                className="landscape"
                role="img"
                aria-label="Ilustrasi bentang alam desa, bukan foto desa resmi"
              >
                <div className="sun" />
                <div className="hill hill-back" />
                <div className="hill hill-front" />
                <div className="field" />
                <Sprout className="sprout" size={90} />
                <span>Ruang tumbuh bersama</span>
              </div>
            )}
            <div className="hero-caption">
              <span className="caption-icon">
                <Landmark size={21} />
              </span>
              <div>
                <strong>
                  {setting('villageName') ||
                    'Identitas desa belum dikonfigurasi'}
                </strong>
                <small>
                  {setting('region') ||
                    'Foto dan identitas resmi diatur oleh pengelola.'}
                </small>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="container shortcuts" aria-label="Akses cepat">
        {shortcuts.map(([path, title, desc, Icon]) => (
          <Link to={'/' + path} key={path}>
            <span className={'shortcut-icon ' + path}>
              <Icon size={24} />
            </span>
            <strong>{title}</strong>
            <small>{desc}</small>
            <ArrowUpRight className="shortcut-arrow" size={16} />
          </Link>
        ))}
      </section>
      {Boolean(q.data?.PopulationStats?.length) && (
        <section className="container section">
          <span className="eyebrow">DATA DESA YANG DIPUBLIKASIKAN</span>
          <div className="feature-grid">
            {q.data?.PopulationStats?.slice(0, 3).map((r) => (
              <Card key={String(r.id)} row={r} entity="PopulationStats" />
            ))}
          </div>
          <Link to="/statistik">Semua statistik →</Link>
        </section>
      )}
      {Boolean(setting('headMessage')) && (
        <section className="container section">
          <span className="eyebrow">SAMBUTAN PEMERINTAH DESA</span>
          <p className="prose">{setting('headMessage')}</p>
        </section>
      )}
      <section className="container section">
        <div className="section-head">
          <div>
            <span className="eyebrow">KABAR DARI DESA</span>
            <h2>Informasi untuk Anda</h2>
            <p>Ikuti kabar, pengumuman, dan kegiatan masyarakat.</p>
          </div>
          <Link to="/berita">
            Semua berita <ArrowRight size={17} />
          </Link>
        </div>
        {q.isPending ? (
          <Loading />
        ) : q.isError ? (
          <ErrorState message={q.error.message} retry={() => q.refetch()} />
        ) : (
          <div className="news-layout">
            <div className="card-grid">
              {q.data.News?.length ? (
                q.data.News.slice(0, 2).map((r) => (
                  <Card key={String(r.id)} row={r} entity="News" />
                ))
              ) : (
                <Empty text="Berita desa akan tampil setelah disetujui pengelola." />
              )}
            </div>
            <aside className="announcement">
              <div className="section-head">
                <h3>
                  <CalendarDays size={20} />
                  Pengumuman
                </h3>
                <Link to="/pengumuman" aria-label="Semua pengumuman">
                  <ArrowUpRight size={18} />
                </Link>
              </div>
              {q.data.Announcements?.length ? (
                q.data.Announcements.slice(0, 3).map((r) => (
                  <Card key={String(r.id)} row={r} entity="Announcements" />
                ))
              ) : (
                <p>Belum ada pengumuman yang dipublikasikan.</p>
              )}
              <Link to="/partisipasi">
                Lihat agenda desa <ArrowRight size={16} />
              </Link>
            </aside>
          </div>
        )}
      </section>
      <section className="transparency-band">
        <div className="container band-grid">
          <div>
            <span className="eyebrow">PEMERINTAHAN YANG TERBUKA</span>
            <h2>
              Transparansi membangun
              <br />
              kepercayaan.
            </h2>
            <p>
              Pantau rencana anggaran, realisasi, dan kemajuan pembangunan
              melalui data yang telah disetujui.
            </p>
            <Link className="button primary" to="/transparansi">
              Lihat transparansi APBDes <ArrowUpRight size={17} />
            </Link>
          </div>
          <div className="transparency-card">
            <ChartNoAxesCombined size={36} />
            <h3>Setiap angka, ada sumbernya.</h3>
            <p>
              {q.data?.Budgets?.length
                ? `${q.data.Budgets.length} rincian anggaran telah dipublikasikan.`
                : 'Anggaran resmi belum dipublikasikan. Tidak ada angka contoh yang ditampilkan sebagai data desa.'}
            </p>
            <Link to="/proyek">
              Pantau proyek pembangunan <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>
      <section className="container section">
        <div className="section-head">
          <div>
            <span className="eyebrow">POTENSI & KEHIDUPAN DESA</span>
            <h2>Tumbuh dari desa, untuk semua.</h2>
          </div>
        </div>
        <div className="feature-grid">
          {[
            [
              'umkm',
              'Ekonomi yang bergerak',
              'Kenali usaha dan produk warga desa.',
              Store,
            ],
            [
              'sehat',
              'Bersama menjadi sehat',
              'Temukan jadwal dan informasi kesehatan.',
              HeartPulse,
            ],
            [
              'partisipasi',
              'Suara Anda berarti',
              'Ambil bagian dalam pembangunan desa.',
              BookOpen,
            ],
          ].map(([path, title, desc, Icon]) => {
            const I = Icon as typeof Store;
            return (
              <Link className="feature" key={String(path)} to={'/' + path}>
                <I size={28} />
                <h3>{String(title)}</h3>
                <p>{String(desc)}</p>
                <ArrowUpRight size={20} />
              </Link>
            );
          })}
        </div>
      </section>
      {[
        ['Projects', 'Pembangunan yang dapat dipantau', 'proyek'],
        ['Businesses', 'Produk dan usaha warga', 'umkm'],
        ['Tourism', 'Jelajahi potensi wisata', 'wisata'],
        ['Activities', 'Agenda bersama', 'partisipasi'],
        ['HealthAgenda', 'Jadwal layanan kesehatan', 'sehat'],
      ].map(([entity, title, path]) =>
        q.data?.[entity]?.length ? (
          <section className="container section" key={entity}>
            <div className="section-head">
              <h2>{title}</h2>
              <Link to={'/' + path}>
                Lihat semua <ArrowRight size={16} />
              </Link>
            </div>
            <div className="card-grid three">
              {q.data[entity].slice(0, 3).map((r) => (
                <Card key={String(r.id)} row={r} entity={entity} />
              ))}
            </div>
          </section>
        ) : null,
      )}
      <section className="container section cta">
        <div>
          <span className="eyebrow">DESA MILIK KITA BERSAMA</span>
          <h2>Punya ide untuk desa yang lebih baik?</h2>
          <p>Sampaikan usulan dan aspirasi melalui kanal yang tersedia.</p>
        </div>
        <Link className="button gold" to="/usulan">
          Sampaikan usulan <ArrowUpRight size={18} />
        </Link>
      </section>
    </>
  );
}

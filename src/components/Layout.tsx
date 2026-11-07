import { useState } from 'react';
import { Link, NavLink, Outlet } from 'react-router-dom';
import {
  Menu,
  X,
  ArrowUpRight,
  Home,
  LayoutGrid,
  ChartColumn,
  Newspaper,
  Ellipsis,
  ShieldCheck,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { api, type PublicData } from '../lib/api';
import { modules } from '../lib/modules';
export default function Layout() {
  const [open, setOpen] = useState(false),
    [large, setLarge] = useState(false);
  const q = useQuery({
    queryKey: ['public'],
    queryFn: () => api<PublicData>('public'),
  });
  const setting = (key: string) =>
    String(q.data?.SiteSettings?.find((r) => r.key === key)?.value || '');
  return (
    <div className={large ? 'large-type' : ''}>
      <a className="skip" href="#main">
        Lewati ke konten utama
      </a>
      <div className="utility" role="region" aria-label="Informasi portal">
        <div className="container">
          <span>Portal informasi & layanan desa</span>
          <div>
            <button onClick={() => setLarge(!large)} aria-pressed={large}>
              Aksesibilitas A+
            </button>
            <Link to="/admin">
              <ShieldCheck size={13} />
              Ruang pengelola
            </Link>
          </div>
        </div>
      </div>
      <header>
        <div className="container header">
          <Link to="/" className="brand">
            {setting('logoUrl') ? (
              <img src={setting('logoUrl')} alt="Logo desa" />
            ) : (
              <span className="brand-mark">
                N<span>•</span>
              </span>
            )}
            <span>
              <strong>{setting('villageName') || 'DESA NADI'}</strong>
              <small>
                {setting('region') || 'Nusantara Akses Digital Inklusif'}
              </small>
            </span>
          </Link>
          <nav className="desktop-nav" aria-label="Navigasi utama">
            <NavLink to="/">Beranda</NavLink>
            <NavLink to="/profil">Profil Desa</NavLink>
            <NavLink to="/berita">Informasi</NavLink>
            <NavLink to="/transparansi">Transparansi</NavLink>
          </nav>
          <Link className="button primary desktop-nav" to="/layanan">
            Layanan Desa <ArrowUpRight size={16} />
          </Link>
          <button
            className="menu-toggle"
            aria-label={open ? 'Tutup menu' : 'Buka menu'}
            aria-expanded={open}
            onClick={() => setOpen(!open)}
          >
            {open ? <X /> : <Menu />}
          </button>
        </div>
      </header>
      {open && (
        <nav className="mobile-menu container" aria-label="Semua halaman">
          {modules.map((m) => (
            <Link key={m.path} to={'/' + m.path} onClick={() => setOpen(false)}>
              {m.title}
            </Link>
          ))}
          <Link to="/pengaduan" onClick={() => setOpen(false)}>
            Pengaduan Warga
          </Link>
          <Link to="/lacak" onClick={() => setOpen(false)}>
            Lacak Permohonan
          </Link>
        </nav>
      )}
      <main id="main">
        <Outlet />
      </main>
      <footer>
        <div className="container footer-grid">
          <div>
            <Link to="/" className="brand">
              <span className="brand-mark">
                N<span>•</span>
              </span>
              <strong>DESA NADI</strong>
            </Link>
            <p>
              Satu Desa. Satu Portal.
              <br />
              Semua Terhubung.
            </p>
            <p>{setting('contact') || 'Kontak resmi belum dikonfigurasi.'}</p>
          </div>
          <div>
            <h3>Jelajahi desa</h3>
            <Link to="/profil">Profil Desa</Link>
            <Link to="/umkm">UMKM Desa</Link>
            <Link to="/wisata">Wisata Desa</Link>
          </div>
          <div>
            <h3>Informasi publik</h3>
            <Link to="/transparansi">Transparansi APBDes</Link>
            <Link to="/statistik">Statistik Desa</Link>
            <Link to="/pengumuman">Pengumuman</Link>
          </div>
          <div>
            <h3>Terhubung</h3>
            <Link to="/pengaduan">Pengaduan & Aspirasi</Link>
            <Link to="/lacak">Lacak Permohonan</Link>
            <Link to="/privasi">Privasi & Penggunaan</Link>
            <p>
              {setting('officeHours') || 'Jam layanan belum dikonfigurasi.'}
            </p>
          </div>
        </div>
        <div className="container footer-bottom">
          DESA NADI · Infrastruktur informasi untuk desa yang terhubung.
          <span>
            Identitas dan informasi resmi menunggu konfigurasi pengelola.
          </span>
        </div>
      </footer>
      <nav className="bottom-nav" aria-label="Navigasi seluler">
        <NavLink to="/">
          <Home />
          Beranda
        </NavLink>
        <NavLink to="/layanan">
          <LayoutGrid />
          Layanan
        </NavLink>
        <NavLink to="/transparansi">
          <ChartColumn />
          Transparansi
        </NavLink>
        <NavLink to="/berita">
          <Newspaper />
          Informasi
        </NavLink>
        <button onClick={() => setOpen(!open)} aria-expanded={open}>
          <Ellipsis />
          Lainnya
        </button>
      </nav>
    </div>
  );
}

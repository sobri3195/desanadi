import { writeFileSync } from 'node:fs';
const origin = new URL(process.env.PUBLIC_SITE_URL || '');
if (origin.protocol !== 'https:') throw Error('PUBLIC_SITE_URL wajib HTTPS');
const paths = [
  '',
  'profil',
  'berita',
  'pengumuman',
  'transparansi',
  'proyek',
  'layanan',
  'umkm',
  'wisata',
  'sehat',
  'statistik',
  'asisten',
  'partisipasi',
  'privasi',
];
writeFileSync(
  'public/sitemap.xml',
  '<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">' +
    paths
      .map(
        (p) =>
          '<url><loc>' +
          new URL('/' + p, origin).href.replaceAll('&', '&amp;') +
          '</loc></url>',
      )
      .join('') +
    '</urlset>',
);

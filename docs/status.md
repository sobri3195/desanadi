# Status implementasi

Implementasi awal yang dapat dibangun dan diuji secara lokal, bukan pernyataan seluruh kriteria produksi selesai.

| Tahap | Implementasi                                                            | Bukti/batas                                                                    |
| ----- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------ |
| 1     | Vite React TypeScript, Tailwind, routing publik/admin, navigasi seluler | Build, tes DOM dan Chromium 360/768/1440 px; belum perangkat fisik             |
| 2     | 25 sheet, setup aditif, proxy HMAC dan dispatcher Apps Script           | Runtime Apps Script tiruan deterministik; belum deploy Google                  |
| 3     | Google verification, sesi signed, CSRF, peran server/backend            | Tes boundary API; belum login Google langsung                                  |
| 4     | Profil/perangkat, berita, pengumuman, CRUD generik dan data publik      | Tes draft/publish/edit/archive dan audit; editor teks biasa                    |
| 5     | APBDes/grafik, proyek, pilot layanan/pengaduan/usulan                   | Tes verifikasi faktor, status, idempotensi dan pemulihan interupsi             |
| 6     | UMKM, wisata, kesehatan, statistik CSV, FAQ retrieval, agenda           | Data dari backend; tidak ada data contoh resmi                                 |
| 7     | Checklist internal, filter/pencarian, metadata dasar, sitemap generator | SSR/prerender, SEO artikel dan tinjauan aksesibilitas manual masih diperlukan  |
| 8     | Tes, docs Indonesia, template environment, konfigurasi Vercel           | Deployment dan alur browser end-to-end terhadap layanan nyata belum dijalankan |

Tes backend memakai fake SpreadsheetApp/Utilities/LockService, bukan layanan Google. Tes lock memastikan jalur memakai lock; tidak membuktikan perilaku konkurensi jaringan Apps Script asli. Tes frontend memakai jsdom dan axe tanpa pemeriksaan kontras otomatis (jsdom tidak menghitung layout/warna browser). Tes proxy memalsukan fetch termasuk kegagalan/timeout, bukan membuktikan koneksi eksternal. Test workflow lintas berita dan request dijalankan melalui dispatcher Apps Script, bukan sesi Google end-to-end.

Sebelum rilis: jalankan checklist deployment di docs/deployment.md, uji perangkat 360/768/1440 px, keyboard dan pembaca layar, tinjau kontras, otorisasi pemerintah, privasi/retensi, backup, kuota dan domain. Publikasi draft lingkungan cloud berbeda dari deployment aplikasi Google/Vercel.

Pengujian browser Playwright menggunakan Chromium pada lebar 360, 768, dan 1440 px, memeriksa overflow, navigasi, formulir, pelacakan faktor kedua, galat dan akses admin. API pada suite browser dipalsukan secara eksplisit. Axe dijalankan juga di browser termasuk kontras, tanpa pengecualian. Tidak menggantikan audit aksesibilitas manual atau uji Google/Vercel langsung.

## Hasil validasi lokal

- Instalasi bersih `npm ci --cache /tmp/nadi-npm-cache --no-audit --no-fund`: berhasil.
- TypeScript dan build produksi Vite: berhasil.
- Vitest: 4 berkas, 36 tes lulus.
- Playwright/Chromium sistem: 6 tes lulus, termasuk lebar 360/768/1440 px dan axe dengan kontras aktif.
- Audit dependency terkunci: 0 kerentanan terlapor pada saat pemeriksaan.
- Permintaan lokal `/api/health`: 200, `backendConfigured: false`; `/api/public`: 503 yang diharapkan saat konfigurasi Google belum tersedia. Ini bukti handler lokal, bukan deployment eksternal.

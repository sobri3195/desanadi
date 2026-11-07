# DESA NADI

**Nusantara Akses Digital Inklusif** · Satu Desa. Satu Portal. Semua Terhubung.

Portal desa berbahasa Indonesia dengan React/TypeScript, Tailwind, Google Sheets + Apps Script, serta proxy Vercel. Identitas, statistik, keuangan, dan kontak resmi tidak diisi dengan data rekaan. Konten kosong menampilkan keadaan belum dipublikasikan.

## Memulai

Node.js **22.12+**, disarankan Node 24 LTS. Gunakan checkout yang tersedia; tidak perlu worktree untuk task cloud yang sudah terisolasi.

```sh
npm ci
cp .env.example .env.local
npm run dev
```

`npm run dev` menjalankan Vite dan middleware API lokal pada origin yang sama. Tanpa konfigurasi Google, endpoint public menampilkan galat konfigurasi yang dapat dicoba ulang. Alias berikut menjalankan workflow yang sama:

```sh
npm run dev:api
```

Middleware lokal memuat handler API yang sama dengan fungsi Vercel tanpa akun hosting. Untuk memeriksa paritas platform, opsional gunakan `npx vercel@latest dev` dengan proyek Vercel yang ditautkan. Pilih framework Vite, build `npm run build`, hasil `dist`. Isi `.env.local` sesuai [panduan deployment](docs/deployment.md). Cookie sesi selalu Secure; gunakan HTTPS lokal atau konteks localhost yang mendukung Secure cookie. Jangan mematikan keamanan cookie untuk produksi.

```sh
npm run typecheck
npm test
npm run build
```

## Kemampuan

- Portal responsif: profil/perangkat desa, berita/detail, pengumuman, APBDes/grafik, proyek, layanan, UMKM, wisata, kesehatan, statistik/CSV, FAQ/pencarian sumber, agenda.
- Admin berbasis peran: daftar, pencarian, filter, pagination, formulir tervalidasi, publikasi, arsip, penghapusan draf, pengguna, pengaturan, media Drive, audit dan checklist kesiapan internal.
- Pilot pengaduan, usulan, dan janji temu: tanda terima, faktor verifikasi acak, idempotensi, status dan catatan internal petugas.
- Google ID token diverifikasi server; sesi HMAC HttpOnly, batas waktu, CSRF dan origin checks; peran dibaca ulang dari Sheets pada setiap operasi.
- Apps Script memverifikasi envelope HMAC, timestamp dan nonce persisten; LockService menyerialkan perubahan. Semua data aplikasi disimpan di Sheets, bukan localStorage.

## Dokumentasi

- [Deployment Google/Vercel/domain](docs/deployment.md)
- [Skema dan migrasi](docs/database.md)
- [Panduan pengelola](docs/admin.md)
- [Keamanan dan batasan](docs/security.md)
- [Status implementasi dan validasi](docs/status.md)

Belum ada bukti deployment Google Apps Script atau Vercel langsung. Tes memakai runtime Sheets tiruan deterministik. Sebelum menerima permohonan, pengelola harus mengesahkan pilot dan mengatur `privacyNotice`, `contact`, serta `retentionDays` (minimal 7 hari). Jangan gunakan Google Sheets untuk NIK, rekam medis, atau dokumen identitas. Ini bukan sistem penerbitan dokumen resmi dan tidak mengklaim sertifikasi kepatuhan atau hasil lomba.

## Tes browser

```sh
npx playwright install chromium
npm run test:e2e
```

Jika Chromium sistem tersedia pada cloud, gunakan `PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH=/usr/bin/chromium npm run test:e2e`. Suite menyalakan server lokal bila diperlukan dan memalsukan endpoint eksternal secara deterministik.

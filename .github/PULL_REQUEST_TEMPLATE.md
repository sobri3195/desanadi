## Perubahan

Membangun implementasi awal DESA NADI dari repository kosong: portal publik responsif, admin CRUD berbasis peran, Google Apps Script/Sheets, proxy Vercel dengan HMAC, login Google dan sesi aman, pilot permohonan/pengaduan/usulan dengan verifikasi faktor kedua, serta dokumentasi deployment dalam Bahasa Indonesia.

Tidak ada data desa atau anggaran rekaan. Layanan yang belum dikonfigurasi menampilkan galat yang jelas; draf tidak dipublikasikan.

## Validasi lokal

- Instalasi bersih `npm ci` berhasil.
- `npm run build` dan TypeScript berhasil.
- 36 tes unit/API/backend/DOM lulus.
- 6 tes Chromium lulus: 360/768/1440 px, navigasi, pengajuan/pelacakan dengan API tiruan, penanganan galat dan aksesibilitas termasuk kontras.
- `npm audit`: 0 kerentanan pada dependensi yang dikunci.

## Batas rilis

Integrasi Google/Vercel langsung belum diuji karena belum ada konfigurasi organisasi. Backend diuji dengan runtime Apps Script tiruan, bukan layanan Google. Ini implementasi awal, bukan penyelesaian semua kriteria produksi: rich text, preview artikel khusus, taxonomy terpisah, penugasan petugas, SSR/prerender dan beberapa fitur lanjutan masih membutuhkan iterasi. Lihat `docs/status.md` dan `docs/security.md` sebelum deployment.

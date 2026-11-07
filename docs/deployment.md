# Panduan deployment

## 1. Konfigurasi lokal

Gunakan Node 22.12+ atau 24 LTS, `npm ci`, lalu salin `.env.example` menjadi `.env.local`. Jangan commit berkas berisi rahasia. `npm run dev` atau `npm run dev:api` menjalankan Vite beserta middleware yang memuat handler API Node yang sama pada origin yang sama. Tidak memerlukan akun Vercel untuk development lokal. Untuk paritas deployment opsional jalankan `npx vercel@latest dev` setelah menautkan akun/proyek Vercel; periksa advisory CLI eksternal sebelum instalasi. `npm run preview` hanya menyajikan hasil frontend, bukan fungsi API.

Variabel `VITE_*` dapat dilihat publik. Hanya nama aplikasi dan Google OAuth client ID boleh memakai awalan tersebut. `GAS_WEB_APP_URL`, `GAS_SHARED_SECRET`, `JWT_SESSION_SECRET`, dan allowlist tidak boleh masuk bundle klien. Buat dua rahasia independen minimal 32 karakter dengan generator kriptografis dan simpan langsung ke pengaturan deployment. `PUBLIC_SITE_URL` adalah origin yang benar-benar dipakai (termasuk port saat lokal), bukan wildcard. `ADMIN_EMAILS` adalah daftar email Super Admin terverifikasi, dipisahkan koma; akun peran lain diotorisasi berdasarkan `googleSub` pada Users. Tidak ada pendaftaran publik.

## 2. Google Sheets dan Apps Script

1. Buat spreadsheet dan folder Drive khusus media milik organisasi yang berwenang. Jangan bagikan spreadsheet ke publik.
2. Buka Extensions → Apps Script. Salin semua `.gs` dan manifest `apps-script/appsscript.json`. Aktifkan tampilan manifest melalui pengaturan editor.
3. Tambahkan Script Properties: `SPREADSHEET_ID`, `MEDIA_FOLDER_ID`, `GAS_SHARED_SECRET`, dan `ADMIN_EMAILS`. Nilai rahasia harus sama dengan Vercel. Allowlist email dipakai saat provision administrator pertama.
4. Jalankan `setupDatabase()` secara manual, otorisasi scope Sheets/Drive. Verifikasi 25 sheet beserta header. Fungsi aman diulang: tidak menghapus data atau memindahkan kolom yang ada.
5. Dapatkan Google `sub` akun administrator melalui ID token yang diverifikasi audience oleh administrator deployment menggunakan `google-auth-library`; jangan mengandalkan decoding token tanpa verifikasi atau menaruh token dalam chat. Buat helper sementara di editor yang memanggil `provisionInitialAdmin(sub, email, nama)` dengan identitas terverifikasi; jalankan manual dan hapus helper. Email harus ada pada Script Property `ADMIN_EMAILS`. Setelah itu Users dikelola Super Admin melalui portal.
6. Deploy sebagai **Web app**, execute as pemilik organisasi. Untuk panggilan server Vercel tanpa login interaktif, akses web app perlu mengizinkan siapa saja sesuai kebijakan Workspace. Endpoint tetap mewajibkan tanda tangan HMAC; URL bukan rahasia pengganti autentikasi. Batasi siapa yang dapat mengedit script/Script Properties, dan lindungi kuota dari penyalahgunaan. Jika kebijakan Workspace melarang akses tersebut, jangan memperlebar akses organisasi: butuh gateway yang disetujui.
7. Salin URL `/macros/s/…/exec` ke `GAS_WEB_APP_URL` server Vercel. Simpan deployment baru ketika kode berubah. Proxy hanya menerima host `script.google.com` dan redirect HTTPS `script.googleusercontent.com`.
8. Tambahkan trigger harian `maintenance()`. Penghitung rate limit/nonce kedaluwarsa dibersihkan. `retentionDays` menghapus permohonan final beserta riwayat dan jurnal setelah masa retensi; audit disimpan untuk kebijakan tersendiri. Uji kebijakan pada salinan sebelum produksi.

## 3. Google Identity Services

Buat OAuth client untuk Web Application pada proyek organisasi. Tambahkan authorized JavaScript origins yang tepat untuk lokal, preview yang dipilih, dan domain resmi. Masukkan ID sama pada `VITE_GOOGLE_CLIENT_ID` dan `GOOGLE_CLIENT_ID`. Jangan menggunakan client secret pada frontend. Akun Google yang valid tetap ditolak jika tidak ada `googleSub` aktif di Users. Super Admin juga harus berada dalam `ADMIN_EMAILS` pada Vercel. Mengubah email saja tidak memindahkan kepemilikan akun.

## 4. Vercel

Push ke GitHub, import repository, pilih Node 24, framework Vite, build `npm run build`, output `dist`. Fungsi berada di `/api`; frontend mengirim permintaan relatif `/api/*`. Isi variabel server dan client untuk setiap environment; set `PUBLIC_SITE_URL` ke origin preview yang diuji. Jangan memakai rahasia produksi pada preview tidak tepercaya. Deploy preview terlebih dahulu.

Periksa `/api/health`: `status: ok` hanya membuktikan fungsi aktif; `backendConfigured` hanya keberadaan konfigurasi, bukan konektivitas. Periksa `/api/public` benar-benar membaca Sheets. Uji login, draf berita, publikasi, edit, arsip dan log audit. Publikasi dapat memerlukan hingga 90 detik untuk melewati cache publik. Uji request pilot, percobaan ulang kunci sama, status petugas, dan verifikasi tanda terima. Uji akun tanpa peran, akun disabled, signature salah, timestamp kedaluwarsa, CSRF salah, serta outage backend. Tidak ada klaim integrasi langsung sebelum pemeriksaan ini lulus.

## 5. Domain `.desa.id`

Vercel tidak memberikan izin memakai domain pemerintah. Pastikan kepemilikan dan mandat instansi melalui prosedur pengelola domain yang berwenang. Tambahkan domain yang telah disetujui pada proyek Vercel, ikuti nilai DNS A/CNAME dari dashboard saat itu, verifikasi kepemilikan, tunggu TLS aktif, lalu perbarui origin OAuth dan `PUBLIC_SITE_URL`. Uji HTTPS, cookies, redirect domain kanonis, dan kontak resmi. Jangan mengarang alamat desa.

## 6. SEO dan pemulihan

Setelah domain terverifikasi, jalankan `PUBLIC_SITE_URL=https://DOMAIN-RESMI node scripts/sitemap.mjs` dan deploy ulang sitemap hasilnya. Ganti `DOMAIN-RESMI` dengan domain milik instansi; jangan menjalankan contoh literal. Sitemap awal sengaja kosong. SPA memberi metadata dasar; isi dinamis/berita memerlukan prerender atau SSR sebelum peluncuran yang menuntut SEO penuh (lihat batasan).

Untuk backup, jadwalkan salinan spreadsheet pada akun organisasi dengan akses terbatas dan catat deployment script. Uji pemulihan pada spreadsheet terpisah, ubah `SPREADSHEET_ID`, jalankan setup yang aditif, dan uji login serta core workflows. Rotasi rahasia Vercel dan Apps Script bersamaan. Rotasi session secret mencabut semua sesi.

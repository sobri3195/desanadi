# Keamanan, privasi dan batas operasi

## Batas kepercayaan

Browser tidak mengetahui URL Apps Script atau shared secret. Vercel memverifikasi Google ID token memakai google-auth-library (audience, penerbit, kedaluwarsa, email_verified), lalu membuat sesi HMAC SHA-256. Kuki beratribut HttpOnly, Secure, SameSite=Strict dan berumur 8 jam. Token tidak disimpan di localStorage. Origin wajib tepat; mutasi petugas juga membutuhkan token CSRF dari `/api/auth/me`. Google `sub` adalah identitas tetap. Peran/status dibaca ulang di Sheets pada setiap operasi petugas, dan diperiksa kembali pada backend. Rahasia minimal 32 karakter independen.

Envelope kanonis adalah UTF-8 `timestamp + "\n" + nonce + "\n" + payloadJson`. `payloadJson` ditandatangani sebagai string asli, bukan objek yang diserialisasi ulang. Signature lowercase hex HMAC-SHA256; jendela waktu 5 menit; nonce 24 byte acak, disimpan persisten di ReplayNonces. Penanganan web Apps Script memakai ScriptLock. Tidak ada retry proxy otomatis untuk mutasi. Permohonan memakai jurnal Idempotency dengan fingerprint untuk memulihkan penulisan terputus dan mencegah duplikasi. Replay nonce dan idempotensi adalah mekanisme berbeda.

Tracking memakai referensi dan faktor acak kedua, hanya mengembalikan status/timestamp, tidak uraian atau catatan petugas. Hash faktor berada pada permohonan; jurnal menyimpan tanda terima yang dapat dipulihkan dan hanya boleh diakses administrator spreadsheet, tidak API publik. Rate limit persisten: 5 pengajuan per hash jaringan per jam, 20 pelacakan per referensi per jam. Vercel trusted network header di-hash sebelum dikirim ke Sheets. CAPTCHA/WAF dan batas trafik deployment tetap diperlukan untuk serangan volume besar; endpoint Apps Script publik dapat menghabiskan kuota sebelum validasi.

Teks React tidak menjalankan HTML. API memvalidasi tipe dan batas ukuran; backend memvalidasi kolom, status, URL HTTPS, angka, slug dan identitas unik. Nilai yang berpotensi menjadi formula Sheets/CSV diawali apostrof. Public API memakai allowlist entity dan kolom, serta status/tanggal publikasi. Private API no-store; hanya public data memiliki cache. Media memverifikasi folder, ukuran, MIME dan sharing eksplisit; bukan scanner malware. Header CSP melarang objek/frame situs lain; gambar HTTPS pihak ketiga bisa membawa implikasi privasi dan perlu disetujui pengelola.

## Batas dan pekerjaan lanjutan

- Sheets bukan basis data transaksional: lock menyerialkan instance Apps Script, tetapi perubahan manual spreadsheet di luar aplikasi tidak ikut terkunci. Audit dan perubahan konten lintas-sheet belum merupakan transaksi atomik. Pemulihan idempotensi hanya dibuat untuk pengajuan publik; verifikasi dan backup wajib.
- Nonce/rate limit dan pembacaan semua baris tidak cocok untuk trafik besar; maintenance dan pemantauan kuota diperlukan. Pagination admin dilakukan setelah pembacaan terbatas oleh role, bukan pagination database.
- Logout menghapus cookie browser; salinan cookie yang dicuri tetap valid sampai expiry, penonaktifan pengguna atau rotasi secret. Tidak ada registry pencabutan per-sesi.
- Perubahan peran/status pengguna berlaku pada operasi berikutnya; perubahan konten publik mengikuti cache hingga 90 detik. Tidak ada notifikasi email/push atau alur pemulihan faktor publik.
- Tidak ada SLA, sertifikasi, audit hukum, uji penetrasi eksternal, atau jaminan hasil lomba. Hanya data pilot non-sensitif. Jangan menerima dokumen kependudukan atau data kesehatan individu.
- Semua admin frontend memakai guard server, tetapi pengujian Google/Drive/Sheets langsung, CSP pada Google sign-in aktual, konkurensi Apps Script sesungguhnya, batas platform dan pemulihan backup belum dapat diverifikasi tanpa deployment organisasi.
- SEO memakai SPA dengan metadata dasar. SSR/prerender konten publik per-rute, metadata Open Graph per-artikel, dan JSON-LD organisasi resmi belum diimplementasikan. Jangan menghasilkan metadata instansi fiktif.
- UI memakai editor teks aman; rich text, pustaka kategori mandiri, pemilihan media terintegrasi dan penugasan otomatis memerlukan iterasi lanjutan. Tidak ada adapter LLM aktif; asisten adalah retrieval kata kunci.

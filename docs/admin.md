# Panduan pengelola

Masuk melalui `/admin` memakai akun Google yang sudah diberi akses. Tidak ada registrasi publik. Jangan membagikan akun.

## Publikasi

Pilih modul → Tambah data → isi formulir → simpan sebagai draf. Periksa isi dan sumber. Edit status ke Dipublikasikan setelah persetujuan. Draf tidak tampil publik. Berita membutuhkan slug unik dan isi; tanggal publikasi masa depan menunda tampilnya berita (diproses saat pembacaan, bukan job pengiriman). Untuk menarik konten, kembalikan ke draf atau arsipkan. Penghapusan permanen hanya tersedia untuk draf dan memerlukan konfirmasi. Semua perubahan berhasil muncul pada Audit Log, tanpa menyalin uraian warga ke ringkasan audit.

Teks ditampilkan sebagai teks biasa dengan paragraf, tanpa HTML aktif. Editor rich text, preview artikel khusus, taxonomy kategori terpisah, dan pengunggahan berkas langsung belum tersedia. Kategori diisi sebagai teks terstruktur dan dipakai untuk filter. URL wajib HTTPS. Untuk profil, isi `section` sesuai Sejarah, Visi dan Misi, Wilayah, Pemerintahan, Potensi, Fasilitas atau Kontak; perangkat desa dikelola pada modul Perangkat Desa.

## Identitas dan privasi

Pada Pengaturan Website, gunakan kunci yang diizinkan: `villageName`, `region`, `logoUrl`, `heroUrl`, `welcome`, `headMessage`, `contact`, `officeHours`, `privacyNotice`, `retentionDays`. Nilai `privacyNotice` harus memuat identitas pengendali, tujuan/dasar pemrosesan, durasi simpan, hak warga dan kontak. Isi `retentionDays` minimal 7 hari berdasarkan kebijakan resmi. Pilot menolak permohonan jika privasi, kontak dan retensi belum lengkap. Pengaturan publik langsung berlaku setelah cache kedaluwarsa; verifikasi izin publikasi sebelum menyimpan.

## Anggaran dan statistik

Isi angka non-negatif, tahun, sumber, dan status publikasi. Realisasi ditampilkan bersama rencana; data sumber dan kebenaran total harus diperiksa petugas. Persentase rencana nol ditampilkan 0; grafik kemajuan dibatasi 100% sementara angka nominal tetap terlihat. Jangan menganggap nilai di atas rencana sebagai data otomatis terverifikasi. Statistik hanya agregat; CSV menerapkan perlindungan formula dan hanya mengekspor baris publik.

## Permohonan

Operator memilih Permohonan Layanan, Pengaduan atau Usulan, membuka rincian dan memilih Tindak lanjut. Alur: Diajukan → Dalam peninjauan → Diproses → Selesai. Dari peninjauan dapat meminta informasi tambahan, menolak, atau membatalkan. Permohonan ditolak dapat dibuka kembali lewat peninjauan. Catatan petugas tersimpan di RequestHistory dan tidak dikirim pada pelacakan publik. Kontak tindak lanjut harus menggunakan kanal resmi; MVP sengaja tidak meminta identitas warga atau dokumen sensitif. Delegasi petugas dan notifikasi otomatis belum disediakan.

Warga menyimpan referensi dan kunci verifikasi dari tanda terima. Keduanya diperlukan untuk melacak; kehilangan kunci memerlukan proses pemulihan offline yang disetujui, tidak ada reset publik berbasis referensi saja. Jangan meminta warga mengirim kunci di kanal umum.

## Media

Daftarkan ID berkas yang sudah ada di folder media organisasi. Hanya JPEG, PNG, WebP, PDF ≤10 MB diizinkan. Isi alt text dan atribusi. Publikasi hanya berhasil jika berkas tersebut telah disetujui sebagai publik oleh pengelola Drive. Aplikasi tidak mengubah sharing folder atau berkas. Gunakan URL hasil registrasi pada konten terkait. Tidak ada unggahan langsung. Arsipkan registrasi untuk menarik referensi portal; jika perlu, cabut sharing berkas itu di Drive secara terpisah.

## Peran

Super Admin mengelola semua modul, Users, pengaturan dan audit. Admin Desa mengelola konten, keuangan, layanan, pengaduan, kesehatan dan checklist. Editor Konten mengelola informasi umum; operator hanya modul layanan/pengaduan masing-masing; pengelola kesehatan hanya HealthAgenda. Viewer dapat masuk tetapi tidak dapat mengelola data. Menonaktifkan Users langsung mencabut operasi berikutnya. `googleSub` akun yang sudah ada tidak dapat diubah. Super Admin tidak boleh menurunkan atau menonaktifkan dirinya sendiri.

## Checklist lomba

`/admin/kesiapan-lomba` berisi rekaman tinjauan internal: kategori, judul, status, URL bukti, penanggung jawab, tanggal tinjauan dan masalah tersisa. Tambahkan kategori domain resmi, profil, akurasi, berita terkini, APBDes, layanan, seluler, aksesibilitas, keamanan, partisipasi, inovasi, penanggung jawab, kontak, dan bukti. Ekspor JSON untuk tinjauan internal; tidak ada skor juri atau probabilitas penghargaan.

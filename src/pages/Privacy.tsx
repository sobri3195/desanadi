import { useQuery } from '@tanstack/react-query';
import { api, type PublicData } from '../lib/api';
export default function Privacy() {
  const q = useQuery({
    queryKey: ['public'],
    queryFn: () => api<PublicData>('public'),
  });
  const notice = q.data?.SiteSettings?.find(
    (r) => r.key === 'privacyNotice',
  )?.value;
  return (
    <article className="container section narrow prose">
      <span className="eyebrow">PRIVASI & PENGGUNAAN</span>
      <h1>Informasi seperlunya. Akses yang terjaga.</h1>
      <p>
        DESA NADI menyediakan informasi publik dan pilot permohonan
        non-sensitif. Pengelola wajib melengkapi identitas penanggung jawab,
        dasar pemrosesan, masa retensi, dan kanal permintaan penghapusan sebelum
        menerima data warga.
      </p>
      {notice ? (
        <div>{String(notice)}</div>
      ) : (
        <div className="notice">
          Kebijakan khusus desa belum diterbitkan. Jangan mengirim data pribadi
          sebelum pengelola mengonfirmasi otorisasi pilot dan kanal penanganan
          hak warga.
        </div>
      )}
      <h2>Data yang diproses</h2>
      <p>
        Formulir menerima pokok dan uraian permohonan, kategori, waktu, serta
        status. Kunci verifikasi diacak. Informasi ini hanya diakses petugas
        berwenang. Pembatasan penyalahgunaan memakai hash alamat jaringan dan
        penghitung sementara. Jangan mengirim NIK, dokumen identitas, data
        medis, atau data pribadi pihak lain.
      </p>
      <h2>Akun petugas</h2>
      <p>
        Login Google digunakan untuk mengenali petugas terdaftar. Sesi ditangani
        melalui kuki HttpOnly; token dan permohonan tidak disimpan di
        localStorage. Data tidak digunakan untuk pembayaran atau diagnosis.
      </p>
      <h2>Retensi dan hak warga</h2>
      <p>
        Pengelola menetapkan jadwal retensi dan kontak permintaan akses,
        koreksi, atau penghapusan. Permohonan dapat diidentifikasi dengan
        referensi dan kunci verifikasi melalui kanal resmi. Jangan membagikan
        kunci kepada pihak lain.
      </p>
      <h2>Batasan</h2>
      <p>
        Google Sheets tidak sesuai untuk data kependudukan rinci, rekam medis,
        atau beban transaksi tinggi. Penggunaan resmi memerlukan penilaian
        keamanan, privasi, aksesibilitas, dan hukum. Portal ini tidak mengklaim
        sertifikasi pemerintah atau hasil lomba.
      </p>
    </article>
  );
}

import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  LayoutDashboard,
  LogOut,
  Menu,
  Plus,
  Search,
  X,
  Download,
} from 'lucide-react';
import { api, type User } from '../lib/api';
import { schema, type Entity, type Row } from '../lib/schema';
import { labels, modules, roles, requestStatuses } from '../lib/modules';
import { can, scope } from '../../server/permissions';
import { Empty, ErrorState, Loading } from '../components/Content';
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (p: {
            client_id: string;
            callback: (r: { credential: string }) => void;
          }) => void;
          renderButton: (
            el: HTMLElement,
            options: Record<string, unknown>,
          ) => void;
          cancel: () => void;
        };
      };
    };
  }
}
const extra = [
  ['Officials', 'Perangkat Desa'],
  ['ServiceRequests', 'Permohonan Layanan'],
  ['Complaints', 'Pengaduan Warga'],
  ['Proposals', 'Usulan Warga'],
  ['Media', 'Media'],
  ['Users', 'Pengguna & Hak Akses'],
  ['AuditLogs', 'Audit Log'],
  ['SiteSettings', 'Pengaturan Website'],
  ['Readiness', 'Kesiapan Lomba'],
] as const;
const adminModules = [
  ...modules.map((m) => [m.entity, m.title] as const),
  ...extra,
];
const reserved = [
  'id',
  'createdAt',
  'updatedAt',
  'updatedBy',
  'authorId',
  'verificationHash',
  'publicUrl',
  'mimeType',
];
export default function Admin() {
  const { entity: routeEntity } = useParams();
  const entity = (
    routeEntity === 'kesiapan-lomba' ? 'Readiness' : routeEntity
  ) as Entity | undefined;
  const cache = useQueryClient(),
    [open, setOpen] = useState(false),
    [loginError, setLoginError] = useState('');
  const user = useQuery({
    queryKey: ['me'],
    queryFn: () => api<User>('auth/me'),
    retry: false,
  });
  const button = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!user.isError || !import.meta.env.VITE_GOOGLE_CLIENT_ID) return;
    const render = () => {
      if (!window.google || !button.current) return;
      window.google.accounts.id.initialize({
        client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
        callback: async ({ credential }) => {
          try {
            await api('auth/login', { credential });
            await cache.invalidateQueries({ queryKey: ['me'] });
          } catch (e) {
            setLoginError((e as Error).message);
          }
        },
      });
      window.google.accounts.id.renderButton(button.current, {
        theme: 'outline',
        size: 'large',
        locale: 'id',
      });
    };
    let script = document.getElementById(
      'google-identity',
    ) as HTMLScriptElement | null;
    if (!script) {
      script = document.createElement('script');
      script.id = 'google-identity';
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      document.head.appendChild(script);
    }
    script.addEventListener('load', render);
    render();
    return () => script?.removeEventListener('load', render);
  }, [user.isError, cache]);
  if (user.isPending)
    return (
      <div className="container section">
        <Loading />
      </div>
    );
  if (!user.data)
    return (
      <div className="login">
        <Link className="brand" to="/">
          DESA NADI
        </Link>
        <div className="card card-body">
          <LayoutDashboard size={36} />
          <h1>Ruang Pengelola</h1>
          <p>
            Masuk dengan akun Google yang telah diberi akses oleh administrator
            desa.
          </p>
          {import.meta.env.VITE_GOOGLE_CLIENT_ID ? (
            <div ref={button} />
          ) : (
            <div className="notice">
              Login Google belum dikonfigurasi. Ikuti panduan deployment untuk
              mengaktifkannya.
            </div>
          )}
          {loginError && <p role="alert">{loginError}</p>}
          {user.error && <p role="alert">{user.error.message}</p>}
          <small>Pendaftaran administrator tidak tersedia untuk publik.</small>
          <Link to="/">Kembali ke portal</Link>
        </div>
      </div>
    );
  const u = user.data;
  return (
    <div className="admin-layout">
      <aside className={open ? 'sidebar open' : 'sidebar'}>
        <Link className="brand" to="/">
          DESA NADI
        </Link>
        <p>RUANG PENGELOLA</p>
        <Link to="/admin" onClick={() => setOpen(false)}>
          <LayoutDashboard size={18} />
          Dashboard
        </Link>
        {adminModules
          .filter(([e]) => can(u.role, scope(e)))
          .map(([e, title]) => (
            <Link
              className={entity === e ? 'selected' : ''}
              key={e}
              to={'/admin/' + (e === 'Readiness' ? 'kesiapan-lomba' : e)}
              onClick={() => setOpen(false)}
            >
              {title}
            </Link>
          ))}
      </aside>
      <div className="admin-main">
        <div className="admin-top">
          <button
            className="menu-toggle"
            aria-label="Buka navigasi pengelola"
            onClick={() => setOpen(!open)}
            aria-expanded={open}
          >
            <Menu />
          </button>
          <span>
            Pengelola /{' '}
            {adminModules.find(([e]) => e === entity)?.[1] || 'Dashboard'}
          </span>
          <div>
            <strong>{u.displayName}</strong>
            <small>{u.role}</small>
          </div>
          <button
            onClick={async () => {
              await api('auth/logout', {}, u.csrf);
              cache.removeQueries({ queryKey: ['me'] });
              await cache.invalidateQueries({ queryKey: ['me'] });
            }}
          >
            <LogOut size={16} />
            Keluar
          </button>
        </div>
        <div className="admin-content">
          {entity && adminModules.some(([e]) => e === entity) ? (
            can(u.role, scope(entity)) ? (
              <Manager key={entity} entity={entity} user={u} />
            ) : (
              <p role="alert">Anda tidak memiliki hak akses.</p>
            )
          ) : (
            <Dashboard user={u} />
          )}
        </div>
      </div>
    </div>
  );
}
function Dashboard({ user }: { user: User }) {
  const entities = [
    'News',
    'ServiceRequests',
    'Complaints',
    'Activities',
    'Budgets',
  ] as const;
  const q = useQuery({
    queryKey: ['dashboard'],
    queryFn: async (): Promise<Record<string, Row[]>> =>
      Object.fromEntries(
        await Promise.all(
          entities
            .filter((e) => can(user.role, scope(e)))
            .map(async (e) => [
              e,
              await api<Row[]>(
                'admin',
                { operation: 'list', entity: e },
                user.csrf,
              ),
            ]),
        ),
      ),
  });
  return (
    <>
      <span className="eyebrow">RINGKASAN PENGELOLAAN</span>
      <h1>Selamat datang, {user.displayName}.</h1>
      <p>Pantau data dan tindak lanjut desa dari satu tempat.</p>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState message={q.error.message} retry={() => q.refetch()} />
      ) : (
        <div className="feature-grid">
          {Object.entries(q.data).map(([entity, rows]) => (
            <Link
              className="card card-body"
              key={entity}
              to={'/admin/' + entity}
            >
              <h3>{adminModules.find(([e]) => e === entity)?.[1]}</h3>
              <strong className="stat-value">{rows.length}</strong>
              <p>
                rekaman tersimpan ·{' '}
                {
                  rows.filter(
                    (r) => (r.status || r.publicationStatus) === 'published',
                  ).length
                }{' '}
                dipublikasikan
              </p>
            </Link>
          ))}
        </div>
      )}
      <div className="notice">
        Metrik berasal dari rekaman yang dapat diakses akun Anda. Checklist
        lomba adalah alat tinjauan internal, bukan penilaian resmi.
      </div>
    </>
  );
}
function Manager({ entity, user }: { entity: Entity; user: User }) {
  const cache = useQueryClient(),
    [search, setSearch] = useState(''),
    [filter, setFilter] = useState(''),
    [page, setPage] = useState(1),
    [editing, setEditing] = useState<Row | null>(null),
    [message, setMessage] = useState(''),
    [operation, setOperation] = useState<{
      id: string;
      status: string;
      note: string;
    } | null>(null);
  const q = useQuery({
    queryKey: ['admin', entity],
    queryFn: () =>
      api<Row[]>('admin', { operation: 'list', entity }, user.csrf),
  });
  const mutate = useMutation({
    mutationFn: (body: unknown) => api('admin', body, user.csrf),
    onSuccess: () => {
      setEditing(null);
      setOperation(null);
      setMessage('Perubahan tersimpan.');
      cache.invalidateQueries({ queryKey: ['admin', entity] });
      cache.invalidateQueries({ queryKey: ['public'] });
      cache.invalidateQueries({ queryKey: ['dashboard'] });
    },
  });
  const requests = ['ServiceRequests', 'Complaints', 'Proposals'].includes(
      entity,
    ),
    fields = (schema[entity] as readonly string[]).filter(
      (k) => !reserved.includes(k),
    );
  const rows = (q.data || []).filter(
    (r) =>
      (!search ||
        Object.values(r)
          .join(' ')
          .toLowerCase()
          .includes(search.toLowerCase())) &&
      (!filter || String(r.status || r.publicationStatus) === filter),
  );
  const statuses = [
    ...new Set(
      (q.data || [])
        .map((r) => String(r.status || r.publicationStatus || ''))
        .filter(Boolean),
    ),
  ];
  useEffect(() => {
    if (!editing && !operation) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role=dialog]');
    const get = () =>
      Array.from(
        dialog?.querySelectorAll<HTMLElement>(
          'button,input,select,textarea,a[href]',
        ) || [],
      ).filter((e) => !e.hasAttribute('disabled'));
    get()[0]?.focus();
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setEditing(null);
        setOperation(null);
      }
      if (e.key === 'Tab') {
        const items = get(),
          first = items[0],
          last = items[items.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last?.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first?.focus();
        }
      }
    };
    document.addEventListener('keydown', handler);
    return () => {
      document.removeEventListener('keydown', handler);
      previous?.focus();
    };
  }, [Boolean(editing), Boolean(operation)]);
  function exportReport() {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(q.data, null, 2)], { type: 'application/json' }),
    );
    const a = document.createElement('a');
    a.href = url;
    a.download = 'kesiapan-internal.json';
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <>
      <div className="section-head">
        <div>
          <span className="eyebrow">KELOLA DATA DESA</span>
          <h1>{adminModules.find(([e]) => e === entity)?.[1]}</h1>
        </div>
        {entity === 'Readiness' && (
          <button onClick={exportReport}>
            <Download size={16} />
            Ekspor laporan
          </button>
        )}
        {!requests && entity !== 'AuditLogs' && (
          <button
            className="primary"
            onClick={() => {
              setEditing({});
              mutate.reset();
              setMessage('');
            }}
          >
            <Plus size={16} />
            Tambah data
          </button>
        )}
      </div>
      {message && (
        <p role="status" className="notice">
          {message}
        </p>
      )}
      {mutate.isError && (
        <p role="alert" className="notice danger">
          {mutate.error.message}
        </p>
      )}
      <div className="filters">
        <label>
          <Search size={16} />
          <input
            aria-label="Cari rekaman"
            placeholder="Cari data…"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
          />
        </label>
        <select
          aria-label="Filter status"
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(1);
          }}
        >
          <option value="">Semua status</option>
          {statuses.map((s) => (
            <option key={s} value={s}>
              {requestStatuses[s] || s}
            </option>
          ))}
        </select>
      </div>
      {q.isPending ? (
        <Loading />
      ) : q.isError ? (
        <ErrorState message={q.error.message} retry={() => q.refetch()} />
      ) : rows.length ? (
        <>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">Daftar {entity}</caption>
              <thead>
                <tr>
                  <th>Informasi</th>
                  <th>Status</th>
                  <th>Diperbarui</th>
                  <th>Tindakan</th>
                </tr>
              </thead>
              <tbody>
                {rows.slice((page - 1) * 10, page * 10).map((r, i) => (
                  <tr key={String(r.id || r.key || i)}>
                    <td>
                      <strong>
                        {String(
                          r.title ||
                            r.name ||
                            r.subject ||
                            r.question ||
                            r.indicator ||
                            r.key ||
                            r.displayName ||
                            r.action ||
                            r.id,
                        )}
                      </strong>
                      <small>
                        {String(
                          r.description ||
                            r.content ||
                            r.summary ||
                            r.value ||
                            '',
                        ).slice(0, 300)}
                      </small>
                      {requests && (
                        <details>
                          <summary>Lihat rincian</summary>
                          <dl>
                            {Object.entries(r)
                              .filter(
                                ([k]) => !['verificationHash'].includes(k),
                              )
                              .map(([k, v]) => (
                                <div key={k}>
                                  <dt>{labels[k] || k}</dt>
                                  <dd className="prose">{String(v)}</dd>
                                </div>
                              ))}
                          </dl>
                        </details>
                      )}
                    </td>
                    <td>
                      {requestStatuses[String(r.status)] ||
                        String(r.status || r.publicationStatus || '—')}
                    </td>
                    <td>
                      {String(
                        r.updatedAt || r.timestamp || r.createdAt || '',
                      ).slice(0, 10)}
                    </td>
                    <td>
                      {requests ? (
                        <button
                          onClick={() =>
                            setOperation({
                              id: String(r.id),
                              status: String(r.status),
                              note: '',
                            })
                          }
                        >
                          Tindak lanjut
                        </button>
                      ) : (
                        entity !== 'AuditLogs' && (
                          <>
                            <button
                              onClick={() => {
                                setEditing(r);
                                mutate.reset();
                                setMessage('');
                              }}
                            >
                              Edit
                            </button>
                            {entity !== 'Users' &&
                              entity !== 'SiteSettings' && (
                                <button
                                  disabled={mutate.isPending}
                                  onClick={() => {
                                    if (
                                      window.confirm(
                                        'Arsipkan data ini? Data akan disembunyikan dari publik.',
                                      )
                                    )
                                      mutate.mutate({
                                        operation: 'archive',
                                        entity,
                                        id: r.id,
                                      });
                                  }}
                                >
                                  Arsipkan
                                </button>
                              )}
                            {(r.status || r.publicationStatus) === 'draft' && (
                              <button
                                disabled={mutate.isPending}
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      'Hapus draf ini secara permanen?',
                                    )
                                  )
                                    mutate.mutate({
                                      operation: 'deleteDraft',
                                      entity,
                                      id: r.id,
                                    });
                                }}
                              >
                                Hapus draf
                              </button>
                            )}
                          </>
                        )
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="pagination">
            <button disabled={page === 1} onClick={() => setPage(page - 1)}>
              Sebelumnya
            </button>
            <span>
              Halaman {page} · {rows.length} rekaman
            </span>
            <button
              disabled={page * 10 >= rows.length}
              onClick={() => setPage(page + 1)}
            >
              Berikutnya
            </button>
          </div>
        </>
      ) : (
        <Empty text="Tambahkan data untuk memulai. Draf tidak akan tampil di portal publik." />
      )}
      {editing && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Formulir data"
          >
            <div className="section-head">
              <h2>{editing.id || editing.key ? 'Edit data' : 'Tambah data'}</h2>
              <button
                aria-label="Tutup formulir"
                onClick={() => setEditing(null)}
              >
                <X />
              </button>
            </div>
            <p>
              Isi teks biasa; HTML tidak dijalankan. Pastikan sumber dan izin
              publikasi telah diverifikasi.
            </p>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                const data = new FormData(e.currentTarget),
                  record: Row = {};
                fields.forEach((k) => {
                  const v = data.get(k);
                  if (k === 'consentConfirmed') record[k] = v === 'on';
                  else if (v !== null && v !== '') record[k] = String(v);
                });
                mutate.mutate({
                  operation: 'save',
                  entity,
                  id: editing.id,
                  record,
                });
              }}
            >
              {fields.map((k) => (
                <label key={k}>
                  {labels[k] || k}
                  {k === 'role' ? (
                    <select
                      name={k}
                      defaultValue={String(editing[k] || 'Viewer')}
                    >
                      {roles.map((r) => (
                        <option key={r}>{r}</option>
                      ))}
                    </select>
                  ) : k === 'status' || k === 'publicationStatus' ? (
                    <select
                      name={k}
                      defaultValue={String(
                        editing[k] ||
                          (entity === 'Users'
                            ? 'active'
                            : entity === 'Readiness'
                              ? 'Belum ditinjau'
                              : 'draft'),
                      )}
                    >
                      {(entity === 'Users'
                        ? ['active', 'disabled']
                        : entity === 'Readiness'
                          ? ['Belum ditinjau', 'Perlu perbaikan', 'Selesai']
                          : ['draft', 'published', 'archived']
                      ).map((s) => (
                        <option key={s} value={s}>
                          {(
                            {
                              draft: 'Draf',
                              published: 'Dipublikasikan',
                              archived: 'Diarsipkan',
                              active: 'Aktif',
                              disabled: 'Dinonaktifkan',
                            } as Record<string, string>
                          )[s] || s}
                        </option>
                      ))}
                    </select>
                  ) : k === 'consentConfirmed' ? (
                    <input
                      name={k}
                      type="checkbox"
                      defaultChecked={editing[k] === true}
                    />
                  ) : [
                      'content',
                      'description',
                      'requirements',
                      'stages',
                      'answer',
                      'issues',
                    ].includes(k) ? (
                    <textarea
                      name={k}
                      rows={5}
                      maxLength={20000}
                      defaultValue={String(editing[k] || '')}
                    />
                  ) : (
                    <input
                      name={k}
                      defaultValue={String(editing[k] ?? '')}
                      maxLength={2000}
                      required={[
                        'title',
                        'name',
                        'question',
                        'googleSub',
                        'key',
                      ].includes(k)}
                    />
                  )}
                </label>
              ))}
              {mutate.isError && <p role="alert">{mutate.error.message}</p>}
              <button className="primary" disabled={mutate.isPending}>
                {mutate.isPending ? 'Menyimpan…' : 'Simpan perubahan'}
              </button>
            </form>
          </section>
        </div>
      )}
      {operation && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-label="Tindak lanjut permohonan"
          >
            <h2>Tindak lanjut</h2>
            <form
              className="form"
              onSubmit={(e) => {
                e.preventDefault();
                mutate.mutate({
                  operation: 'transition',
                  entity,
                  ...operation,
                });
              }}
            >
              <label>
                Status berikutnya
                <select
                  value={operation.status}
                  onChange={(e) =>
                    setOperation({ ...operation, status: e.target.value })
                  }
                >
                  {Object.entries(requestStatuses).map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Catatan internal
                <textarea
                  value={operation.note}
                  maxLength={2000}
                  onChange={(e) =>
                    setOperation({ ...operation, note: e.target.value })
                  }
                />
              </label>
              <p>
                Backend memvalidasi urutan transisi status. Catatan ini tidak
                ditampilkan kepada warga.
              </p>
              {mutate.isError && <p role="alert">{mutate.error.message}</p>}
              <button className="primary" disabled={mutate.isPending}>
                Simpan tindak lanjut
              </button>
              <button type="button" onClick={() => setOperation(null)}>
                Batal
              </button>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

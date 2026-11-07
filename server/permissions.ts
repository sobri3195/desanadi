export const permissions: Record<string, string[]> = {
  'Super Admin': ['*'],
  'Admin Desa': [
    'content',
    'finance',
    'services',
    'complaints',
    'health',
    'readiness',
  ],
  'Editor Konten': ['content'],
  'Operator Layanan': ['services'],
  'Operator Pengaduan': ['complaints'],
  'Pengelola Informasi Kesehatan': ['health'],
  Viewer: [],
};
export function can(role: string, permission: string) {
  return (permissions[role] || []).some((p) => p === '*' || p === permission);
}
export function scope(entity: string) {
  if (['ServiceRequests', 'Services', 'Proposals'].includes(entity))
    return 'services';
  if (entity === 'Complaints') return 'complaints';
  if (entity === 'HealthAgenda') return 'health';
  if (['Budgets', 'Projects'].includes(entity)) return 'finance';
  if (entity === 'Readiness') return 'readiness';
  if (['Users', 'AuditLogs', 'SiteSettings'].includes(entity)) return '*';
  return 'content';
}

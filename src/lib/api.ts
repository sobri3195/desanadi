import type { Row } from './schema';
export type PublicData = Record<string, Row[]>;
export type User = {
  googleSub: string;
  displayName: string;
  email: string;
  role: string;
  csrf: string;
};
export async function api<T>(
  path: string,
  body?: unknown,
  csrf?: string,
): Promise<T> {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    credentials: 'same-origin',
    headers:
      body === undefined
        ? {}
        : {
            'Content-Type': 'application/json',
            ...(csrf ? { 'X-CSRF-Token': csrf } : {}),
          },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const result = await response.json();
  if (!response.ok || !result.success)
    throw new Error(result.error?.message || 'Tidak dapat memuat data.');
  return result.data;
}
export const rupiah = (n: unknown) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(n) || 0);
export const date = (v: unknown) =>
  v && !isNaN(Date.parse(String(v)))
    ? new Intl.DateTimeFormat('id-ID', {
        dateStyle: 'long',
        timeZone: 'Asia/Jakarta',
      }).format(new Date(String(v)))
    : 'Belum tersedia';

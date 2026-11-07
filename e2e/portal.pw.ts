import { createRequire } from 'node:module';
import { test, expect } from '@playwright/test';
const data = {
  SiteSettings: [],
  News: [],
  Announcements: [],
  Budgets: [],
  PopulationStats: [],
  VillageProfile: [],
  Services: [],
  FAQ: [],
};
test.beforeEach(async ({ page }) => {
  await page.route('**/api/public', (route) =>
    route.fulfill({ json: { success: true, data } }),
  );
});
for (const width of [360, 768, 1440])
  test(`public portal fits ${width}px and navigation works`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height: 900 });
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText(
      'Desa yang terhubung',
    );
    await expect(page.getByText('Belum ada informasi')).toBeVisible();
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= window.innerWidth,
      ),
    ).toBe(true);
    if (width < 768) {
      await page
        .getByRole('button', { name: 'Buka menu', exact: true })
        .click();
      await expect(
        page.getByRole('navigation', { name: 'Semua halaman' }),
      ).toBeVisible();
      await page
        .getByRole('button', { name: 'Tutup menu', exact: true })
        .click();
    }
    await page.getByRole('link', { name: 'Temukan layanan' }).click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText(
      'Layanan Desa',
    );
    await expect(page.getByText('Belum ada informasi')).toBeVisible();
  });
test('complaint submission and protected status tracking through mocked API boundary', async ({
  page,
}) => {
  let submission: any;
  await page.route('**/api/complaints', async (route) => {
    const p = route.request().postDataJSON();
    if (p.operation === 'track') {
      if (p.params.verification !== 'v'.repeat(72))
        return route.fulfill({
          status: 404,
          json: {
            success: false,
            error: { message: 'Referensi atau kunci verifikasi tidak cocok.' },
          },
        });
      return route.fulfill({
        json: {
          success: true,
          data: {
            status: 'Under Review',
            updatedAt: '2026-01-01',
            history: [
              { status: 'Submitted', createdAt: '2026-01-01' },
              { status: 'Under Review', createdAt: '2026-01-01' },
            ],
          },
        },
      });
    }
    submission = p;
    return route.fulfill({
      status: 201,
      json: {
        success: true,
        data: {
          reference: 'NADI-00000000-0000-4000-8000-000000000001',
          verification: 'v'.repeat(72),
        },
      },
    });
  });
  await page.goto('/pengaduan');
  await page.getByRole('button', { name: 'Kirim permohonan' }).click();
  await expect(page.getByText('Minimal 5 karakter.')).toBeVisible();
  await page.getByLabel('Pokok permohonan').fill('Fasilitas ruang publik');
  await page
    .getByLabel('Uraian')
    .fill('Lampu ruang publik perlu diperiksa oleh petugas.');
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Kirim permohonan' }).click();
  await expect(
    page.getByRole('heading', { name: 'Permohonan tersimpan' }),
  ).toBeVisible();
  expect(submission.idempotencyKey).toMatch(/^[a-f0-9-]{36}$/);
  await page.getByRole('link', { name: 'Lacak status', exact: true }).click();
  await page.getByLabel('Jenis permohonan').selectOption('complaints');
  await page
    .getByLabel('Referensi', { exact: true })
    .fill('NADI-00000000-0000-4000-8000-000000000001');
  await page
    .getByLabel('Kunci verifikasi', { exact: true })
    .fill('x'.repeat(72));
  await page.getByRole('button', { name: 'Periksa status' }).click();
  await expect(page.getByRole('alert')).toContainText('tidak cocok');
  await page
    .getByLabel('Kunci verifikasi', { exact: true })
    .fill('v'.repeat(72));
  await page.getByRole('button', { name: 'Periksa status' }).click();
  await expect(
    page.getByRole('heading', { name: 'Dalam peninjauan' }),
  ).toBeVisible();
  expect(await page.evaluate(() => localStorage.length)).toBe(0);
});
test('public error is recoverable and admin login fails closed without client configuration', async ({
  page,
}) => {
  await page.route('**/api/public', (r) =>
    r.fulfill({
      status: 503,
      json: {
        success: false,
        error: { message: 'Layanan belum dikonfigurasi.' },
      },
    }),
  );
  await page.goto('/');
  await expect(page.getByRole('alert')).toContainText(
    'Layanan belum dikonfigurasi.',
  );
  await expect(page.getByRole('button', { name: 'Coba lagi' })).toBeVisible();
  await page.goto('/admin');
  await expect(
    page.getByRole('heading', { name: 'Ruang Pengelola' }),
  ).toBeVisible();
  await expect(
    page.getByText(/Login Google belum dikonfigurasi/),
  ).toBeVisible();
});

test('public portal accessibility includes browser color contrast', async ({
  page,
}) => {
  await page.goto('/');
  await expect(page.getByText('Belum ada informasi')).toBeVisible();
  await page.addScriptTag({
    path: createRequire(import.meta.url).resolve('axe-core/axe.min.js'),
  });
  const violations = await page.evaluate(async () => {
    const { violations } = await (window as any).axe.run(document);
    return violations.map((v: any) => ({
      id: v.id,
      impact: v.impact,
      targets: v.nodes.map((n: any) => n.target),
    }));
  });
  expect(violations).toEqual([]);
});

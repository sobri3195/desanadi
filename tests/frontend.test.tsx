// @vitest-environment jsdom
import { afterEach, expect, it, vi } from 'vitest';
import { render, screen, cleanup, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import axe from 'axe-core';
import '@testing-library/jest-dom/vitest';
import Home from '../src/pages/Home';
import PublicPage from '../src/pages/PublicPage';
import Request from '../src/pages/Request';
import Layout from '../src/components/Layout';
function mount(ui: React.ReactNode, path = '/') {
  return render(
    <QueryClientProvider
      client={
        new QueryClient({ defaultOptions: { queries: { retry: false } } })
      }
    >
      <MemoryRouter initialEntries={[path]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
  );
}
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
function empty() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { News: [], Announcements: [], SiteSettings: [] },
      }),
    }),
  );
}
it('renders public empty states and service navigation without fabricated figures', async () => {
  empty();
  mount(<Home />);
  expect(await screen.findByText('Belum ada informasi')).toBeInTheDocument();
  expect(screen.getByRole('link', { name: /Temukan layanan/ })).toHaveAttribute(
    'href',
    '/layanan',
  );
  expect(screen.getByText(/Anggaran resmi belum/)).toBeInTheDocument();
});
it('renders a recoverable API error', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        success: false,
        error: { message: 'Backend belum tersedia.' },
      }),
    }),
  );
  mount(<Home />);
  expect(await screen.findByRole('alert')).toHaveTextContent(
    'Backend belum tersedia.',
  );
  expect(screen.getByRole('button', { name: 'Coba lagi' })).toBeInTheDocument();
});
it('opens and closes accessible mobile navigation', async () => {
  empty();
  mount(
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<p>Konten</p>} />
      </Route>
    </Routes>,
  );
  const user = userEvent.setup();
  const button = screen.getByRole('button', { name: 'Buka menu' });
  await user.click(button);
  expect(
    screen.getByRole('navigation', { name: 'Semua halaman' }),
  ).toBeInTheDocument();
  await user.click(screen.getByRole('button', { name: 'Tutup menu' }));
  expect(
    screen.queryByRole('navigation', { name: 'Semua halaman' }),
  ).not.toBeInTheDocument();
});
it('validates minimal public complaint form', async () => {
  empty();
  mount(<Request />, '/pengaduan');
  await userEvent.click(
    screen.getByRole('button', { name: 'Kirim permohonan' }),
  );
  expect(await screen.findByText('Minimal 5 karakter.')).toBeInTheDocument();
  expect(screen.getByText('Persetujuan diperlukan.')).toBeInTheDocument();
});
it('does not render HTML embedded in public content', async () => {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          FAQ: [
            {
              id: 'one',
              question: 'Uji',
              answer: '<img src=x onerror=alert(1)>',
            },
          ],
        },
      }),
    }),
  );
  mount(<PublicPage />, '/asisten');
  expect(
    await screen.findByText('<img src=x onerror=alert(1)>'),
  ).toBeInTheDocument();
  expect(document.querySelector('img')).toBeNull();
});
it('has no serious or critical automated accessibility violations in the public shell', async () => {
  empty();
  const { container } = mount(
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
      </Route>
    </Routes>,
  );
  await waitFor(() =>
    expect(screen.getByText('Belum ada informasi')).toBeInTheDocument(),
  );
  const result = await axe.run(container, {
    rules: { 'color-contrast': { enabled: false } },
  });
  expect(
    result.violations.filter((v) =>
      ['serious', 'critical'].includes(v.impact || ''),
    ),
  ).toEqual([]);
});

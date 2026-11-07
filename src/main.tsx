import { lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import Layout from './components/Layout';
import Home from './pages/Home';
import { Loading } from './components/Content';
import './styles/index.css';
const PublicPage = lazy(() => import('./pages/PublicPage')),
  RequestPage = lazy(() => import('./pages/Request')),
  Admin = lazy(() => import('./pages/Admin')),
  Privacy = lazy(() => import('./pages/Privacy'));
const client = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30000, retry: 1, refetchOnWindowFocus: false },
  },
});
createRoot(document.getElementById('root')!).render(
  <QueryClientProvider client={client}>
    <BrowserRouter>
      <Suspense fallback={<Loading />}>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="privasi" element={<Privacy />} />
            {['permohonan', 'pengaduan', 'usulan', 'lacak'].map((path) => (
              <Route
                key={path}
                path={path}
                element={<RequestPage key={path} />}
              />
            ))}
            <Route path="berita/:slug" element={<PublicPage />} />
            <Route
              path=":page"
              element={<PublicPage key={window.location.pathname} />}
            />
          </Route>
          <Route path="admin" element={<Admin />} />
          <Route path="admin/:entity" element={<Admin />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  </QueryClientProvider>,
);

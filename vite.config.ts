import { defineConfig, loadEnv, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import type { ApiResponse } from './server/http.ts';
function localApi(): Plugin {
  return {
    name: 'desa-nadi-local-api',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const path = req.url?.split('?')[0];
        const endpoints: Record<string, string> = {
          '/api/health': 'health',
          '/api/public': 'public',
          '/api/admin': 'admin',
          '/api/services': 'services',
          '/api/complaints': 'complaints',
          '/api/proposals': 'proposals',
          '/api/auth/login': 'login',
          '/api/auth/logout': 'logout',
          '/api/auth/me': 'me',
        };
        if (!path?.startsWith('/api/')) return next();
        if (!endpoints[path]) {
          res.statusCode = 404;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: false,
              error: {
                code: 'NOT_FOUND',
                message: 'Endpoint tidak ditemukan.',
              },
            }),
          );
          return;
        }
        try {
          let raw = '';
          for await (const chunk of req) {
            raw += chunk.toString();
            if (raw.length > 100000) {
              res.statusCode = 413;
              res.end();
              return;
            }
          }
          const body = raw ? JSON.parse(raw) : undefined;
          const response: ApiResponse = {
            setHeader: (name, value) => res.setHeader(name, value),
            status: (code) => {
              res.statusCode = code;
              return response;
            },
            json: (data) => {
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify(data));
            },
          };
          const { handler } = await server.ssrLoadModule('/server/handler.ts');
          await handler(endpoints[path])(
            { method: req.method, headers: req.headers, body },
            response,
          );
        } catch {
          res.statusCode = 400;
          res.setHeader('Content-Type', 'application/json');
          res.end(
            JSON.stringify({
              success: false,
              error: {
                code: 'VALIDATION',
                message: 'Permintaan tidak dapat diproses.',
              },
            }),
          );
        }
      });
    },
  };
}
export default defineConfig(({ mode }) => {
  Object.assign(process.env, loadEnv(mode, process.cwd(), ''));
  return { plugins: [react(), tailwindcss(), localApi()] };
});

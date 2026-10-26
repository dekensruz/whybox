// Serves the files of /api during development, the same way the hosting platform does in production:
// /api/lessons/plan -> api/lessons/plan.ts, exported function named after the HTTP method.
import { existsSync } from 'node:fs';
import type { IncomingMessage } from 'node:http';
import path from 'node:path';
import type { Plugin } from 'vite';

const readRequestBody = (req: IncomingMessage) =>
  new Promise<Buffer>((resolve, reject) => {
    const chunks: Buffer[] = [];
    req.on('data', (chunk: Buffer) => chunks.push(chunk));
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });

export const devApi = (): Plugin => ({
  name: 'whybox-dev-api',
  configureServer(server) {
    server.middlewares.use(async (req, res, next) => {
      const url = new URL(req.url ?? '/', 'http://localhost');
      if (!url.pathname.startsWith('/api/')) return next();

      const file = path.join(server.config.root, `${url.pathname.replace(/\/$/, '')}.ts`);
      if (!/^\/api\/[a-z0-9/_-]+$/i.test(url.pathname) || !existsSync(file)) {
        res.statusCode = 404;
        return res.end();
      }

      try {
        const module = await server.ssrLoadModule(file);
        const handler = module[req.method ?? 'GET'] as ((request: Request) => Promise<Response>) | undefined;
        if (!handler) {
          res.statusCode = 405;
          return res.end();
        }

        const body = req.method === 'GET' || req.method === 'HEAD' ? undefined : await readRequestBody(req);
        const request = new Request(url, {
          method: req.method,
          headers: req.headers as Record<string, string>,
          body,
        });
        const response = await handler(request);

        res.statusCode = response.status;
        response.headers.forEach((value, key) => res.setHeader(key, value));
        res.end(Buffer.from(await response.arrayBuffer()));
      } catch (error) {
        server.ssrFixStacktrace(error as Error);
        next(error);
      }
    });
  },
});

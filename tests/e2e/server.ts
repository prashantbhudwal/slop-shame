// A tiny dependency-free static server, intentionally limited to synthetic HTML.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { basename, resolve } from 'node:path';

const port = Number(process.env.SLOP_FIXTURE_PORT ?? 4179);
const fixtureDir = resolve('tests/fixtures/feed');

const server = createServer(async (req, res) => {
  const pathname = new URL(req.url ?? '/', 'http://127.0.0.1').pathname;
  if (pathname === '/health') {
    res.writeHead(200, { 'content-type': 'text/plain' }).end('Slop Shame fixture server');
    return;
  }
  const file = pathname.slice(1);
  if (file !== basename(file) || !/^[\w-]+\.html$/.test(file)) {
    res.writeHead(404).end();
    return;
  }
  try {
    const html = await readFile(resolve(fixtureDir, file));
    res.writeHead(200, { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'no-store' }).end(html);
  } catch {
    res.writeHead(404).end();
  }
});
server.listen(port, '127.0.0.1', () => console.log(`Fixture server: http://127.0.0.1:${port}`));
for (const signal of ['SIGINT', 'SIGTERM'] as const) process.once(signal, () => server.close());

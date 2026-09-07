import http from 'node:http';
import {readFile, realpath} from 'node:fs/promises';
import path from 'node:path';
import {ROOT, SITE_FILES} from './site-files.mjs';

const args = process.argv.slice(2);
const root = args.includes('--dist') ? path.join(ROOT, 'dist') : ROOT;
const baseIndex = args.indexOf('--base');
const base = baseIndex < 0 ? '/' : args[baseIndex + 1];
if (!base || !/^\/(?:[A-Za-z0-9_-]+\/)*$/.test(base)) {
  throw new Error('Use --base /repository-name/ with leading and trailing slashes.');
}
const port = process.env.PORT === undefined ? 4173 : Number(process.env.PORT);
const allowed = new Set([...SITE_FILES, ...(args.includes('--dist') ? ['404.html'] : [])]);
const types = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.png': 'image/png', '.wav': 'audio/wav',
  '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8'
};

const server = http.createServer(async (request, response) => {
  try {
    const url = new URL(request.url, 'http://localhost');
    const pathname = decodeURIComponent(url.pathname);
    if (base !== '/' && pathname === base.slice(0, -1)) {
      response.writeHead(308, {Location: base}).end(); return;
    }
    if (!pathname.startsWith(base)) { response.writeHead(404).end('Not found'); return; }
    const name = pathname.slice(base.length) || 'index.html';
    const target = path.resolve(root, name);
    if (!target.startsWith(root + path.sep) || name.split('/').some(part => part.startsWith('.') && part !== '.nojekyll')) {
      response.writeHead(403).end('Forbidden'); return;
    }
    if (!allowed.has(name)) { response.writeHead(404).end('Not found'); return; }
    if (!(await realpath(target)).startsWith(root + path.sep)) {
      response.writeHead(403).end('Forbidden'); return;
    }
    const data = await readFile(target);
    response.writeHead(200, {
      'Content-Type': types[path.extname(target)] || 'application/octet-stream',
      'Cache-Control': 'no-cache', 'X-Content-Type-Options': 'nosniff'
    });
    response.end(request.method === 'HEAD' ? undefined : data);
  } catch {
    response.writeHead(404, {'Content-Type': 'text/plain'}).end('Not found');
  }
});
server.listen(port, '127.0.0.1', () => {
  console.log(`Full Throttle: http://127.0.0.1:${server.address().port}${base}`);
});

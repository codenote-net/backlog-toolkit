import http from 'node:http';
import { readFile } from 'node:fs/promises';

let uploads = 0;
let comments = 0;
const server = http.createServer(async (req, res) => {
  const path = new URL(req.url, 'http://127.0.0.1:4173').pathname;
  res.setHeader('Cache-Control', 'no-store');
  if (req.method === 'POST') {
    // Discard request bodies. This fixture does not store files or comments.
    req.resume();
    if (path === '/api/v2/space/attachment' || path === '/api/v2/space/attachment/') uploads++;
    else if (path === '/api/v2/issues/1/comments') comments++;
    else { res.writeHead(404).end(); return; }
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ ok: true }));
  } else if (path === '/stats') {
    res.writeHead(200, { 'Content-Type': 'application/json' }).end(JSON.stringify({ uploads, comments }));
  } else if (path === '/' || path === '/demo.js') {
    const name = path === '/' ? 'index.html' : 'demo.js';
    const body = await readFile(new URL(name, import.meta.url));
    res.writeHead(200, { 'Content-Type': name.endsWith('.html') ? 'text/html; charset=utf-8' : 'text/javascript' }).end(body);
  } else res.writeHead(404).end();
});
server.listen(4173, '127.0.0.1', () => console.log('Demo ready: http://127.0.0.1:4173'));

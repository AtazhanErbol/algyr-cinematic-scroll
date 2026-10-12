// Zero-install local preview. Only public assets and the exported page are served.
import http from 'node:http';
import path from 'node:path';
import { stat } from 'node:fs/promises';
import { createReadStream } from 'node:fs';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const port = Number(process.argv[2] || 8080);
if (!Number.isInteger(port) || port < 1024 || port > 65535) throw new Error('Port must be 1024–65535');
const types = { '.html':'text/html; charset=utf-8', '.js':'text/javascript; charset=utf-8', '.css':'text/css; charset=utf-8', '.json':'application/json', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.mp4':'video/mp4', '.woff2':'font/woff2' };
const allowed = ['preview', 'public/build', 'public/vendor/algyr-scroll', 'public/media', 'public/favicon.svg'].map(item => path.resolve(root, item));
http.createServer(async (request, response) => {
    try {
        if (!['GET','HEAD'].includes(request.method)) { response.writeHead(405).end(); return; }
        let pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
        if (pathname === '/') pathname = '/preview/index.html';
        if (pathname.startsWith('/build/')) pathname = '/public' + pathname;
        if (pathname === '/favicon.ico') { response.writeHead(204).end(); return; }
        const file = path.resolve(root, '.' + pathname);
        if (!allowed.some(prefix => file === prefix || file.startsWith(prefix + path.sep))) { response.writeHead(404).end(); return; }
        const info = await stat(file);
        if (!info.isFile()) { response.writeHead(404).end(); return; }
        if (!info.size) { response.writeHead(503).end(); return; }
        const headers = { 'Content-Type': types[path.extname(file)] || 'application/octet-stream', 'Accept-Ranges':'bytes', 'Cache-Control':'no-cache' };
        let start = 0, end = info.size - 1, code = 200;
        if (request.headers.range) {
            const match = /^bytes=(\d+)-(\d*)$/.exec(request.headers.range);
            if (!match) { response.writeHead(416, {'Content-Range':`bytes */${info.size}`}).end(); return; }
            start = Number(match[1]);
            end = match[2] ? Math.min(Number(match[2]), end) : end;
            if (start > end || start >= info.size) { response.writeHead(416, {'Content-Range':`bytes */${info.size}`}).end(); return; }
            code = 206;
            headers['Content-Range'] = `bytes ${start}-${end}/${info.size}`;
        }
        headers['Content-Length'] = end - start + 1;
        response.writeHead(code, headers);
        if (request.method === 'HEAD') response.end();
        else createReadStream(file, {start,end}).on('error', () => response.destroy()).pipe(response);
    } catch { if (response.headersSent) response.destroy(); else response.writeHead(404).end(); }
}).listen(port, '127.0.0.1', () => console.log(`ALGYR preview: http://127.0.0.1:${port}`));

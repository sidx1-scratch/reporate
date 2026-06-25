// server.js
// Zero-dependency local dev server. Serves the static frontend and
// implements POST /api/review with the same logic the Vercel function uses,
// so `npm start` behaves like the deployed app.

import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { handleReviewRequest } from './lib/handleReview.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Auto-load .env for local dev convenience (Node 20.6+). No-op if missing.
try {
  process.loadEnvFile(path.join(__dirname, '.env'));
} catch {
  // .env not present — fine if the key is exported some other way
}

const PORT = process.env.PORT || 3000;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon',
};

function readBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
      if (data.length > 1e6) req.destroy(); // 1MB guard
    });
    req.on('end', () => resolve(data));
    req.on('error', reject);
  });
}

function serveStatic(req, res) {
  let urlPath = req.url === '/' ? '/index.html' : req.url.split('?')[0];
  const filePath = path.join(__dirname, urlPath);

  // Don't allow escaping the project root.
  if (!filePath.startsWith(__dirname)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { 'Content-Type': MIME_TYPES[ext] || 'application/octet-stream' });
    res.end(content);
  });
}

const server = http.createServer(async (req, res) => {
  if (req.method === 'POST' && req.url === '/api/review') {
    try {
      const raw = await readBody(req);
      const body = raw ? JSON.parse(raw) : {};
      const { status, payload } = await handleReviewRequest(body);
      res.writeHead(status, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(payload));
    } catch (err) {
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request: ' + err.message }));
    }
    return;
  }

  if (req.method === 'GET') {
    serveStatic(req, res);
    return;
  }

  res.writeHead(405);
  res.end('Method not allowed');
});

server.listen(PORT, () => {
  if (!process.env.OPENROUTER_API_KEY) {
    console.warn(
      '⚠️  OPENROUTER_API_KEY is not set. Copy .env.example to .env and add your key,\n' +
      '   or export it directly: export OPENROUTER_API_KEY=sk-or-...'
    );
  }
  console.log(`🛒 RepoCart running at http://localhost:${PORT}`);
});

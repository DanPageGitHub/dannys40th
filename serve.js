/**
 * Serves this folder at http://localhost:8080
 * Run from anywhere: node serve.js
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const ROOT = __dirname;

const mime = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let url = req.url.split('?')[0];
  const query = req.url.includes('?') ? '?' + req.url.split('?')[1] : '';
  if (url === '/') url = '/index.html';
  // Extensionless URLs: serve the .html so /visualiser2 and /visualiser2.html both work
  if (url === '/visualiser2' || url === '/visualiser2/') url = '/visualiser2.html';
  if (url === '/visualiser' || url === '/visualiser/') url = '/visualiser.html';
  const file = path.join(ROOT, path.normalize(url));

  if (!file.startsWith(ROOT)) {
    res.writeHead(403);
    res.end();
    return;
  }

  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain', 'Cache-Control': 'no-store, no-cache, must-revalidate' });
      res.end('Not found');
      return;
    }
    const ext = path.extname(file);
    const type = mime[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('');
  console.log('  Server running at:');
  console.log('    http://localhost:' + PORT);
  console.log('    http://localhost:' + PORT + '/visualiser2.html');
  console.log('');
  console.log('  Serving from: ' + ROOT);
  console.log('  Stop with Ctrl+C');
  console.log('');
});

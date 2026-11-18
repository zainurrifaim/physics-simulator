// Screenshot the frame-check page with headless Chrome/Edge (no npm dependencies).
// Usage: node tests/screenshot.mjs <out.png> "<query>" [width] [height]
//   e.g. node tests/screenshot.mjs shots/angkat.png "id=angkat&sets=A,B&cols=6" 1800 900
//        node tests/screenshot.mjs shots/app.png "/#sim/angkat" 1400 900
// Starts its own static server on a free port.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, join, normalize, resolve, dirname } from 'node:path';
import { execFile } from 'node:child_process';
import { tmpdir } from 'node:os';
import { mkdtempSync } from 'node:fs';

const [outFile, query = '', width = '1800', height = '1000'] = process.argv.slice(2);
if (!outFile) { console.error('usage: node tests/screenshot.mjs <out.png> "<query>" [w] [h]'); process.exit(1); }
const root = resolve('site');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.svg': 'image/svg+xml' };
const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = normalize(join(root, path.endsWith('/') ? path + 'index.html' : path));
  if (!file.startsWith(root)) return res.writeHead(403).end();
  let body;
  try { body = await readFile(file); } catch { return res.writeHead(404).end(); }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' }).end(body);
});
await new Promise((ok) => server.listen(0, ok));
const port = server.address().port;
const browsers = [
  'C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  '/usr/bin/google-chrome', '/usr/bin/chromium',
];
const browser = browsers.find(existsSync);
if (!browser) { console.error('No Chrome/Edge found'); process.exit(1); }
mkdirSync(dirname(resolve(outFile)), { recursive: true });
// a query starting with '/' is a page path (e.g. "/#sim/angkat"); otherwise it is passed to dev/frames.html
const url = query.startsWith('/') ? `http://localhost:${port}${query}` : `http://localhost:${port}/dev/frames.html?${query}`;
const profile = mkdtempSync(join(tmpdir(), 'frames-'));
try {
  // async: the static server above lives in this process and must keep answering
  await new Promise((ok, fail) => execFile(browser, ['--headless=new', '--disable-gpu', '--hide-scrollbars', '--no-first-run', `--user-data-dir=${profile}`, `--window-size=${width},${height}`, '--virtual-time-budget=3000', `--screenshot=${resolve(outFile)}`, url], { timeout: 90000 }, (err) => (err ? fail(err) : ok())));
  console.log(`saved ${resolve(outFile)}  (${url})`);
} finally { server.close(); }

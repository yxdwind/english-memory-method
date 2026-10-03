#!/usr/bin/env node
/**
 * bin/preview.mjs · v2.21
 *
 * 启动一个本地静态服务器，让用户在浏览器里预览背诵方案样例。
 *
 * 用法：
 *   node bin/preview.mjs [--port 4173] [--root .]
 *
 * 默认：
 *   - 端口 4173
 *   - 根目录 = 当前 workspace
 *   - 索引页 = workspace 根目录的 HTML 列表 + tests/samples/ 目录
 *
 * 零依赖（node:http + node:fs + node:path + node:url）。
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const args = process.argv.slice(2);
let port = 4173;
let root = process.cwd();
for (let i = 0; i < args.length; i++){
  if (args[i] === '--port' && args[i+1]) { port = +args[i+1]; i++; }
  else if (args[i] === '--root' && args[i+1]) { root = path.resolve(args[i+1]); i++; }
}

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js':   'text/javascript; charset=utf-8',
  '.mjs':  'text/javascript; charset=utf-8',
  '.css':  'text/css; charset=utf-8',
  '.svg':  'image/svg+xml',
  '.json': 'application/json; charset=utf-8',
  '.png':  'image/png',
  '.jpg':  'image/jpeg',
  '.md':   'text/markdown; charset=utf-8'
};

function safeJoin(root, urlPath){
  // 解析 URL → 相对路径
  const decoded = decodeURIComponent(urlPath.split('?')[0]);
  const target = path.normalize(path.join(root, decoded));
  // 防止越权访问
  if (!target.startsWith(path.normalize(root))) return null;
  return target;
}

function indexHtml(root, relDir){
  const dir = path.join(root, relDir);
  let entries = [];
  try { entries = fs.readdirSync(dir, { withFileTypes: true }).sort(); } catch(e){ entries = []; }
  const lines = [];
  lines.push('<!doctype html><html lang="zh-CN"><head><meta charset="utf-8">');
  lines.push('<title>EMM Preview · ' + relDir + '</title>');
  lines.push('<style>body{font-family:system-ui,sans-serif;max-width:900px;margin:2rem auto;padding:0 1rem;color:#1f2937;}h1{font-size:20px;border-bottom:2px solid #2563eb;padding-bottom:6px;}li{margin:4px 0;font-size:14px;}a{color:#1d4ed8;text-decoration:none;}a:hover{text-decoration:underline;}.note{background:#fef3c7;border-left:4px solid #f59e0b;padding:8px 12px;margin:12px 0;font-size:13px;}</style>');
  lines.push('</head><body>');
  lines.push('<h1>📚 EMM Preview · <code>' + relDir + '</code></h1>');
  if (relDir !== '.' && relDir !== ''){
    const parent = path.posix.dirname(relDir);
    lines.push('<p><a href="/' + (parent === '.' ? '' : parent) + '">⬆ 上一级</a></p>');
  }
  lines.push('<div class="note">这是 <code>bin/preview.mjs</code> 的本地预览服务器。所有 .html 文件在浏览器中可正常打开（localStorage 等本地 API 完整可用）。</div>');
  if (!entries.length){
    lines.push('<p><i>空目录</i></p>');
  } else {
    lines.push('<ul>');
    for (const e of entries){
      const href = (relDir ? relDir + '/' : '') + e.name;
      const isDir = e.isDirectory();
      lines.push('<li>' + (isDir ? '📁 ' : '📄 ') + '<a href="/' + href + '">' + e.name + '</a>' + (isDir ? '/' : '') + '</li>');
    }
    lines.push('</ul>');
  }
  lines.push('<hr><p style="font-size:12px;color:#6b7280;">EMM-pilot-2026 · 端口 ' + port + ' · Ctrl+C 退出</p>');
  lines.push('</body></html>');
  return lines.join('\n');
}

const server = http.createServer((req, res) => {
  if (req.method !== 'GET' && req.method !== 'HEAD'){
    res.writeHead(405); res.end('Method Not Allowed'); return;
  }
  const target = safeJoin(root, req.url || '/');
  if (!target){
    res.writeHead(403); res.end('Forbidden'); return;
  }
  let stat;
  try { stat = fs.statSync(target); } catch(e){
    res.writeHead(404); res.end('Not Found: ' + req.url); return;
  }
  if (stat.isDirectory()){
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(indexHtml(root, decodeURIComponent((req.url || '/').split('?')[0]).replace(/^\/+/, '').replace(/\/+$/, '')));
    return;
  }
  const ext = path.extname(target).toLowerCase();
  const mime = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': mime });
  if (req.method === 'HEAD'){ res.end(); return; }
  fs.createReadStream(target).pipe(res);
});

server.listen(port, () => {
  console.log('\n  EMM Preview · http://localhost:' + port + '/');
  console.log('  样例方案目录：http://localhost:' + port + '/tests/samples/');
  console.log('  工作区根目录：http://localhost:' + port + '/');
  console.log('  Ctrl+C 退出\n');
});

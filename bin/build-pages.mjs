#!/usr/bin/env node
// english-memory-method · GitHub Pages 在线样例站构建（v2.30.1+）
// 从 tests/samples/ 的 *-memorization-plan.html 生成落地页 index.html 并复制样例到输出目录。
// 用法：node bin/build-pages.mjs [--out <dir>]   （默认 <repo>/public）
// 确定性输出：不写生成时间，两次构建逐字一致。

import { readFileSync, writeFileSync, mkdirSync, readdirSync, copyFileSync, rmSync, statSync } from "node:fs";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const argv = process.argv.slice(2);
const oi = argv.indexOf("--out");
const OUT = (oi > -1 && argv[oi + 1]) ? resolve(argv[oi + 1]) : join(PKG_ROOT, "public");
const SAMPLES = join(PKG_ROOT, "tests", "samples");

function esc(s) {
  return String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

const files = readdirSync(SAMPLES)
  .filter(f => /\.html$/i.test(f))
  .sort();

const samples = files.map(f => {
  const html = readFileSync(join(SAMPLES, f), "utf8");
  const titleM = html.match(/<title>([^<]+)<\/title>/);
  const h1M = html.match(/<h1>([\s\S]*?)<\/h1>/);
  const title = (titleM ? titleM[1] : (h1M ? h1M[1].replace(/<[^>]+>/g, "") : f)).trim();
  const sents = (html.match(/class="sent-en"/g) || []).length;
  const typeM = html.match(/(议论文|说明文|叙事文|演讲稿|长文)/);
  const sizeKB = (statSync(join(SAMPLES, f)).size / 1024).toFixed(1);
  return { file: f, title, sents, type: typeM ? typeM[1] : "样例", sizeKB };
});

const cards = samples.map(s =>
  '    <a class="card" href="' + esc(s.file) + '">'
  + '<div class="ct">' + esc(s.title) + '</div>'
  + '<div class="cm"><span class="badge">' + esc(s.type) + '</span>' + s.sents + ' 句 · ' + s.sizeKB + ' KB</div>'
  + '<div class="cgo">打开体验 →</div>'
  + '</a>'
).join("\n");

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>english-memory-method · 在线样例</title>
<style>
  :root{--ink:#1f2937;--muted:#6b7280;--accent:#7c3aed;--line:#e5e7eb;}
  *{box-sizing:border-box;margin:0;padding:0;}
  body{font-family:"Segoe UI","Microsoft YaHei","PingFang SC",sans-serif;background:#f6f8fb;color:var(--ink);line-height:1.75;}
  .wrap{max-width:960px;margin:0 auto;padding:48px 20px 64px;}
  header h1{font-size:28px;color:#4c1d95;}
  header p{color:var(--muted);margin-top:6px;}
  .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:14px;margin-top:26px;}
  .card{display:block;background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 20px;text-decoration:none;color:inherit;transition:all .15s;}
  .card:hover{border-color:#c4b5fd;box-shadow:0 4px 14px rgba(124,58,237,.12);transform:translateY(-2px);}
  .ct{font-size:16.5px;font-weight:700;color:#4c1d95;}
  .cm{font-size:12.5px;color:var(--muted);margin-top:6px;}
  .badge{display:inline-block;background:#f5f3ff;border:1px solid #ddd6fe;color:#6d28d9;border-radius:999px;padding:1px 10px;font-size:12px;font-weight:600;margin-right:8px;}
  .cgo{font-size:13px;font-weight:600;color:var(--accent);margin-top:10px;}
  .how{margin-top:34px;background:#fff;border:1px solid var(--line);border-radius:12px;padding:18px 22px;font-size:14px;}
  .how h2{font-size:16px;margin-bottom:8px;}
  .how code{background:#f3f4f6;border-radius:6px;padding:2px 8px;font-size:13px;}
  .how p{color:#374151;margin:4px 0;}
  footer{margin-top:30px;font-size:12.5px;color:var(--muted);}
  footer a{color:var(--accent);}
  @media (max-width:640px){.grid{grid-template-columns:1fr;}}
</style>
</head>
<body>
<div class="wrap">
  <header>
    <h1>🧠 english-memory-method · 在线样例</h1>
    <p>丢给 AI 一篇英文，它还你一份能打卡、能听写、能影子跟读的背诵方案——下面是真实生成的样例，点开即用（进度存本机浏览器）。</p>
  </header>
  <div class="grid">
${cards}
  </div>
  <div class="how">
    <h2>想让 AI 背你自己的文章？</h2>
    <p>① 一行命令装进你的 Agent 平台：<code>irm https://cdn.jsdelivr.net/gh/yxdwind/english-memory-method@main/install.ps1 | iex</code>（Windows）或 <code>curl -fsSL https://cdn.jsdelivr.net/gh/yxdwind/english-memory-method@main/install.sh | bash</code>（macOS / Linux）</p>
    <p>② 然后对 AI 说：「出背诵方案」+ 贴上文章。</p>
    <p>③ 支持 16+ 平台（Claude Code / Codex / Trae / 通义灵码 / Comate / CodeBuddy / Kimi / MiniMax…），安装方式见 <a href="https://github.com/yxdwind/english-memory-method">GitHub 仓库</a>。</p>
  </div>
  <footer>进度数据只存在你本机浏览器的 localStorage，不上传任何服务器 · <a href="https://github.com/yxdwind/english-memory-method">github.com/yxdwind/english-memory-method</a> · MIT</footer>
</div>
</body>
</html>
`;

mkdirSync(OUT, { recursive: true });
for (const s of samples) copyFileSync(join(SAMPLES, s.file), join(OUT, s.file));
writeFileSync(join(OUT, "index.html"), html);
console.log("✓ Pages 站构建完成 → " + OUT);
console.log("  样例 " + samples.length + " 篇：" + samples.map(s => s.title).join(" / "));

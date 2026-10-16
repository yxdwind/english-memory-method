/**
 * v2.30.1 GitHub Pages 样例站构建 · 产物级验证
 *
 * 跑 bin/build-pages.mjs 到临时目录，验证：
 *   a. 落地页生成且收录全部样例（标题 + 链接 + 元信息）
 *   b. 样例 HTML 完整复制
 *   c. 两次构建逐字一致（确定性输出，可复现）
 *
 * 跑：node tests/pages-build.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

const outDir = fs.mkdtempSync(path.join(os.tmpdir(), 'emm-pages-'));
try {
  console.log('\n== v2.30.1 Pages 样例站构建 · 产物级验证 ==');
  execFileSync(process.execPath, [path.join(HERE, '..', 'bin', 'build-pages.mjs'), '--out', outDir], { stdio: 'pipe' });
  const index = fs.readFileSync(path.join(outDir, 'index.html'), 'utf8');
  ok(index.includes('Gettysburg Address背诵方案'), '落地页收录 Gettysburg 样例');
  ok(index.includes('AI 与教育背诵方案'), '落地页收录 AI 与教育样例');
  ok(/href="getty-memorialization-plan\.html"/.test(index), 'Gettysburg 链接可点');
  ok(/href="ai-education-plan\.html"/.test(index), 'AI 链接可点');
  ok(/class="sent-en"/.test(fs.readFileSync(path.join(outDir, 'getty-memorialization-plan.html'), 'utf8')), '样例复制完整（含逐句区）');
  ok(fs.existsSync(path.join(outDir, 'ai-education-plan.html')), 'AI 样例已复制');
  ok(/localStorage/.test(index), '落地页声明进度仅存本机');
  // 确定性：重跑逐字一致
  const outDir2 = fs.mkdtempSync(path.join(os.tmpdir(), 'emm-pages2-'));
  execFileSync(process.execPath, [path.join(HERE, '..', 'bin', 'build-pages.mjs'), '--out', outDir2], { stdio: 'pipe' });
  const index2 = fs.readFileSync(path.join(outDir2, 'index.html'), 'utf8');
  ok(index === index2, '两次构建逐字一致（可复现）');
  fs.rmSync(outDir2, { recursive: true, force: true });
} finally {
  fs.rmSync(outDir, { recursive: true, force: true });
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

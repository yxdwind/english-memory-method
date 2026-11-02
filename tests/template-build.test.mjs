/**
 * v2.31.0 模板构建漂移 gate
 *
 * 源码（src/plan/）与产物（assets/plan-template.html）的关系由机器看守：
 *   a. src/plan 10 个源码模块齐全
 *   b. node bin/build-template.mjs --check → 重建必须与已提交产物逐字节一致
 *      （拦两类漂移：改了 src 忘构建；直接手改产物）
 *   c. 产物健全性：6 个 script 块 + 占位符仍在
 *   d. 双副本仍逐字节一致
 *
 * 跑：node tests/template-build.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

console.log('\n== v2.31.0 模板构建漂移 gate ==');

const SRC = [
  '00-head.html', 'css/main.css', '01-body.html',
  'scripts/01-main.js', 'scripts/02-sr.js', 'scripts/03-shadow.js',
  'scripts/04-fold.js', 'scripts/05-onboard.js', 'scripts/06-markers.js',
  '99-tail.html',
];
ok(SRC.every(f => fs.existsSync(path.join(ROOT, 'src/plan', f))), 'src/plan 10 个源码模块齐全');

let checkOk = true, checkOut = '';
try {
  checkOut = execFileSync(process.execPath, [path.join(ROOT, 'bin', 'build-template.mjs'), '--check'], { stdio: 'pipe' }).toString();
} catch (e) { checkOk = false; checkOut = String(e.stderr || e.message); }
ok(checkOk, 'build --check：src/plan 重建 === 已提交产物（无漂移）');

const artifact = fs.readFileSync(path.join(ROOT, 'assets', 'plan-template.html'), 'utf8');
ok((artifact.match(/<script>/g) || []).length === 6, '产物仍为 6 个 script 块');
ok(artifact.includes('{{TITLE}}'), '产物保留 {{TITLE}} 占位符');

const copy = fs.readFileSync(path.join(ROOT, 'skills', 'english-memory-method', 'assets', 'plan-template.html'), 'utf8');
ok(copy === artifact, 'assets 与 skills 双副本逐字节一致');

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

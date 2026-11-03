/**
 * v2.31.0+ 模板构建漂移 gate（v2.33.0 起覆盖双模板）
 *
 * 源码（src/plan、src/library）与产物（assets/*.html）的关系由机器看守：
 *   a. src/plan 10 个源码模块齐全
 *   b. src/library 5 个源码模块齐全
 *   c. node bin/build-template.mjs --check → plan/library 重建都必须与已提交产物逐字节一致
 *      （拦两类漂移：改了 src 忘构建；直接手改产物）
 *   d. 产物健全性：plan 7 个 script 块 + 占位符；library 2 个 script 块（store 注入 + 主脚本）
 *   e. 双副本逐字节一致（assets ≡ skills）
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

console.log('\n== 模板构建漂移 gate（plan + library）==');

const PLAN_SRC = [
  '00-head.html', 'css/main.css', '01-body.html',
  'scripts/00-store.js', 'scripts/01-main.js', 'scripts/02-sr.js', 'scripts/03-shadow.js',
  'scripts/04-fold.js', 'scripts/05-onboard.js', 'scripts/06-markers.js',
  '99-tail.html',
];
ok(PLAN_SRC.every(f => fs.existsSync(path.join(ROOT, 'src/plan', f))), 'src/plan 11 个源码模块齐全');

const LIB_SRC = [
  '00-head.html', 'css/main.css', '01-body.html', 'scripts/01-lib.js', '99-tail.html',
];
ok(LIB_SRC.every(f => fs.existsSync(path.join(ROOT, 'src/library', f))), 'src/library 5 个源码模块齐全');

let checkOk = true;
try {
  execFileSync(process.execPath, [path.join(ROOT, 'bin', 'build-template.mjs'), '--check'], { stdio: 'pipe' });
} catch (e) { checkOk = false; }
ok(checkOk, 'build --check：plan/library 重建 === 已提交产物（无漂移）');

const plan = fs.readFileSync(path.join(ROOT, 'assets', 'plan-template.html'), 'utf8');
ok((plan.match(/<script>/g) || []).length === 7, 'plan 产物为 7 个 script 块（00-store + 6 原有）');
ok(plan.includes('{{TITLE}}'), 'plan 产物保留 {{TITLE}} 占位符');

const lib = fs.readFileSync(path.join(ROOT, 'assets', 'library-template.html'), 'utf8');
ok((lib.match(/<script>/g) || []).length === 2, 'library 产物为 2 个 script 块（EMMProgressStore 注入 + 主脚本）');
ok(lib.includes('{{DATE}}') && lib.includes('{{ARTICLES}}'), 'library 产物保留填充占位符');

const planCopy = fs.readFileSync(path.join(ROOT, 'skills', 'english-memory-method', 'assets', 'plan-template.html'), 'utf8');
const libCopy = fs.readFileSync(path.join(ROOT, 'skills', 'english-memory-method', 'assets', 'library-template.html'), 'utf8');
ok(planCopy === plan && libCopy === lib, 'assets 与 skills 双副本逐字节一致（双模板）');

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

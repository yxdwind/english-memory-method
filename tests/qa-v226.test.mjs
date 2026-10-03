/**
 * v2.26 EMM_FIXTURE_V226 Fixture 同步 · 运行时验证
 *
 * 验证：
 *   a. bin/sync-fixtures.mjs 存在
 *   b. fixture-success.html 同步后与 samples 一致
 *   c. --check 模式：有差异时退出码 1；无差异时退出码 0
 *   d. plan-template.html 含 EMM_FIXTURE_V226 锚点
 *   e. version-check 通过
 *
 * 跑：node tests/qa-v226.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const planTpl = fs.readFileSync(path.join(ROOT, 'skills', 'english-memory-method', 'assets', 'plan-template.html'), 'utf8');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

console.log('\n== v2.26 EMM_FIXTURE_V226 Fixture 同步 运行时验证 ==');

// A. bin/sync-fixtures.mjs 存在
ok(fs.existsSync('/workspace/bin/sync-fixtures.mjs') || fs.existsSync(path.join(ROOT, 'bin', 'sync-fixtures.mjs')),
  'bin/sync-fixtures.mjs 文件存在');

// B. fixture-success.html 与 samples/getty 内容一致（已同步）
{
  const sample = fs.readFileSync(path.join(ROOT, 'tests', 'samples', 'getty-memorialization-plan.html'), 'utf8');
  const fixture = fs.readFileSync(path.join(ROOT, 'tests', 'fixtures', 'fixture-success.html'), 'utf8');
  ok(sample === fixture, `fixture-success.html 与 samples 一致（length: ${sample.length}）`);
}

// C. --check 模式无差异时退出码 0
{
  let exitCode = 0;
  try { execSync('node bin/sync-fixtures.mjs --check', { cwd: ROOT, stdio: 'pipe' }); }
  catch(e){ exitCode = e.status || -1; }
  ok(exitCode === 0, `无差异时 --check 退出码 0（actual ${exitCode}）`);
}

// D. EMM_FIXTURE_V226 锚点
ok(/EMM_FIXTURE_V226/.test(planTpl), 'plan-template.html 含 EMM_FIXTURE_V226 锚点');

// E. package.json v2.26.0+ + npm script
const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
function geSemver(a, b){
  const pa = a.split('.').map(Number), pb = b.split('.').map(Number);
  for (let i = 0; i < 3; i++){
    if ((pa[i]||0) > (pb[i]||0)) return true;
    if ((pa[i]||0) < (pb[i]||0)) return false;
  }
  return true;
}
ok(geSemver(pkg.version, '2.26.0'), `package.json version ≥ 2.26.0（actual ${pkg.version}）`);
ok(pkg.scripts['sync-fixtures'] === 'node bin/sync-fixtures.mjs', 'npm script sync-fixtures 注册');

// F. --check 模式有差异时退出码 1（临时改 fixture 内容）
{
  const fp = path.join(ROOT, 'tests', 'fixtures', 'fixture-success.html');
  const orig = fs.readFileSync(fp, 'utf8');
  fs.writeFileSync(fp, orig + '\n<!-- tampered -->\n', 'utf8');
  let exitCode = 0;
  try { execSync('node bin/sync-fixtures.mjs --check', { cwd: ROOT, stdio: 'pipe' }); }
  catch(e){ exitCode = e.status || -1; }
  ok(exitCode === 1, `有差异时 --check 退出码 1（actual ${exitCode}）`);
  // 还原
  fs.writeFileSync(fp, orig, 'utf8');
}

// H. 还原验证
{
  let exitCode = 0;
  try { execSync('node bin/sync-fixtures.mjs --check', { cwd: ROOT, stdio: 'pipe' }); }
  catch(e){ exitCode = e.status || -1; }
  ok(exitCode === 0, '还原后 --check 又恢复 0');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);
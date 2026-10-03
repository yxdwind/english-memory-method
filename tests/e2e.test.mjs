/**
 * v2.28 EMM_E2E_V228 端到端流程 · 运行时验证
 *
 * 验证：
 *   a. bin/e2e-flow.mjs 文件存在
 *   b. 默认样本（getty）35/35 全绿
 *   c. AI 样本 35/35 全绿
 *   d. --strict 模式下 exit 0
 *   e. EMM_E2E_V228 锚点在 plan-template.html
 *   f. docs/E2E.md 存在且含 6 节
 *   g. plan-template.html 含 EMM_E2E_V228 锚点
 *   h. package.json v2.28.0 + npm script 注册
 *   i. bin/build-samples.mjs 多句插入修复（getty 含 10 个 .sent）
 *
 * 跑：node tests/e2e.test.mjs
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

console.log('\n== v2.28 EMM_E2E_V228 端到端流程 运行时验证 ==');

// A. bin/e2e-flow.mjs 存在
ok(fs.existsSync(path.join(ROOT, 'bin', 'e2e-flow.mjs')),
  'bin/e2e-flow.mjs 文件存在');

// B. 默认样本（getty）跑成功
{
  let output = '';
  let exitCode = 0;
  try {
    output = execSync('node bin/e2e-flow.mjs --strict', { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
  } catch (e) { exitCode = e.status || -1; output = (e.stdout || '') + (e.stderr || ''); }
  const m = output.match(/✅\s*(\d+).*❌\s*(\d+)/);
  ok(exitCode === 0, `默认样本（getty）--strict 退出码 0（actual ${exitCode}）`);
  ok(m && Number(m[1]) >= 35 && Number(m[2]) === 0,
    `默认样本通过 35+ 步骤（actual ${m ? `${m[1]} 通过 / ${m[2]} 失败` : '未匹配'}）`);
}

// C. AI 样本跑成功
{
  let output = '';
  let exitCode = 0;
  try {
    output = execSync('node bin/e2e-flow.mjs --sample ai --strict', { cwd: ROOT, stdio: 'pipe', encoding: 'utf8' });
  } catch (e) { exitCode = e.status || -1; output = (e.stdout || '') + (e.stderr || ''); }
  const m = output.match(/✅\s*(\d+).*❌\s*(\d+)/);
  ok(exitCode === 0, `AI 样本 --strict 退出码 0（actual ${exitCode}）`);
  ok(m && Number(m[1]) >= 35 && Number(m[2]) === 0,
    `AI 样本通过 35+ 步骤（actual ${m ? `${m[1]} 通过 / ${m[2]} 失败` : '未匹配'}）`);
}

// D. 不用 --strict 时 exit 总是 0（informational 失败不阻断）
{
  let exitCode = 0;
  try { execSync('node bin/e2e-flow.mjs', { cwd: ROOT, stdio: 'pipe' }); }
  catch (e) { exitCode = e.status || -1; }
  ok(exitCode === 0, `默认模式（无 --strict）退出码 0（actual ${exitCode}）`);
}

// E. EMM_E2E_V228 锚点
ok(/EMM_E2E_V228/.test(planTpl), 'plan-template.html 含 EMM_E2E_V228 锚点');

// F. docs/E2E.md 存在且含 6 节
{
  const docPath = path.join(ROOT, 'docs', 'E2E.md');
  ok(fs.existsSync(docPath), 'docs/E2E.md 文件存在');
  if (fs.existsSync(docPath)){
    const doc = fs.readFileSync(docPath, 'utf8');
    ok(/^## 1\./m.test(doc), '含 §1 测试矩阵');
    ok(/^## 2\./m.test(doc), '含 §2 全链路 35 步');
    ok(/^## 3\./m.test(doc), '含 §3 v2.28 揭示的 bug');
    ok(/^## 4\./m.test(doc), '含 §4 何时跑 e2e');
    ok(/^## 5\./m.test(doc), '含 §5 与其它测试的关系');
    ok(/^## 6\./m.test(doc), '含 §6 不在 e2e 范围内');
    ok(/endRound/.test(doc), '文档含 endRound bug 说明');
  }
}

// G. package.json v2.28.0 + npm script
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  ok(pkg.version === '2.28.0', `package.json version = 2.28.0（actual ${pkg.version}）`);
  ok(pkg.scripts['e2e'] === 'node bin/e2e-flow.mjs',
    'npm script e2e 注册');
}

// H. bin/build-samples.mjs 多句插入修复（getty 含 10 个 .sent）
{
  const getty = fs.readFileSync(path.join(ROOT, 'tests', 'samples', 'getty-memorialization-plan.html'), 'utf8');
  const sentCount = (getty.match(/class="sent"/g) || []).length;
  ok(sentCount === 10, `getty 样本含 10 个 .sent（actual ${sentCount}）`);
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);

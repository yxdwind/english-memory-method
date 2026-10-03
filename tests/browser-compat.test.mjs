/**
 * v2.27 EMM_BROWSER_V227 跨浏览器 API 兼容性 · 运行时验证
 *
 * 验证：
 *   a. bin/check-browser-compat.mjs 存在
 *   b. 脚本默认运行（无 --strict）退出码 0
 *   c. 输出含 4 大浏览器名 + 总览表头
 *   d. 5 个已知 ⚠ API 在矩阵中（speechSynthesis/MediaRecorder/getUserMedia/confirm/alert）
 *   e. 已知全 ✅ API 也在矩阵中（localStorage/Blob/FileReader）
 *   f. --strict 模式：有 ⚠ 时退出码 1
 *   g. docs/CROSS-BROWSER.md 存在且含 6 大节
 *   h. plan-template.html 含 EMM_BROWSER_V227 锚点
 *   i. package.json v2.27.0 + npm script check-browser-compat 注册
 *
 * 跑：node tests/browser-compat.test.mjs
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

console.log('\n== v2.27 EMM_BROWSER_V227 跨浏览器兼容性 运行时验证 ==');

// A. bin/check-browser-compat.mjs 存在
ok(fs.existsSync(path.join(ROOT, 'bin', 'check-browser-compat.mjs')),
  'bin/check-browser-compat.mjs 文件存在');

// B. 默认运行退出码 0
let output = '';
{
  let exitCode = 0;
  try {
    output = execSync('node bin/check-browser-compat.mjs', {
      cwd: ROOT, stdio: 'pipe', encoding: 'utf8'
    });
  } catch (e) { exitCode = e.status || -1; }
  ok(exitCode === 0, `默认模式退出码 0（actual ${exitCode}）`);
}

// C. 输出含 4 大浏览器 + 总览表头
{
  ok(/Chrome/.test(output),  '输出含 "Chrome"');
  ok(/Firefox/.test(output), '输出含 "Firefox"');
  ok(/Safari/.test(output),  '输出含 "Safari"');
  ok(/Edge/.test(output),    '输出含 "Edge"');
  ok(/兼容性报告/.test(output) || /compatibility/i.test(output), '输出含兼容性报告表头');
}

// D. 5 个已知 ⚠ API 都在矩阵
const warned = ['speechSynthesis', 'MediaRecorder', 'getUserMedia', 'confirm', 'alert'];
warned.forEach(api => ok(output.includes(api), `矩阵含 ${api}`));

// E. 已知全 ✅ API 也在矩阵（注意：脚本仅展示模板中实际用到的 API，故只选模板里出现的）
const safe = ['localStorage', 'Blob', 'FileReader', 'Intl.DateTimeFormat', 'padStart', 'addEventListener', 'setTimeout', 'JSON.parse', 'Date.now', 'querySelectorAll', 'createElement', 'appendChild'];
safe.forEach(api => ok(output.includes(api), `矩阵含 ${api}`));

// F. 警告计数
{
  const m = output.match(/⚠ 有 (\d+) 个 API/);
  ok(m && Number(m[1]) === 5, `警告数 = 5（actual ${m ? m[1] : '未匹配'}）`);
}

// G. --strict 模式：有 ⚠ 时退出码 1
{
  let exitCode = 0;
  try {
    execSync('node bin/check-browser-compat.mjs --strict', { cwd: ROOT, stdio: 'pipe' });
  } catch (e) { exitCode = e.status || -1; }
  ok(exitCode === 1, `--strict 模式退出码 1（actual ${exitCode}）`);
}

// H. docs/CROSS-BROWSER.md 存在且含 6 节
{
  const docPath = path.join(ROOT, 'docs', 'CROSS-BROWSER.md');
  ok(fs.existsSync(docPath), 'docs/CROSS-BROWSER.md 文件存在');
  if (fs.existsSync(docPath)) {
    const doc = fs.readFileSync(docPath, 'utf8');
    ok(/^## 1\./m.test(doc), '含 §1 总览');
    ok(/^## 2\./m.test(doc), '含 §2 已知 bug');
    ok(/^## 3\./m.test(doc), '含 §3 Playwright');
    ok(/^## 4\./m.test(doc), '含 §4 手动 checklist');
    ok(/^## 5\./m.test(doc), '含 §5 报告输出');
    ok(/^## 6\./m.test(doc), '含 §6 何时更新');
    ok(/Firefox/.test(doc) && /Safari/.test(doc) && /Chrome/.test(doc) && /Edge/.test(doc),
      '文档含 4 大浏览器');
  }
}

// I. EMM_BROWSER_V227 锚点
ok(/EMM_BROWSER_V227/.test(planTpl), 'plan-template.html 含 EMM_BROWSER_V227 锚点');

// J. package.json v2.27.0 + npm script
{
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  ok(pkg.version >= '2.27.0', `package.json version >= 2.27.0（actual ${pkg.version}）`);
  ok(pkg.scripts['check-browser-compat'] === 'node bin/check-browser-compat.mjs',
    'npm script check-browser-compat 注册');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);

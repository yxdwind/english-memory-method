/**
 * v2.43.0 规则 7 · 脚本截断防护 · 运行时验证
 *
 * 背景：SKILL.md「记忆库校验第 5 条」早就硬性要求填充后的 memory-library.html
 * 里 `</script` 恰好 2 次，但一直只给了一条手写 `node -e` 命令，verify-plan 完全没实现。
 * 数据串里混入裸 `</script` 会让 HTML 解析器提前闭合脚本、整页 JS 静默挂掉（书架空白），
 * 而 `node --check` 与浏览器外提取都查不出来。本版把它变成第 7 条硬规则。
 *
 * 检查：
 *   a. 干净方案 / 干净记忆库 → 规则 7 pass、退出码 0
 *   b. 记忆库数据串注入裸 `</script` → 规则 7 fail、退出码 1
 *   c. 记忆库多一个脚本块（闭合数 3）→ fail
 *   d. 转义写法 `<\/script` 不触发误报
 *   e. 方案文件脚本块开闭合配平
 *
 * 跑：node tests/script-truncation.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const VERIFY = path.join(ROOT, 'bin', 'verify-plan.mjs');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'emm-script-'));
function run(file) {
  let code = 0, out = '';
  try { out = execFileSync(process.execPath, [VERIFY, file, '--no-color'], { encoding: 'utf8' }); }
  catch (e) { code = e.status ?? 1; out = (e.stdout || '') + (e.stderr || ''); }
  const line = (out.split('\n').find(l => l.includes('规则 7')) || '');
  return { code, out, line, pass: /✅/.test(line), fail: /❌/.test(line) };
}
function writeLib(name, mutate) {
  const tpl = fs.readFileSync(path.join(ROOT, 'assets', 'library-template.html'), 'utf8');
  const p = path.join(tmp, name);
  fs.writeFileSync(p, mutate ? mutate(tpl) : tpl, 'utf8');
  return p;
}

console.log('\n== v2.43.0 规则 7 脚本截断防护 运行时验证 ==');

// 静态：规则已注册进主流程（不是只写在 help 里）
const src = fs.readFileSync(VERIFY, 'utf8');
ok(/rule7_scriptTruncation\(html, filePath\)/.test(src), 'verifyFile 主流程调用规则 7');
ok(/覆盖的 7 条硬规则/.test(src), 'CLI help 声明 7 条硬规则');

// A. 干净方案（模板 + 真实样本）→ pass
{
  const r = run(path.join(ROOT, 'tests', 'fixtures', 'fixture-success.html'));
  ok(r.code === 0 && r.pass, `干净方案规则 7 ✅、退出码 0（实际 ${r.code}）`);
  ok(/<script> \d+ \/ <\/script \d+/.test(r.line), '规则 7 输出开/闭合计数');
}
{
  const r = run(path.join(ROOT, 'tests', 'samples', 'boundary-100-plan.html'));
  ok(r.code === 0 && r.pass, '100 句边界样本规则 7 ✅');
}

// B. 干净记忆库 → 恰好 2 次闭合
{
  const p = writeLib('clean-library.html');
  const r = run(p);
  ok((fs.readFileSync(p, 'utf8').match(/<\/script/gi) || []).length === 2, '干净记忆库 </script 恰好 2 次');
  ok(r.code === 0 && r.pass, `干净记忆库规则 7 ✅、退出码 0（实际 ${r.code}）`);
}

// C. 数据串注入裸 `</script`（在 ARTICLES 里的标题字段）→ 必须 fail
{
  const p = writeLib('hostile-library.html', tpl =>
    tpl.replace('{{ARTICLES}}', '{ title: "Dream</script>", file: "x.html" }'));
  const r = run(p);
  ok(r.code === 1, `注入裸 </script 后退出码 1（实际 ${r.code}）`);
  ok(r.fail, '规则 7 判 ❌ 并给出开闭合配平诊断');
  ok(/开标签/.test(r.out) && /闭合/.test(r.out), '诊断信息说明开标签/闭合数失配');
}

// D. 多一个脚本块（3 次闭合）→ 记忆库强制「恰好 2 次」拦下
{
  const p = writeLib('extra-library.html', tpl =>
    tpl.replace('</body>', '<script>var extra = 1;</script></body>'));
  const r = run(p);
  ok(r.code === 1 && /恰好 2 次/.test(r.out), '记忆库 3 个脚本块被「恰好 2 次」规则拦下');
}

// E. 转义写法 <\/script 不误报（在 JS 字符串里是安全的）
{
  const p = writeLib('escaped-library.html', tpl =>
    tpl.replace('{{ARTICLES}}', '{ title: "Dream<\\/script>", file: "x.html" }'));
  const r = run(p);
  const closes = (fs.readFileSync(p, 'utf8').match(/<\/script/gi) || []).length;
  ok(closes === 2, `转义写法不被计入 </script（实际 ${closes} 次）`);
  ok(r.code === 0 && r.pass, '转义写法规则 7 ✅、无误报');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

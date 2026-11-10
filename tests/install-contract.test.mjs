/**
 * v2.37.1 安装器契约 gate
 *
 * 背景：三个安装器此前都只装 SKILL.md + assets/plan-template.html，漏了
 * assets/library-template.html；而 SKILL.md「个人记忆库」流程要求复制该模板，
 * 于是「生成记忆库」在已安装环境必然缺文件。release-build.test 只校验发布 zip
 * 的内容，管不到「安装后目录」，所以这个 bug 在 670 项测试全绿时依然存活。
 *
 * 检查：
 *   a. 三个安装器的文件清单都含 3 项且含 library-template.html
 *   b. 真正执行 `node bin/install.mjs --target <临时目录>`，断言 3 个文件落地且逐字一致
 *
 * 跑：node tests/install-contract.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

const REQUIRED = ['SKILL.md', 'assets/plan-template.html', 'assets/library-template.html'];

console.log('\n== v2.37.1 安装器契约 gate ==');

// A. 三份清单静态一致（防止改 script 忘了改 ps1 / sh，或以后新增模板再漏）
{
  const ps1 = read('install.ps1');
  const sh = read('install.sh');
  const mjs = read('bin/install.mjs');
  const psLine = (/\$Files\s*=\s*@\(([^)]*)\)/.exec(ps1) || [])[1] || '';
  const shLine = (/^FILES=\(([^)]*)\)/m.exec(sh) || [])[1] || '';
  const mjsBlock = (/const FILES = \[([\s\S]*?)\];/.exec(mjs) || [])[1] || '';
  ok(REQUIRED.every(f => psLine.includes(f)), 'install.ps1 $Files 含全部 3 个文件');
  ok(REQUIRED.every(f => shLine.includes(f)), 'install.sh FILES 含全部 3 个文件');
  ok(REQUIRED.every(f => mjsBlock.includes(f)), 'bin/install.mjs FILES 含全部 3 个文件');
  const counts = [psLine, shLine, mjsBlock].map(s => (s.match(/\.html|\.md/g) || []).length);
  ok(counts.every(n => n === 3), `三份清单都恰好 3 项（${counts.join('/')}）`);
}

// B. 实跑 npm bin 安装器到临时目录，检查产物
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'emm-install-'));
  try {
    let exitOk = true;
    try {
      execFileSync(process.execPath, [path.join(ROOT, 'bin', 'install.mjs'), '--target', tmp],
        { stdio: 'pipe', cwd: ROOT });
    } catch (e) { exitOk = false; }
    ok(exitOk, 'bin/install.mjs --target 实跑成功（exit 0）');
    const dest = path.join(tmp, 'english-memory-method');
    for (const rel of REQUIRED) {
      const out = path.join(dest, rel);
      const exists = fs.existsSync(out);
      const same = exists && read(rel).replace(/\r\n/g, '\n') === fs.readFileSync(out, 'utf8').replace(/\r\n/g, '\n');
      ok(same, `安装产物 ${rel} 存在且与源逐字一致`);
    }
  } finally {
    fs.rmSync(tmp, { recursive: true, force: true });
  }
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

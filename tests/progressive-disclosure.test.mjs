/**
 * v2.44.0 渐进披露：REFERENCE.md 全链路 · 运行时验证
 *
 * 检查 SKILL.md 拆分后，参考层确实随每一条分发路径一起到达用户手里
 * （本地安装器 / 离线发布包 / skills 副本），而不只是「搬了个文件」。
 *
 * 跑：node tests/progressive-disclosure.test.mjs
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

console.log('\n== v2.44.0 渐进披露 REFERENCE.md 全链路 ==');

const skill = read('SKILL.md'), ref = read('REFERENCE.md');
// A. 内容与边界
ok(skill.includes('## 参考层(按需加载') && skill.includes('REFERENCE.md'), 'SKILL.md 有按需加载导航');
ok(skill.split('\n').length < 500, `SKILL.md 瘦身到 500 行内（${skill.split('\n').length} 行）`);
ok(['同类 skill 借鉴与信源', '记忆力友好包', '主要参考出处'].every(x => ref.includes('## ' + x)),
  '3 个纯参考章节都在 REFERENCE.md');
ok(!skill.includes('## 同类 skill 借鉴与信源') && !skill.includes('## 主要参考出处'),
  '参考章节已从 SKILL.md 正文移除');
ok(skill.includes('## 命名规范') && skill.includes('## 结构图规范') && skill.includes('## 内容校验'),
  '执行规则仍留在 SKILL.md（不误搬）');
ok(ref.includes('按需加载参考层') && ref.includes('不含行为约束'), 'REFERENCE.md 自我声明为参考层');

// B. 双副本
ok(ref.replace(/\r\n/g, '\n') === read('skills/english-memory-method/REFERENCE.md').replace(/\r\n/g, '\n'),
  '根 REFERENCE.md ≡ skills/ 副本');

// C. 三份安装器清单
ok(read('install.sh').includes('FILES=("SKILL.md" "REFERENCE.md"'), 'install.sh 清单含 REFERENCE.md');
ok(read('install.ps1').includes('@("SKILL.md", "REFERENCE.md"'), 'install.ps1 清单含 REFERENCE.md');
ok(read('bin/install.mjs').includes('"REFERENCE.md",'), 'bin/install.mjs FILES 含 REFERENCE.md');

// D. 实跑安装器：4 个文件都落地
{
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'emm-ref-'));
  try {
    let code = 0;
    try { execFileSync(process.execPath, [path.join(ROOT, 'bin', 'install.mjs'), '--target', tmp], { stdio: 'pipe' }); }
    catch (e) { code = e.status ?? 1; }
    const dest = path.join(tmp, 'english-memory-method');
    ok(code === 0 && fs.existsSync(path.join(dest, 'REFERENCE.md')), '实跑安装器后 REFERENCE.md 落地');
    ok(fs.existsSync(path.join(dest, 'SKILL.md')) &&
       fs.existsSync(path.join(dest, 'assets', 'plan-template.html')) &&
       fs.existsSync(path.join(dest, 'assets', 'library-template.html')), '原有 3 个文件不受影响');
  } finally { fs.rmSync(tmp, { recursive: true, force: true }); }
}

// E. 离线发布包白名单 + version-check 副本对
ok(read('bin/build-release.mjs').includes('"SKILL.md", "REFERENCE.md"'), '发布包白名单含根 REFERENCE.md');
ok(read('bin/version-check.mjs').includes('["REFERENCE.md", "skills/english-memory-method/REFERENCE.md"]'),
  'version-check 增加 REFERENCE.md 副本一致性检查');
ok(read('tests/release-build.test.mjs').includes('`${BUNDLE}/REFERENCE.md`'), '发布包产物断言覆盖 REFERENCE.md');

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

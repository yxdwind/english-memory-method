/**
 * 离线发布包构建（bin/build-release.mjs）· 产物级验证
 *
 * 用 jsdom 无关的纯 Node 方式验证发布附件本身：
 *   a. buildRelease 产出 zip + 双层 SHA256SUMS，门禁默认开启且通过
 *   b. dist/SHA256SUMS 与 zip 实比特哈希一致（Release 附件级校验可用）
 *   c. ZIP 结构可被标准工具解析：必备文件在位、tests/.git/node_modules 不在
 *   d. Unix 权限位正确（install.sh / bin/*.mjs = 0755，文档 = 0644）
 *   e. 包内 SHA256SUMS 逐文件哈希与实抽内容吻合（解压后二次校验可用）
 *   f. 确定性构建：同输入两次构建 zip 字节一致（可复现发布）
 *
 * 跑：node tests/release-build.test.mjs
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const { buildRelease, runGate } = await import(pathToFileURL(path.join(ROOT, 'bin', 'build-release.mjs')).href);

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const BUNDLE = `english-memory-method-v${pkg.version}`;
const ZIP_NAME = `${BUNDLE}.zip`;

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label); }
}

// ── 迷你 ZIP 读取器（store 模式足够；central directory 遍历） ──
function readZip(buf) {
  let eocd = -1;
  for (let i = buf.length - 22; i >= 0; i--) {
    if (buf.readUInt32LE(i) === 0x06054b50) { eocd = i; break; }
  }
  if (eocd < 0) throw new Error('EOCD not found');
  const count = buf.readUInt16LE(eocd + 10);
  let off = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    const nl = buf.readUInt16LE(off + 28);
    const name = buf.slice(off + 46, off + 46 + nl).toString('utf8');
    const mode = buf.readUInt32LE(off + 38) >>> 16;
    const localOff = buf.readUInt32LE(off + 42);
    const lnl = buf.readUInt16LE(localOff + 26);
    const lel = buf.readUInt16LE(localOff + 28);
    const dataStart = localOff + 30 + lnl + lel;
    const size = buf.readUInt32LE(off + 20); // method=store → csize == size
    entries.push({ name, mode, data: buf.slice(dataStart, dataStart + size) });
    off += 46 + nl;
  }
  return entries;
}

function sha256(buf) { return createHash('sha256').update(buf).digest('hex'); }

function tmpDir(tag) {
  const d = fs.mkdtempSync(path.join(os.tmpdir(), `emm-release-${tag}-`));
  return d;
}

console.log('\n== 离线发布包构建 · 产物级验证 ==');

// ── A. 构建 + 双层 SHA256SUMS ──
const outA = tmpDir('a');
const resA = buildRelease({ out: outA, log: () => {} });
ok(fs.existsSync(resA.zipPath), 'zip 已生成');
ok(fs.existsSync(resA.sumsPath), 'dist/SHA256SUMS 已生成');
ok(resA.size > 100 * 1024, `zip 体积合理（${(resA.size / 1024).toFixed(0)} KB）`);

const zipBuf = fs.readFileSync(resA.zipPath);
const sumsOuter = fs.readFileSync(resA.sumsPath, 'utf8').trim();
ok(sumsOuter === `${sha256(zipBuf)}  ${ZIP_NAME}`, 'dist/SHA256SUMS 与 zip 实比特哈希一致');
ok(/^[a-f0-9]{64}  english-memory-method-v\d+\.\d+\.\d+\.zip$/.test(sumsOuter), 'SHA256SUMS 行格式合法（sha256sum -c 可直接消费）');

// ── B. ZIP 结构 ──
const entries = readZip(zipBuf);
const names = entries.map(e => e.name);
const must = [
  `${BUNDLE}/SKILL.md`, `${BUNDLE}/assets/plan-template.html`, `${BUNDLE}/assets/library-template.html`,
  `${BUNDLE}/install.sh`, `${BUNDLE}/install.ps1`, `${BUNDLE}/bin/build-release.mjs`,
  `${BUNDLE}/bin/version-check.mjs`, `${BUNDLE}/skills/english-memory-method/SKILL.md`,
  `${BUNDLE}/platforms/README.md`, `${BUNDLE}/docs/E2E.md`, `${BUNDLE}/.claude-plugin/plugin.json`,
  `${BUNDLE}/package.json`, `${BUNDLE}/CHANGELOG.md`, `${BUNDLE}/SHA256SUMS`,
];
must.forEach(n => ok(names.includes(n), `包含 ${n.slice(BUNDLE.length + 1)}`));
const forbidden = names.filter(n => /\/tests\/|\.git|node_modules|\/dist\//.test(n));
ok(forbidden.length === 0, `不含开发/CI 文件（tests/.git/node_modules/dist）${forbidden.length ? '实际含：' + forbidden[0] : ''}`);
ok(names.length >= 35, `条目数 ≥ 35（actual ${names.length}）`);
ok(new Set(names).size === names.length, '无重复条目（v2.29.0 曾因 walk 基准目录 bug 产生 README.md 重复）');

// ── C. 权限位 ──
const modeOf = (n) => (entries.find(e => e.name === n) || {}).mode;
ok(modeOf(`${BUNDLE}/install.sh`) === 0o755, 'install.sh 权限 0755');
ok(modeOf(`${BUNDLE}/install.ps1`) === 0o755, 'install.ps1 权限 0755');
ok(modeOf(`${BUNDLE}/bin/build-release.mjs`) === 0o755, 'bin/*.mjs 权限 0755');
ok(modeOf(`${BUNDLE}/SKILL.md`) === 0o644, 'SKILL.md 权限 0644');

// ── D. 包内 SHA256SUMS 逐文件吻合 ──
const inner = entries.find(e => e.name === `${BUNDLE}/SHA256SUMS`);
ok(!!inner, '包内 SHA256SUMS 存在');
let innerOk = 0, innerBad = 0;
inner.data.toString('utf8').trim().split('\n').forEach(line => {
  const m = /^([a-f0-9]{64})  (.+)$/.exec(line);
  if (!m) { innerBad++; return; }
  const e = entries.find(x => x.name === `${BUNDLE}/${m[2]}`);
  if (e && sha256(e.data) === m[1]) innerOk++; else innerBad++;
});
ok(innerBad === 0 && innerOk >= 35, `包内 SHA256SUMS ${innerOk} 项全部吻合（失配 ${innerBad}）`);

// ── E. 确定性构建 ──
const outB = tmpDir('b');
buildRelease({ out: outB, log: () => {} });
const zipB = fs.readFileSync(path.join(outB, ZIP_NAME));
ok(Buffer.compare(zipBuf, zipB) === 0, '两次构建 zip 字节一致（可复现发布）');

// ── F. 门禁：正向通过 + 负向拦截（版本漂移 / 副本分叉） ──
ok(runGate(pkg, ROOT).length === 0, '门禁正向：真实仓库全过');
{
  const fake = tmpDir('gate');
  for (const f of ['SKILL.md', 'CHANGELOG.md', 'package.json', 'assets/plan-template.html', 'assets/library-template.html', 'skills/english-memory-method/SKILL.md']) {
    const src = path.join(ROOT, f);
    if (fs.existsSync(src)) {
      fs.mkdirSync(path.dirname(path.join(fake, f)), { recursive: true });
      fs.copyFileSync(src, path.join(fake, f));
    }
  }
  fs.mkdirSync(path.join(fake, '.claude-plugin'), { recursive: true });
  fs.writeFileSync(path.join(fake, '.claude-plugin', 'plugin.json'), JSON.stringify({ version: '9.9.9' }));
  const f1 = runGate(pkg, fake);
  ok(f1.some(m => /plugin\.json/.test(m)), `门禁负向①：plugin.json 版本漂移被拦截（${f1.length} 项）`);
  // 再制造副本分叉：改 skills/ 嵌套 SKILL.md
  fs.writeFileSync(path.join(fake, 'skills/english-memory-method/SKILL.md'), 'tampered');
  const f2 = runGate(pkg, fake);
  ok(f2.some(m => /内容分叉/.test(m)), '门禁负向②：双源副本分叉被拦截');
  try { fs.rmSync(fake, { recursive: true, force: true }); } catch (e) {}
}

// 清理
for (const d of [outA, outB]) { try { fs.rmSync(d, { recursive: true, force: true }); } catch (e) {} }

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed ? 1 : 0);

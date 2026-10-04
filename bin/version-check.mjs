#!/usr/bin/env node
// english-memory-method · 版本一致性自动校验
//
// 检查：
//   1. package.json "version" 字段格式合法（semver）
//   2. 已声明的 EMM_xxx_Vxxx 锚点在对应模板中"恰好出现 1 次"
//   3. package.json 版本号 ≥ 所有锚点版本号（防止"v2.18.0 模板里却写着 v2.7.0 锚点"漂移）
//   4. SKILL.md 与 plan-template.html 的 title 行包含当前版本号
//   5. CHANGELOG.md 最新条目版本号与 package.json 一致
//   6. .claude-plugin/plugin.json 版本与 package.json 一致
//   7. 主副本一致性：assets/ 两个模板与 skills/ 副本逐字节一致（CRLF 归一后）、
//      根 SKILL.md 与 skills/ 副本一致（v2.28.1 起，防双源真相分叉）
//
// 用法：
//   node bin/version-check.mjs            # 默认检查
//   node bin/version-check.mjs --no-color
//   npm run version-check
//
// 退出码：0=全部通过；1=有错；2=参数错

import { readFileSync, existsSync, statSync, readdirSync } from "node:fs";
import { join, dirname, resolve, relative as rel } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── 颜色 ──────────────────────────────────────────────────────────────────
const useColor = !process.argv.includes("--no-color") && process.stdout.isTTY;
const col_ = useColor ? {
  reset: "\x1b[0m", dim: "\x1b[2m", bold: "\x1b[1m",
  red: "\x1b[31m", green: "\x1b[32m", yellow: "\x1b[33m", cyan: "\x1b[36m", gray: "\x1b[90m",
} : Object.fromEntries(["reset", "dim", "bold", "red", "green", "yellow", "cyan", "gray"].map(k => [k, ""]));
function paint(c, s) { return col_[c] + s + col_.reset; }
const ICON = { pass: "✅", fail: "❌", warn: "⚠️ ", skip: "○" };

// ── 版本工具 ──────────────────────────────────────────────────────────────
function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v || ""));
  if (!m) return null;
  return [+m[1], +m[2], +m[3]];
}
function cmpSemver(a, b) {
  for (let i = 0; i < 3; i++) if (a[i] !== b[i]) return a[i] - b[i];
  return 0;
}
function cmpTuple(a, b) { return cmpSemver(a, b); }

// ── 读 package.json ──────────────────────────────────────────────────────
function readPkg() {
  const pkgPath = join(PKG_ROOT, "package.json");
  const pkg = JSON.parse(readFileSync(pkgPath, "utf8"));
  return { pkgPath, pkg };
}

// ── 读锚点声明表（权威）─────────────────────────────────────────────────
const ANCHOR_TABLE = [
  { id: "EMM_TODAY_V213",       version: [2, 13, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "自测与排期套件" },
  { id: "EMM_DRILL_CLOZE_V214", version: [2, 14, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "快刷与交互挖空" },
  { id: "EMM_V215_STABLE",      version: [2, 15, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "稳健性补丁" },
  { id: "EMM_MOBILE_V216",      version: [2, 16, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "移动端自适应" },
  { id: "EMM_LIBRARY_V217",     version: [2, 17, 0], file: "skills/english-memory-method/assets/library-template.html", desc: "个人记忆库" },
  { id: "EMM_FOLD_V218",        version: [2, 18, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "首屏折叠 + on-boarding" },
  { id: "EMM_SHADOW_V219",      version: [2, 19, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "影子跟读（MediaRecorder + 逐词自评）" },
  { id: "EMM_SR_V220",          version: [2, 20, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "SM-2 算法升级（Wozniak 1990）+ 轻量/标准切换" },
  { id: "EMM_PROGRESS_V221",    version: [2, 21, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "进度导出/导入 + 段间切换 + 样例方案" },
  { id: "EMM_QA_V222",          version: [2, 22, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "工程卫生：ics 时区修复 + 备份提醒 + 章节精简 + 渐进引导" },
  { id: "EMM_QUALITY_V223",     version: [2, 23, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "内容质量：按段统计 + ?check=1 内容可疑项 + IPA 校验 + 模式向导" },
  { id: "EMM_UX_V224",          version: [2, 24, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "学习路径优化：轻刷一键回补、状态筛选 chip、今天先做这个按钮" },
  { id: "EMM_ASSESS_V225",      version: [2, 25, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "评估优化：段落测试 60s + 毕业阈值配置" },
  { id: "EMM_FIXTURE_V226",     version: [2, 26, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "工程卫生：fixture 从真实生成反推（bin/sync-fixtures.mjs）" },
  { id: "EMM_BROWSER_V227",     version: [2, 27, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "跨浏览器测试矩阵：bin/check-browser-compat.mjs 静态扫描 + docs/CROSS-BROWSER.md" },
  { id: "EMM_E2E_V228",         version: [2, 28, 0], file: "skills/english-memory-method/assets/plan-template.html",   desc: "端到端测试：bin/e2e-flow.mjs session driver + 修复 endRound 持久化 bug + 修复 build-samples 多句插入" },
];

// ── 各项检查 ─────────────────────────────────────────────────────────────
function checkPkgVersion(pkgVer) {
  const v = parseSemver(pkgVer);
  if (!v) return [{ ok: false, msg: `package.json version "${pkgVer}" 不是合法 semver (X.Y.Z)` }];
  return [{ ok: true, msg: `package.json version = ${pkgVer}` }];
}

function checkAnchors() {
  const out = [];
  for (const anchor of ANCHOR_TABLE) {
    const path = join(PKG_ROOT, anchor.file);
    if (!existsSync(path)) {
      out.push({ ok: false, msg: `${anchor.id}（v${anchor.version.join(".")}）：文件 ${rel(PKG_ROOT, path)} 不存在`, anchor });
      continue;
    }
    const text = readFileSync(path, "utf8");
    const re = new RegExp(anchor.id, "g");
    const count = (text.match(re) || []).length;
    if (count === 1) {
      out.push({ ok: true, msg: `${anchor.id}（v${anchor.version.join(".")}）：在 ${rel(PKG_ROOT, path)} 中恰好 1 次 ✓` });
    } else if (count === 0) {
      out.push({ ok: false, msg: `${anchor.id}（v${anchor.version.join(".")}）：在 ${rel(PKG_ROOT, path)} 中未出现（期望 1 次）`, anchor });
    } else {
      out.push({ ok: false, msg: `${anchor.id}（v${anchor.version.join(".")}）：在 ${rel(PKG_ROOT, path)} 中出现 ${count} 次（期望 1 次）`, anchor });
    }
  }
  return out;
}

function checkAnchorVersionsLtePkg(pkgVer) {
  const v = parseSemver(pkgVer);
  if (!v) return [{ ok: false, msg: "package.json version 不合法，跳过锚点版本对齐检查" }];
  const out = [];
  for (const a of ANCHOR_TABLE) {
    if (cmpTuple(a.version, v) > 0) {
      out.push({ ok: false, msg: `锚点 ${a.id} v${a.version.join(".")} > package.json v${pkgVer}（升级 package.json）` });
    }
  }
  if (out.length === 0) out.push({ ok: true, msg: `所有锚点版本 ≤ package.json v${pkgVer}` });
  return out;
}

function checkTitleFileContains(path, label, pkgVer) {
  const fullPath = join(PKG_ROOT, path);
  if (!existsSync(fullPath)) return [{ ok: false, msg: `${label} 文件 ${rel(PKG_ROOT, fullPath)} 不存在` }];
  const text = readFileSync(fullPath, "utf8");
  const head = text.split("\n").slice(0, 30).join("\n");
  // 在头部找所有 vX.Y.Z，取**最高**（头部可能是 changelog 形式，"v2.13.0 加了 X、v2.14.0 加了 Y……"）
  const versions = [...head.matchAll(/v?(\d+\.\d+\.\d+)/g)].map(m => parseSemver(m[1])).filter(Boolean);
  if (versions.length === 0) return [{ ok: true, msg: `${label} 头部无版本字符串（允许：模板可不含）` }];
  const found = versions.reduce((a, b) => cmpTuple(a, b) > 0 ? a : b);
  // 头部声明的最高版本必须 ≥ 文件中最高锚点版本
  const markers = ANCHOR_TABLE.filter(a => rel(PKG_ROOT, join(PKG_ROOT, a.file)) === rel(PKG_ROOT, fullPath));
  const maxMarker = markers.reduce((m, a) => (m && cmpTuple(m, a.version) > 0 ? m : a.version), null);
  if (maxMarker && cmpTuple(found, maxMarker) < 0) {
    return [{ ok: false, msg: `${label} 头部最高声明 v${found.join(".")}，但文件含 v${maxMarker.join(".")} 锚点（声明必须 ≥ 锚点）` }];
  }
  return [{ ok: true, msg: `${label} 头部最高声明 v${found.join(".")} ≥ 文件最高锚点 v${maxMarker ? maxMarker.join(".") : "(无)"}` }];
}

function checkChangelogLatest(pkgVer) {
  const clPath = join(PKG_ROOT, "CHANGELOG.md");
  if (!existsSync(clPath)) return [{ ok: false, msg: `CHANGELOG.md 不存在` }];
  const text = readFileSync(clPath, "utf8");
  // 找首个 ## [X.Y.Z] 头
  const m = /^##\s*\[(\d+\.\d+\.\d+)\]/m.exec(text);
  if (!m) return [{ ok: false, msg: `CHANGELOG.md 首个版本条目格式不是 ## [X.Y.Z]` }];
  const found = parseSemver(m[1]);
  if (!found) return [{ ok: false, msg: `CHANGELOG.md 最新条目版本 "${m[1]}" 非法` }];
  if (cmpTuple(found, parseSemver(pkgVer)) !== 0) {
    return [{ ok: false, msg: `CHANGELOG.md 最新条目 v${found.join(".")} ≠ package.json v${pkgVer}` }];
  }
  return [{ ok: true, msg: `CHANGELOG.md 最新条目 v${found.join(".")} ✓` }];
}

function checkPluginVersion(pkgVer) {
  const p = join(PKG_ROOT, ".claude-plugin", "plugin.json");
  if (!existsSync(p)) return [{ ok: false, msg: `.claude-plugin/plugin.json 不存在` }];
  let ver = null;
  try { ver = JSON.parse(readFileSync(p, "utf8")).version; } catch (e) {
    return [{ ok: false, msg: `.claude-plugin/plugin.json 解析失败：${e.message}` }];
  }
  if (ver !== pkgVer) {
    return [{ ok: false, msg: `.claude-plugin/plugin.json v${ver} ≠ package.json v${pkgVer}（v2.28.0 时曾漏更到 2.17.0）` }];
  }
  return [{ ok: true, msg: `.claude-plugin/plugin.json v${ver} ✓` }];
}

// CRLF/LF 归一后逐字节比较——行尾差异不视为分叉
function sameFileNorm(a, b) {
  return readFileSync(a, "utf8").replace(/\r\n/g, "\n") === readFileSync(b, "utf8").replace(/\r\n/g, "\n");
}

function checkCopyIdentity() {
  const PAIRS = [
    ["assets/plan-template.html", "skills/english-memory-method/assets/plan-template.html"],
    ["assets/library-template.html", "skills/english-memory-method/assets/library-template.html"],
    ["SKILL.md", "skills/english-memory-method/SKILL.md"],
  ];
  const out = [];
  for (const [main, copy] of PAIRS) {
    const pMain = join(PKG_ROOT, main), pCopy = join(PKG_ROOT, copy);
    if (!existsSync(pMain)) { out.push({ ok: false, msg: `${main} 不存在` }); continue; }
    if (!existsSync(pCopy)) { out.push({ ok: false, msg: `${copy} 不存在` }); continue; }
    if (sameFileNorm(pMain, pCopy)) {
      out.push({ ok: true, msg: `${main} ≡ ${copy}` });
    } else {
      out.push({ ok: false, msg: `${main} 与 ${copy} 内容分叉（v2.28.0 曾因此让 npm 用户拿到旧组件）——重新同步两份副本` });
    }
  }
  return out;
}

// ── 主流程 ───────────────────────────────────────────────────────────────
function main() {
  console.log(paint("bold", "english-memory-method · 版本一致性校验"));
  const { pkg } = readPkg();
  const pkgVer = pkg.version;
  console.log(paint("dim", `package.json: ${pkgVer}    node: ${process.version}\n`));

  const groups = [
    { name: "package.json version 格式",        fn: () => checkPkgVersion(pkgVer) },
    { name: "版本锚点自检（每个恰好 1 次）",    fn: () => checkAnchors() },
    { name: "锚点版本 ≤ package.json",          fn: () => checkAnchorVersionsLtePkg(pkgVer) },
    { name: "SKILL.md 头部版本与 package.json",  fn: () => checkTitleFileContains("SKILL.md", "SKILL.md", pkgVer) },
    { name: "plan-template 头部版本",            fn: () => checkTitleFileContains("skills/english-memory-method/assets/plan-template.html", "plan-template.html", pkgVer) },
    { name: "library-template 头部版本",         fn: () => checkTitleFileContains("skills/english-memory-method/assets/library-template.html", "library-template.html", pkgVer) },
    { name: "CHANGELOG.md 最新条目版本",        fn: () => checkChangelogLatest(pkgVer) },
    { name: "plugin.json 版本与 package.json",   fn: () => checkPluginVersion(pkgVer) },
    { name: "主副本一致性（assets ≡ skills）",   fn: () => checkCopyIdentity() },
  ];

  let totalFail = 0, totalWarn = 0;
  groups.forEach(g => {
    const items = g.fn();
    const failed = items.filter(i => !i.ok).length;
    const icon = failed === 0 ? ICON.pass : ICON.fail;
    const color = failed === 0 ? "green" : "red";
    console.log(`  ${paint(color, icon)}  ${paint("bold", g.name)}`);
    items.forEach(it => {
      const sign = it.ok ? paint("dim", "    · ") : paint("red",   "    ✗ ");
      console.log(`${sign}${it.msg}`);
    });
    if (failed) totalFail++;
  });

  console.log("");
  if (totalFail === 0) {
    console.log(paint("green", `✓ 全部 ${groups.length} 组检查通过（package.json v${pkgVer}）`));
  } else {
    console.log(paint("red", `⚑ ${totalFail} 组检查失败`));
  }
  return totalFail > 0 ? 1 : 0;
}

process.exit(main());
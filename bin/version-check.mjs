#!/usr/bin/env node
// english-memory-method · 版本一致性自动校验
//
// 检查：
//   1. package.json "version" 字段格式合法（semver）
//   2. 扫描模板中的 EMM_xxx_Vxxx 锚点，每个"恰好出现 1 次"（清单自动生成，v2.30.2 起不再手写）
//   3. package.json 版本号 ≥ 所有扫描到的锚点版本号（锚点版本号由锚点名自带，防漂移）
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

// ── 锚点扫描（v2.30.2 起清单自动生成，模板 = 唯一真相源）─────────────────────
// 原实现：23 条手写锚点清单——与模板构成两条真相，注册靠记忆
// （10-31 架构体检险情：改头部注释时把 EMM_UX_V224 唯一出现抹掉）。
// 现实现：扫描两个模板中的 EMM_*_V\d{3}（兼容 EMM_V215_STABLE 式后缀），
// 版本号从锚点名解析（V213 → 2.13.0），"每个锚点恰好 1 次"由扫描结果直接执行——新特性零注册。
const ANCHOR_FILES = [
  "skills/english-memory-method/assets/plan-template.html",
  "skills/english-memory-method/assets/library-template.html",
];
const ANCHOR_RE = /EMM_(?:[A-Z0-9_]+_)?V(\d{3})(?:_[A-Z0-9]+)?/g;

function anchorVersionFromId(id) {
  const m = /V(\d{3})/.exec(id);
  return m ? [+m[1][0], +m[1].slice(1), 0] : null;
}

function scanAnchors() {
  const map = new Map(); // id -> { version:[M,m,0], occurrences:[{file,count}] }
  for (const relPath of ANCHOR_FILES) {
    const p = join(PKG_ROOT, relPath);
    if (!existsSync(p)) continue;
    const text = readFileSync(p, "utf8");
    ANCHOR_RE.lastIndex = 0;
    let m;
    while ((m = ANCHOR_RE.exec(text)) !== null) {
      const id = m[0];
      const version = anchorVersionFromId(id);
      if (!version) continue;
      if (!map.has(id)) map.set(id, { version, occurrences: [] });
      const e = map.get(id);
      const occ = e.occurrences.find(o => o.file === relPath);
      if (occ) occ.count += 1;
      else e.occurrences.push({ file: relPath, count: 1 });
    }
  }
  return map;
}

// ── 各项检查 ─────────────────────────────────────────────────────────────
function checkPkgVersion(pkgVer) {
  const v = parseSemver(pkgVer);
  if (!v) return [{ ok: false, msg: `package.json version "${pkgVer}" 不是合法 semver (X.Y.Z)` }];
  return [{ ok: true, msg: `package.json version = ${pkgVer}` }];
}

function checkAnchors() {
  const anchors = scanAnchors();
  const out = [];
  if (anchors.size === 0) {
    return [{ ok: false, msg: "未在模板中扫描到任何 EMM_*_Vxxx 锚点（模板损坏或路径变化？）" }];
  }
  for (const [id, e] of [...anchors.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    const total = e.occurrences.reduce((s, o) => s + o.count, 0);
    const where = e.occurrences.map(o => `${rel(PKG_ROOT, join(PKG_ROOT, o.file))} ×${o.count}`).join(" + ");
    if (total === 1) {
      out.push({ ok: true, msg: `${id}（v${e.version.join(".")}）：${where} ✓` });
    } else {
      out.push({ ok: false, msg: `${id}（v${e.version.join(".")}）：共出现 ${total} 次（${where}；期望恰好 1 次）` });
    }
  }
  return out;
}
function checkAnchorVersionsLtePkg(pkgVer) {
  const v = parseSemver(pkgVer);
  if (!v) return [{ ok: false, msg: "package.json version 不合法，跳过锚点版本对齐检查" }];
  const out = [];
  for (const [id, e] of scanAnchors()) {
    if (cmpTuple(e.version, v) > 0) {
      out.push({ ok: false, msg: `锚点 ${id} v${e.version.join(".")} > package.json v${pkgVer}（升级 package.json）` });
    }
  }
  if (out.length === 0) out.push({ ok: true, msg: `所有扫描到的锚点版本 ≤ package.json v${pkgVer}` });
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
  const relFull = rel(PKG_ROOT, fullPath);
  const markerVersions = [...scanAnchors().entries()]
    .filter(([, e]) => e.occurrences.some(o => rel(PKG_ROOT, join(PKG_ROOT, o.file)) === relFull))
    .map(([, e]) => e.version);
  const maxMarker = markerVersions.reduce((m, a) => (m && cmpTuple(m, a) > 0 ? m : a), null);
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
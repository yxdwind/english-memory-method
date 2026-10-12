#!/usr/bin/env node
// english-memory-method · 离线发布包构建（bin/build-release.mjs）
//
// 目的（评估报告 P0「可审计安装路径」闭环）：
//   产出可随 GitHub Release 分发的离线 zip + 双层 SHA256SUMS，
//   让安全敏感 / GFW 用户「下载 → 校验 → 解压 → ./install.sh」全程不联网。
//
// 产物（--out 指定目录，默认 dist/）：
//   english-memory-method-vX.Y.Z.zip   发布包（store 模式，确定性构建：同输入必同字节）
//   SHA256SUMS                         zip 自身哈希（Release 附件级校验）
//   （zip 内另含一份 SHA256SUMS，覆盖包内全部文件——解压后可二次校验）
//
// 用法：
//   node bin/build-release.mjs            # 门禁 + 构建
//   node bin/build-release.mjs --out dist # 指定输出目录
//   node bin/build-release.mjs --no-gate  # 跳过一致性门禁（不推荐）
//
// 门禁（默认开启，任一不过即退出 1）：
//   package.json semver 合法 / SKILL.md 标题含当前版本 /
//   .claude-plugin/plugin.json 版本一致 / CHANGELOG 最新条目 [X.Y.Z] 一致 /
//   assets/ ≡ skills/ 副本同一性（防 v2.28.1 双源真相事故）
//   （完整 9 组检查请跑 npm run version-check）
//
// 退出码：0=成功；1=门禁失败或 IO 错误；2=参数错。

import { createHash } from "node:crypto";
import {
  readFileSync, writeFileSync, mkdirSync, existsSync, statSync,
  readdirSync, rmSync,
} from "node:fs";
import { join, dirname, resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

// ── 参数 ──────────────────────────────────────────────────────────────────
function parseArgs(argv) {
  const out = { out: "dist", gate: true };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--out") { out.out = argv[++i] || ""; if (!out.out) return { error: "--out 需要目录参数" }; }
    else if (a === "--no-gate") out.gate = false;
    else if (a === "-h" || a === "--help") return { help: true };
    else return { error: `未知参数：${a}` };
  }
  return out;
}

const USAGE = `用法：node bin/build-release.mjs [--out dist] [--no-gate]`;

// ── 版本工具 ──────────────────────────────────────────────────────────────
function parseSemver(v) {
  const m = /^(\d+)\.(\d+)\.(\d+)/.exec(String(v || ""));
  return m ? [+m[1], +m[2], +m[3]] : null;
}

// ── 门禁（version-check 的子集，进程内完成，不 spawn） ─────────────────────
export function runGate(pkg, root = PKG_ROOT) {
  const fails = [];
  const ver = pkg.version;
  if (!parseSemver(ver)) fails.push(`package.json version "${ver}" 不是合法 semver`);
  const skill = readFileSync(join(root, "SKILL.md"), "utf8");
  if (!new RegExp("v" + ver.replace(/\./g, "\\.")).test(skill.split("\n").slice(0, 10).join("\n")))
    fails.push(`SKILL.md 标题未声明 v${ver}`);
  const plugin = JSON.parse(readFileSync(join(root, ".claude-plugin", "plugin.json"), "utf8"));
  if (plugin.version !== ver) fails.push(`.claude-plugin/plugin.json v${plugin.version} ≠ package.json v${ver}`);
  const cl = readFileSync(join(root, "CHANGELOG.md"), "utf8");
  const latest = /^##\s*\[(\d+\.\d+\.\d+)\]/m.exec(cl);
  if (!latest) fails.push("CHANGELOG.md 首个条目格式不是 ## [X.Y.Z]");
  else if (latest[1] !== ver) fails.push(`CHANGELOG.md 最新条目 v${latest[1]} ≠ package.json v${ver}`);
  const norm = (p) => readFileSync(join(root, p), "utf8").replace(/\r\n/g, "\n");
  for (const [main, copy] of [
    ["assets/plan-template.html", "skills/english-memory-method/assets/plan-template.html"],
    ["assets/library-template.html", "skills/english-memory-method/assets/library-template.html"],
    ["SKILL.md", "skills/english-memory-method/SKILL.md"],
  ]) {
    let a = null, b = null;
    try { a = norm(main); } catch (e) { fails.push(`${main} 读取失败（${e.code || e.message}）`); }
    try { b = norm(copy); } catch (e) { fails.push(`${copy} 读取失败（${e.code || e.message}）`); }
    if (a !== null && b !== null && a !== b) fails.push(`${main} 与 ${copy} 内容分叉（双源真相风险）`);
  }
  return fails;
}

// ── 发布文件白名单（目录递归，确定性排序） ────────────────────────────────
const BUNDLE_FILES = [
  "SKILL.md", "README.md", "readme.en.md", "CHANGELOG.md", "RELEASE-CHECKLIST.md",
  "ANALYSIS.md", "license", "package.json", "install.sh", "install.ps1",
];
const BUNDLE_DIRS = ["bin", "assets", "skills", "platforms", "docs", ".claude-plugin"];
// 明确排除（开发/CI 专用，不进离线包）
const EXCLUDE = [/^\.DS_Store$/, /^node_modules$/, /\.log$/, /^dist$/];

function walk(dir, base = "") {
  const out = [];
  for (const name of readdirSync(dir).sort()) {
    if (EXCLUDE.some((re) => re.test(name))) continue;
    const full = join(dir, name);
    const rel = base ? `${base}/${name}` : name;
    if (statSync(full).isDirectory()) out.push(...walk(full, rel));
    else out.push(rel);
  }
  return out;
}

function collectFiles() {
  const files = [...BUNDLE_FILES];
  for (const d of BUNDLE_DIRS) {
    const full = join(PKG_ROOT, d);
    if (existsSync(full)) files.push(...walk(full, d)); // base=d → 相对仓库根的路径
  }
  return files.filter((f) => existsSync(join(PKG_ROOT, f))).sort();
}

// ── CRC32 + ZIP（store 模式，无外部依赖） ─────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Int32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c;
  }
  return t;
})();
function crc32(buf) {
  let c = -1;
  for (let i = 0; i < buf.length; i++) c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ -1) >>> 0;
}

// 固定 DOS 时间戳（1980-01-01 起）→ 同输入必得同字节（可复现构建）
const DOS_TIME = 0, DOS_DATE = 0x0021; // 1980-01-01

function modeOf(rel) {
  if (/(^|\/)(install\.sh|install\.ps1|.*\.mjs)$/.test(rel)) return 0o755;
  return 0o644;
}

function buildZip(entries) {
  // entries: [{ name, data(Buffer), mode }]
  const chunks = [];
  const central = [];
  let offset = 0;
  for (const e of entries) {
    const nameBuf = Buffer.from(e.name, "utf8");
    const crc = crc32(e.data);
    const lh = Buffer.alloc(30);
    lh.writeUInt32LE(0x04034b50, 0);      // local file header sig
    lh.writeUInt16LE(20, 4);              // version needed
    lh.writeUInt16LE(0x0800, 6);          // flags: UTF-8 names
    lh.writeUInt16LE(0, 8);               // method: store
    lh.writeUInt16LE(DOS_TIME, 10);
    lh.writeUInt16LE(DOS_DATE, 12);
    lh.writeUInt32LE(crc, 14);
    lh.writeUInt32LE(e.data.length, 18);
    lh.writeUInt32LE(e.data.length, 22);
    lh.writeUInt16LE(nameBuf.length, 26);
    lh.writeUInt16LE(0, 28);              // extra len
    chunks.push(lh, nameBuf, e.data);
    const cd = Buffer.alloc(46);
    cd.writeUInt32LE(0x02014b50, 0);      // central dir sig
    cd.writeUInt16LE(0x031e, 4);          // version made by: Unix, 2.0
    cd.writeUInt16LE(20, 6);
    cd.writeUInt16LE(0x0800, 8);
    cd.writeUInt16LE(0, 10);
    cd.writeUInt16LE(DOS_TIME, 12);
    cd.writeUInt16LE(DOS_DATE, 14);
    cd.writeUInt32LE(crc, 16);
    cd.writeUInt32LE(e.data.length, 20);
    cd.writeUInt32LE(e.data.length, 24);
    cd.writeUInt16LE(nameBuf.length, 28);
    cd.writeUInt32LE(0, 30);              // extra/comment len
    cd.writeUInt16LE(0, 34);              // disk start
    cd.writeUInt16LE(0, 36);              // internal attrs
    cd.writeUInt32LE((e.mode & 0xffff) << 16, 38); // external attrs: unix mode
    cd.writeUInt32LE(offset, 42);
    central.push(cd, nameBuf);
    offset += 30 + nameBuf.length + e.data.length;
  }
  const cdBuf = Buffer.concat(central);
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0);
  eocd.writeUInt16LE(0, 4);
  eocd.writeUInt16LE(0, 6);
  eocd.writeUInt16LE(entries.length, 8);
  eocd.writeUInt16LE(entries.length, 10);
  eocd.writeUInt32LE(cdBuf.length, 12);
  eocd.writeUInt32LE(offset, 16);
  eocd.writeUInt16LE(0, 20);
  return Buffer.concat([...chunks, cdBuf, eocd]);
}

function sha256(buf) {
  return createHash("sha256").update(buf).digest("hex");
}

// ── 主流程 ────────────────────────────────────────────────────────────────
export function buildRelease(opts = {}) {
  const outDir = resolve(opts.out || "dist");
  const pkg = JSON.parse(readFileSync(join(PKG_ROOT, "package.json"), "utf8"));
  const ver = pkg.version;
  const bundleName = `english-memory-method-v${ver}`;
  const zipName = `${bundleName}.zip`;

  const log = opts.log || console.log;
  log(`english-memory-method · 离线发布包构建 v${ver}`);

  if (opts.gate !== false) {
    const fails = runGate(pkg);
    if (fails.length) {
      fails.forEach((f) => log(`  ✗ 门禁：${f}`));
      throw new Error(`发布门禁未通过（${fails.length} 项）——修复或 npm run version-check 查看详情`);
    }
    log("  ✅ 发布门禁通过（版本一致性 + 副本同一性）");
  }

  const files = collectFiles();
  const entries = files.map((rel) => ({
    name: `${bundleName}/${rel}`,
    data: readFileSync(join(PKG_ROOT, rel)),
    mode: modeOf(rel),
  }));

  // 包内 SHA256SUMS（文件级，覆盖除自身外全部条目）
  const sumsInner = entries
    .map((e) => `${sha256(e.data)}  ${e.name.slice(bundleName.length + 1)}`)
    .join("\n") + "\n";
  entries.push({ name: `${bundleName}/SHA256SUMS`, data: Buffer.from(sumsInner, "utf8"), mode: 0o644 });

  const zip = buildZip(entries);
  const zipSha = sha256(zip);

  mkdirSync(outDir, { recursive: true });
  writeFileSync(join(outDir, zipName), zip);
  // dist 级 SHA256SUMS（zip 自身哈希——Release 附件下载后第一道校验）
  writeFileSync(join(outDir, "SHA256SUMS"), `${zipSha}  ${zipName}\n`);

  log(`  ✅ ${entries.length} 个文件打包（${(zip.length / 1024).toFixed(1)} KB）`);
  log(`  ✅ ${join(relative(process.cwd(), outDir), zipName)}`);
  log(`  ✅ ${join(relative(process.cwd(), outDir), "SHA256SUMS")}  sha256=${zipSha.slice(0, 16)}…`);
  log("");
  log("发布步骤：");
  log(`  1. 将上面两个文件作为附件上传到 GitHub Release（建议 tag v${ver}）`);
  log("  2. 用户侧：sha256sum -c SHA256SUMS → unzip → ./install.sh（自动本地模式，全程离线）");
  return { outDir, zipName, zipPath: join(outDir, zipName), sumsPath: join(outDir, "SHA256SUMS"), size: zip.length, sha256: zipSha, files: entries.length };
}

function main() {
  const args = parseArgs(process.argv);
  if (args.error || args.help) {
    console.error(args.error || USAGE);
    process.exit(args.error ? 2 : 0);
  }
  try {
    buildRelease({ out: args.out, gate: args.gate });
  } catch (e) {
    console.error("✗ " + (e.message || e));
    process.exit(1);
  }
}

const isMain = process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) main();

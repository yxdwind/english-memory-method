#!/usr/bin/env node
// english-memory-method installer (npm bin)
// Usage:
//   npx english-memory-method              # install to EVERY detected agent platform
//   npx english-memory-method claude,codex # install to specific platforms
//   npx english-memory-method --target /path/to/skills
import { cpSync, existsSync, mkdirSync, readdirSync } from "node:fs";
import { homedir } from "node:os";
import { join, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PKG_ROOT = dirname(dirname(fileURLToPath(import.meta.url)));
const SKILL = "english-memory-method";

const PLATFORMS = {
  autoclaw: ".openclaw-autoclaw/skills",
  openclaw: ".openclaw/skills",
  agents: ".agents/skills",
  claude: ".claude/skills",
  codex: ".codex/skills",
  trae: ".trae/skills",
  lingma: ".lingma/skills",
  comate: ".comate/skills",
  codebuddy: ".codebuddy/skills",
  windsurf: ".windsurf/skills",
  continue: ".continue/skills",
  roo: ".roo/skills",
  kimi: ".kimi-code/skills",
  qoder: ".qoderwork/skills",
  qwen: ".qwenworkcn/skills",
  workbuddy: ".workbuddy/skills",
  minimax: ".minimax/skills",
};

// v2.37.1：集中文件清单——SKILL.md 的「个人记忆库」流程依赖 assets/library-template.html，
// 此前三个安装器都只装 2 个文件，导致一键安装/npx/离线包用户触发「生成记忆库」时找不到模板。
// 新增模板时只需改这一处；tests/install-contract.test.mjs 会实跑本脚本校验产物齐全。
const FILES = [
  "SKILL.md",
  "assets/plan-template.html",
  "assets/library-template.html",
];

function installTo(dir) {
  const dest = join(dir, SKILL);
  mkdirSync(join(dest, "assets"), { recursive: true });
  for (const rel of FILES) {
    cpSync(join(PKG_ROOT, rel), join(dest, rel));
  }
  return dest;
}

const argv = process.argv.slice(2);
let targets = [];

const tIdx = argv.indexOf("--target");
if (tIdx !== -1 && argv[tIdx + 1]) {
  const t = argv[tIdx + 1];
  targets = [t.startsWith(".") || t.includes(":") || resolve(t) === t ? resolve(t) : t];
  if (!existsSync(targets[0])) mkdirSync(targets[0], { recursive: true });
} else if (argv.length > 0 && !argv[0].startsWith("-")) {
  const names = argv[0].split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
  for (const n of names) {
    if (PLATFORMS[n]) {
      const dir = join(homedir(), PLATFORMS[n]);
      mkdirSync(dir, { recursive: true });
      targets.push(dir);
    } else {
      console.error(`Unknown platform alias: ${n}`);
    }
  }
} else {
  for (const [, rel] of Object.entries(PLATFORMS)) {
    const dir = join(homedir(), rel);
    if (existsSync(dir)) targets.push(dir);
  }
  if (targets.length === 0) {
    const dir = join(homedir(), PLATFORMS.claude);
    mkdirSync(dir, { recursive: true });
    targets.push(dir);
  }
}

if (targets.length === 0) {
  console.error("No valid target. Usage: npx english-memory-method [alias,alias | --target <dir>]");
  process.exit(1);
}

const dests = [];
for (const dir of targets) dests.push(installTo(dir));

console.log(`[DONE] ${SKILL} installed to ${dests.length} location(s):`);
for (const d of dests) console.log("  - " + d);
console.log("");
console.log("Trigger: paste an English article and ask for a memorization plan.");

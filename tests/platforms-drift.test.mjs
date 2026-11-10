/**
 * v2.37.1 L2 平台适配文件 drift gate
 *
 * 背景：SKILL.md 在 v2.37.0 新增「对话陪练协议」「复习调度硬规则」等 4 节并重写
 * description，但 7 份 platforms/ 适配文件（Cursor / Copilot / Gemini / Cline /
 * Aider / Qoder / Roo 项目级）完全没同步——SKILL.md 写着「L2/L3 照常可用陪练协议」，
 * 注入到这些平台的规则里却根本没有该节。ANALYSIS.md §2.2.3 早就提示过 drift 风险。
 *
 * 本 gate 把「SKILL.md 新增的方法论章节必须同步进 7 份适配文件」变成机器检查：
 * 下次再改 SKILL.md 的行为规则而漏同步，npm test 会直接失败。
 *
 * 跑：node tests/platforms-drift.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

const ADAPTERS = [
  'platforms/aider/CONVENTIONS-snippet.md',
  'platforms/cline/english-memory-method.md',
  'platforms/copilot/copilot-instructions-snippet.md',
  'platforms/cursor/english-memory-method.mdc',
  'platforms/gemini/GEMINI.md',
  'platforms/qoder/english-memory-method.md',
  'platforms/roo/english-memory-method.md',
];

// 与 SKILL.md 新章节一一对应的关键词；缺任一项即视为 drift
const REQUIRED = [
  '## 对话陪练协议',
  '## 复习调度硬规则',
  '一次一问',
  '三档诚实评分',
  '原文唯一真相源',
  'due-first',
  '不得假称能读取浏览器进度',
  '费曼三问',
  '复习优先于新学',
  '新学量上限',
  '交错',
  '遗忘',
  '诚实自评',
  '考我 / 陪我练',
];

console.log('\n== v2.37.1 L2 平台适配 drift gate ==');

ok(ADAPTERS.every(f => fs.existsSync(path.join(ROOT, f))), `7 份适配文件齐全（${ADAPTERS.length} 个平台）`);

let drift = [];
for (const f of ADAPTERS) {
  const s = read(f);
  const missing = REQUIRED.filter(k => !s.includes(k));
  if (missing.length) drift.push(`${f} 缺 [${missing.join(', ')}]`);
}
ok(drift.length === 0, `7 份适配文件都含 ${REQUIRED.length} 项方法论关键词${drift.length ? '\n      ' + drift.join('\n      ') : ''}`);

// 逐组细查，失败时能直接定位是哪一类规则漏同步
const GROUPS = [
  ['对话陪练协议 + 硬规则', ['## 对话陪练协议', '一次一问', '三档诚实评分', '原文唯一真相源', '费曼三问']],
  ['能力边界 + due-first 双档', ['due-first', '不得假称能读取浏览器进度']],
  ['复习调度 7 条', ['## 复习调度硬规则', '复习优先于新学', '新学量上限', '交错', '遗忘', '诚实自评']],
  ['触发语同步', ['考我 / 陪我练']],
];
for (const [label, keys] of GROUPS) {
  ok(ADAPTERS.every(f => keys.every(k => read(f).includes(k))), `${label}：7 份全同步`);
}

const skill = read('SKILL.md');
const readme = read('platforms/README.md');
ok(skill.includes('对话陪练协议') && readme.includes('L2/L3 **照常可用**'), 'SKILL.md 与 platforms/README.md 的 L2 能力声明一致');
ok(!/v2\.37\.0 新增/.test(readme) || readme.includes('v2.37.1'), 'platforms/README.md 已标注同步版本');

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

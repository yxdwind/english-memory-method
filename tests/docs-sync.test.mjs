/**
 * v2.30.2 双语文档一致性 gate
 *
 * readme.md ↔ readme.en.md 是"同一事实的两种表述"——seam 真实存在（10-16 曾实测
 * 3 处漂移：14-section、472×2、功能表缺 10 行），本 gate 把它变成机器检查：
 *   a. 双语功能表行数一致
 *   b. 双语测试数一致，且等于 CHANGELOG 最新条目的"总测试数"
 *   c. 双语"已知局限"里的测试数与功能表一致
 *   d. 双语版本徽章 = package.json
 *   e. 双语章节徽章一致
 *
 * 跑：node tests/docs-sync.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const zh = fs.readFileSync(path.join(ROOT, 'readme.md'), 'utf8');
const en = fs.readFileSync(path.join(ROOT, 'readme.en.md'), 'utf8');
const cl = fs.readFileSync(path.join(ROOT, 'CHANGELOG.md'), 'utf8');

console.log('\n== v2.30.2 双语文档一致性 gate ==');

// 功能表行数（✨ section 内以 "| x | **粗体** |" 开头的行）
function featureRows(text) {
  const m = text.match(/## ✨[^\n]*\n([\s\S]*?)(?:\n---)/);
  if (!m) return [];
  return m[1].split('\n').filter(l => /^\| [^|]+\| \*\*/.test(l.trim()) || /^\| [^|]+ \| \*\*/.test(l));
}
const zhRows = featureRows(zh);
const enRows = featureRows(en);
ok(zhRows.length >= 20 && enRows.length >= 20, `双语功能表都有实质行数（zh ${zhRows.length} / en ${enRows.length}）`);
ok(zhRows.length === enRows.length, `双语功能表行数一致（zh ${zhRows.length} = en ${enRows.length}）`);

// 测试数：功能表 / 已知局限 / CHANGELOG 最新条目
const zhCount = (zh.match(/(\d+) 项自动化测试/) || [])[1];
const enCount = (en.match(/(\d+) automated tests/) || [])[1];
const first = cl.indexOf('## [');
const next = cl.indexOf('## [', first + 1);
const latestEntry = cl.slice(first, next > first ? next : undefined);
const clCount = (latestEntry.match(/总测试数 \*\*(\d+)\*\*/) || [])[1];
ok(!!zhCount && !!enCount, `双语功能表都声明测试数（zh ${zhCount || '?'} / en ${enCount || '?'}）`);
ok(zhCount === enCount, `双语测试数一致（${zhCount} = ${enCount}）`);
if (clCount) ok(zhCount === clCount, `测试数 = CHANGELOG 最新条目（${zhCount} = ${clCount}）`);
else ok(false, 'CHANGELOG 最新条目缺少「总测试数 **N**」声明');
const zhLimit = (zh.match(/(\d+) 项测试覆盖/) || [])[1];
const enLimit = (en.match(/The (\d+) tests cover/) || [])[1];
ok(zhLimit === zhCount && enLimit === enCount, `已知局限测试数与功能表一致（zh ${zhLimit} / en ${enLimit}）`);

// 徽章版本
const badgeRe = /badge\/version-(\d+\.\d+\.\d+)-blue/;
const zhBadge = (zh.match(badgeRe) || [])[1];
const enBadge = (en.match(badgeRe) || [])[1];
ok(zhBadge === pkg.version && enBadge === pkg.version, `双语版本徽章 = package.json v${pkg.version}（zh ${zhBadge || '?'} / en ${enBadge || '?'}）`);

// 章节徽章一致
const secRe = /skill_sections-(\d+)-orange/;
const zhSec = (zh.match(secRe) || [])[1];
const enSec = (en.match(secRe) || [])[1];
ok(!!zhSec && zhSec === enSec, `双语章节徽章一致（${zhSec || '?'}）`);

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

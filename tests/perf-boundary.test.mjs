/**
 * v2.35.0 性能边界守护：100 句样本
 *
 * 目的：把「模板在大句数下仍然可用」变成机器门禁，而不是口头承诺。
 *   a. build-samples 幂等重建后，boundary-100-plan.html 结构完整（100 个 .sent 块）
 *   b. 文件体积上限（防模板膨胀 / 生成循环泄漏）
 *   c. 无未填充占位符残留
 *   d. jsdom 全量渲染（按序 eval 全部脚本块）：DOM 中 100 句齐全
 *   e. 渲染 + 脚本求值总耗时宽松阈值（拦 O(n²) 级病态；jsdom 非真实浏览器，只做量级守护）
 *   f. v2.42.2 结构完整性：§15 钩子链 / §17 宫殿站点真实存在，且按 SKILL.md M/base/rem
 *      公式均匀分摊 100 句；verify-plan 七条硬规则对该样本退出码 0
 *
 * 跑：node tests/perf-boundary.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from './helpers/boot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const SAMPLE = path.join(ROOT, 'tests', 'samples', 'boundary-100-plan.html');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

console.log('\n== v2.42.2 性能边界守护：100 句样本（含 §15/§17 结构完整性）==');

// 0) 幂等重建（build-samples 本身被 qa-v222 锁幂等，这里直接跑）
execFileSync(process.execPath, [path.join(ROOT, 'bin', 'build-samples.mjs')], { stdio: 'pipe' });
const html = fs.readFileSync(SAMPLE, 'utf8');

ok((html.match(/<div class="sent">/g) || []).length === 100, '样本含 100 个 .sent 块');
const sizeKB = fs.statSync(SAMPLE).size / 1024;
ok(sizeKB < 1536, '文件体积 ' + sizeKB.toFixed(0) + ' KB < 1536 KB 上限');
ok(!/\{\{(答案词|挖空后的段落原文|TITLE|SUBTITLE|对结构图的一句话导读)/.test(html), '构建职责内占位符零残留（装饰性占位符按 v2.28.2 约定保留）');

// jsdom 全量渲染：按序求值全部脚本块（与 helpers/boot.mjs evalAllScripts 同法）
const vc = new VirtualConsole();
vc.on('jsdomError', () => {});
const t0 = Date.now();
const dom = new JSDOM(html, {
  runScripts: 'outside-only',
  url: 'http://localhost/boundary-100-plan.html',
  virtualConsole: vc,
});
dom.window.Element.prototype.scrollIntoView = () => {};
dom.window.scrollTo = () => {};
const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
dom.window.eval(blocks);
await new Promise(r => setTimeout(r, 100));
const elapsed = Date.now() - t0;
const doc = dom.window.document;
ok(doc.querySelectorAll('.sent').length === 100, '渲染后 DOM 含 100 句（实际 ' + doc.querySelectorAll('.sent').length + '）');
ok(elapsed < 10000, 'jsdom 渲染 + 脚本求值 ' + elapsed + ' ms < 10000 ms');

// ── v2.42.2 结构完整性：不能只测「100 个 .sent 骨架」──────────────────
// 独立重算 SKILL.md「记忆宫殿层 · 句站对齐」公式（不复用 build-samples 实现，
// 这样公式写错或实现漂移都会被拦下）
function expectedGroups(n){
  const M = Math.min(25, n), base = Math.floor(n / M), rem = n % M;
  const groups = [];
  let cur = 1;
  for(let j = 1; j <= M; j++){
    const c = base + (j <= rem ? 1 : 0);
    groups.push(Array.from({length: c}, (_, k) => cur + k));
    cur += c;
  }
  return groups;
}
const groups = expectedGroups(100);
const gotSents = [...html.matchAll(/<div class="palace-stop" data-sents="([^"]+)"/g)].map(m => m[1]);
ok(gotSents.length === 25, `宫殿站点 25 个 = min(25,100)（实际 ${gotSents.length}）`);
ok(gotSents.join('|') === groups.map(g => g.join(',')).join('|'),
  'data-sents 按 M/base/rem 公式均匀分摊（n=100 → 25 站各 4 句）');
const flat = groups.flat();
ok(flat.length === 100 && new Set(flat).size === 100 && flat[0] === 1 && flat[99] === 100,
  '句号 1..100 恰好各被一站覆盖（无重复 / 无遗漏）');
ok((html.match(/<div class="hook-chain"/g) || []).length === 5, '钩子链 5 条（5 段各一条）');
ok((html.match(/<span class="seg">/g) || []).length === 100, '句钩 100 个 == 句数');
ok((html.match(/<span class="bridge">/g) || []).length === 95, '逻辑桥 95 个（每条链 segs−1）');
ok((html.match(/<span class="anchor">/g) || []).length === 100, '英文锚点 100 个（≥ 句钩）');
ok(!html.includes('{{HOOK_CHAINS}}') && !html.includes('{{PALACE_STOPS}}'), '§15/§17 占位符零残留');
ok(doc.querySelectorAll('.palace-stop').length === 25 && doc.querySelectorAll('.hook-chain').length === 5,
  'jsdom 渲染后宫殿站点 / 钩子链实体齐全');

// 真实跑交付硬门禁：规则 3（宫殿对齐）/ 规则 4（钩子链对齐）不再 skip
let vCode = 0, vOut = '';
try {
  vOut = execFileSync(process.execPath,
    [path.join(ROOT, 'bin', 'verify-plan.mjs'), SAMPLE, '--no-color'], { encoding: 'utf8' });
} catch (e) { vCode = e.status ?? 1; vOut = (e.stdout || '') + (e.stderr || ''); }
ok(vCode === 0, `verify-plan 对 100 句样本七条硬规则退出码 0（实际 ${vCode}）`);
const lineOf = id => (vOut.split('\n').find(l => l.includes(id)) || '');
ok(/✅/.test(lineOf('规则 3 宫殿对齐')), '规则 3 宫殿对齐为 ✅（非 skip / fail）');
ok(/✅/.test(lineOf('规则 4 钩子链对齐')), '规则 4 钩子链对齐为 ✅（非 skip / fail）');

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

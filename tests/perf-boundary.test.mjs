/**
 * v2.35.0 性能边界守护：100 句样本
 *
 * 目的：把「模板在大句数下仍然可用」变成机器门禁，而不是口头承诺。
 *   a. build-samples 幂等重建后，boundary-100-plan.html 结构完整（100 个 .sent 块）
 *   b. 文件体积上限（防模板膨胀 / 生成循环泄漏）
 *   c. 无未填充占位符残留
 *   d. jsdom 全量渲染（按序 eval 全部脚本块）：DOM 中 100 句齐全
 *   e. 渲染 + 脚本求值总耗时宽松阈值（拦 O(n²) 级病态；jsdom 非真实浏览器，只做量级守护）
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

console.log('\n== v2.35.0 性能边界守护：100 句样本 ==');

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

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

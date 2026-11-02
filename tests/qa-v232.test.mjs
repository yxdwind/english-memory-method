/**
 * v2.32.0 EMM_STORE_V232 进度存储契约收敛 · 运行时验证
 *
 * a. EMM_STORE_V232 锚点恰好 1 次；键前缀字面量 'emm-progress:' 全模板唯一（store 单点）
 * b. store 块是第 1 个脚本块（先于 main IIFE）
 * c. window.EMMProgressStore 暴露 + keyOf 契约（h1 前 40 字）
 * d. save/load/loadRaw/patch 行为
 * e. 委托链路：SR 评卡经 store.patch 落盘
 *
 * 跑：node tests/qa-v232.test.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN_TEMPLATE as template, bootCore, scriptBlocks } from './helpers/boot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

console.log('\n== v2.32.0 EMM_STORE_V232 进度存储契约收敛 ==');

// 静态
ok((template.match(/EMM_STORE_V232/g) || []).length === 1, 'EMM_STORE_V232 锚点恰好 1 次');
ok(template.split("'emm-progress:'").length - 1 === 1, "键前缀字面量 'emm-progress:' 全模板唯一（store 单点）");
const blocks = scriptBlocks(template);
const storeIdx = blocks.findIndex(b => b.indexOf('EMM_STORE_V232') >= 0);
ok(storeIdx === 0, 'store 块是第 1 个脚本块（先于 main IIFE）');

const fakeArticle = `
<header><h1>测试文章背诵方案</h1><p>议论文 · 2 句</p></header>
<h2>1. 整体策略</h2><p>策略</p>
<div class="sent"><div class="sent-en">This is a simple sentence.</div><div class="sent-zh">这是一个简单的句子。</div></div>
<div class="sent"><div class="sent-en">Memory hooks chain every idea.</div><div class="sent-zh">记忆钩子把每个想法串成链。</div></div>
<h2>11. 挖空自测</h2>
<p>This is a ______ sentence about ______ hooks.</p>
<details class="answer-toggle"><summary>▶ 查看本段答案</summary><div class="answer">答案：simple / memory</div></details>
<footer>测试页脚</footer>
`;

// 运行时：store 暴露 + keyOf 契约 + 四个原语
{
  const { w } = await bootCore({ replaceWrap: fakeArticle });
  ok(typeof w.EMMProgressStore === 'object' && typeof w.EMMProgressStore.keyOf === 'function', 'window.EMMProgressStore 已暴露');
  ok(w.EMMProgressStore.keyOf() === 'emm-progress:测试文章背诵方案', 'keyOf 契约 = h1 前 40 字');
  w.EMMProgressStore.save({ a: 1 });
  ok(w.EMMProgressStore.load().a === 1, 'save/load 往返');
  ok(w.EMMProgressStore.loadRaw('emm-progress:测试文章背诵方案') !== null, 'loadRaw 读取现存');
  w.EMMProgressStore.patch(function (p) { p.b = 2; });
  ok(w.EMMProgressStore.load().b === 2 && w.EMMProgressStore.load().a === 1, 'patch 保留其他字段');
}

// 运行时：委托链路——SR 评卡经 store.patch 落盘
{
  const { w } = await bootCore({ replaceWrap: fakeArticle });
  w.__emmDispatch('judge', 0, 'ok');
  w.__emmDispatch('endRound', 0, { 0: 'ok' });
  const saved = JSON.parse(w.localStorage.getItem('emm-progress:测试文章背诵方案') || '{}');
  ok(saved.sr && saved.sr['0'] && saved.sr['0'].interval === 1, 'SR 评卡经 store.patch 落盘（interval=1）');
  ok(w.EMMProgressStore.load().sr['0'].lastQ === 4, 'load 经 store 读回一致');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

/**
 * v2.21 EMM_TODAY_V221 「设为今天新学」按钮 · 运行时验证
 *
 * 用 jsdom 加载 plan-template.html，验证：
 *   a. 每段（除"当前"段外）有「📌 设为今天」按钮
 *   b. 点击后 state.start 改为让该段成为今天的日期
 *   c. 该段行的"今日"列更新为「📖 今天新学」
 *   d. 多段文章下"当前"段不显示该按钮（避免无意义操作）
 *
 * 跑：node tests/today-segment.test.mjs（需要 npm i --no-save jsdom@16）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let JSDOM, VirtualConsole;
try {
  const jsdom = await import('jsdom');
  JSDOM = jsdom.JSDOM;
  VirtualConsole = jsdom.VirtualConsole;
} catch (e) {
  console.error('缺少 jsdom：请先执行 npm i --no-save jsdom@16 后重跑');
  process.exit(1);
}

const HERE = path.dirname(fileURLToPath(import.meta.url));
const template = fs.readFileSync(path.join(HERE, '..', 'skills', 'english-memory-method', 'assets', 'plan-template.html'), 'utf8');

function quietConsole() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/^Not implemented/.test(e.message || '')) console.error('jsdomError:', e.message); });
  return vc;
}

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

// 两段文章：第 1 段 = 今天新学，第 2 段 = 明天
const fakeArticleTwoSeg = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4.1 第1段 · 起源</h2>
    <div class="sent"><div class="sent-en">First sentence.</div><div class="sent-zh">第一句。</div></div>
  <h2>4.2 第2段 · 发展</h2>
    <div class="sent"><div class="sent-en">Second sentence.</div><div class="sent-zh">第二句。</div></div>
`;

async function boot(opts = {}) {
  const dom = new JSDOM(template, {
    runScripts: 'outside-only',
    url: 'http://localhost/plan.html' + (opts.query || ''),
    virtualConsole: quietConsole(),
  });
  const w = dom.window;
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  w.scrollTo = () => {};
  w.speechSynthesis = { getVoices: () => [], speak: () => {}, cancel: () => {} };
  w.alert = opts.alert || (() => {});
  w.confirm = opts.confirm || (() => true);
  if (opts.preload) {
    Object.entries(opts.preload).forEach(([k, v]) => {
      try { w.localStorage.setItem(k, String(v)); } catch (e) {}
    });
  }
  const wrap = w.document.querySelector('.wrap');
  if (wrap && opts.replaceWrap) wrap.innerHTML = opts.replaceWrap;
  const scriptBlocks = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const allScripts = scriptBlocks.join('\n;\n');
  try { w.eval(allScripts); } catch (e) {
    console.error('eval error:', e.message);
    process.exit(1);
  }
  await new Promise(r => setTimeout(r, 80));
  return { w, doc: w.document };
}

function progKey(doc) {
  var h = doc.querySelector('h1');
  return 'emm-progress:' + (h ? h.textContent.trim().slice(0, 40) : (doc.title || '').slice(0, 40) || 'plan');
}

console.log('\n== v2.21 「设为今天新学」运行时验证 ==');

// 静态：模板含 setAsToday 函数与 emm-set-today 类
ok(!!template.match(/setAsToday|emm-set-today/), '模板含 setAsToday 函数 + emm-set-today 类');

// A. 两段文章：第 1 段 = 今天，第 2 段 = 明天
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleTwoSeg });
  const setBtns = doc.querySelectorAll('.emm-set-today');
  ok(setBtns.length === 1, `第 1 段为今天新学时，仅第 2 段显示"设为今天"按钮（actual ${setBtns.length}）`);
  // 当前段（第 1 段）显示 ✓ 当前
  const firstRow = doc.querySelector('.emm-rows tr');
  const span = firstRow && firstRow.querySelector('span');
  ok(span && /当前/.test(span.textContent), `当前段（第 1 段）显示"✓ 当前"标记（actual ${span && span.textContent}）`);
}

// B. 点击「第 2 段设为今天」：state.start 改到 today，第 2 段变为今天新学
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleTwoSeg });
  const before = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  const beforeStart = before.start;
  const btn = doc.querySelector('.emm-set-today');
  ok(!!btn, '存在「设为今天」按钮');
  btn.click();
  await new Promise(r => setTimeout(r, 50));
  const after = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  // 期望：start 早于今天 1 天（让 Day 2 = today）
  const today = new Date();
  const expected = new Date(today); expected.setDate(today.getDate() - 1);
  const expKey = expected.getFullYear() + '-' + String(expected.getMonth()+1).padStart(2,'0') + '-' + String(expected.getDate()).padStart(2,'0');
  ok(after.start === expKey, `state.start 改为今天前一天（actual ${after.start} vs ${expKey}）`);
  ok(after.start !== beforeStart, `state.start 发生变化（before=${beforeStart}）`);

  // 重新渲染后，第 2 段应显示「📖 今天新学」
  const rows = doc.querySelectorAll('.emm-rows tr');
  ok(rows.length === 2, `2 段文章渲染 2 行（actual ${rows.length}）`);
  const secondRow = rows[1];
  const cell = secondRow && secondRow.querySelector('td[data-l="今日"]');
  ok(cell && /今天新学/.test(cell.innerHTML), `第 2 段"今日"列变为「今天新学」（actual ${cell && cell.innerHTML.slice(0,80)}）`);

  // 反过来，第 1 段不再是今天，应该出现"设为今天"按钮
  const newSetBtns = doc.querySelectorAll('.emm-set-today');
  ok(newSetBtns.length === 1, `重渲染后 1 个"设为今天"按钮（移到了第 1 段，actual ${newSetBtns.length}）`);
}

// C. 单段文章：1 个段始终是今天（除非改 start），按钮不该出现
{
  const fakeSingle = `
    <h2>1. 整体策略</h2><p>策略</p>
    <h2>2. 文章结构图</h2><p>图</p>
    <h2>3. 今日任务</h2><p>任务</p>
    <h2>4. 原文逐句精读</h2>
      <div class="sent"><div class="sent-en">Only one sentence.</div><div class="sent-zh">唯一一句。</div></div>
  `;
  const { w, doc } = await boot({ replaceWrap: fakeSingle });
  const setBtns = doc.querySelectorAll('.emm-set-today');
  ok(setBtns.length === 0, `单段文章不显示"设为今天"按钮（actual ${setBtns.length}）`);
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);
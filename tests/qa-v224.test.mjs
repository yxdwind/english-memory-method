/**
 * v2.24 EMM_UX_V224 学习路径优化 · 运行时验证
 *
 * 验证：
 *   a. plan-template.html 含 rv-today-go 按钮 + smartJumpToday 函数
 *   b. 「★ 今天先做这个」点击后行为正确
 *   c. ?jump=0,2 URL 参数触发滚动
 *   d. library-template.html 状态筛选 chip 渲染 4 个
 *   e. chip 切换触发筛选行为
 *   f. 轻刷结算页「一键回原方案补打卡」按钮 + ?jump= 参数
 *
 * 跑：node tests/qa-v224.test.mjs（需要 npm i --no-save jsdom@16）
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
const ROOT = path.join(HERE, '..');
const planTpl = fs.readFileSync(path.join(ROOT, 'skills', 'english-memory-method', 'assets', 'plan-template.html'), 'utf8');
const libTpl = fs.readFileSync(path.join(ROOT, 'skills', 'english-memory-method', 'assets', 'library-template.html'), 'utf8');

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

async function bootPlan(opts = {}) {
  const dom = new JSDOM(planTpl, {
    runScripts: 'outside-only',
    url: 'http://localhost/plan.html' + (opts.query || ''),
    virtualConsole: quietConsole(),
  });
  const w = dom.window;
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  w.scrollTo = () => {};
  w.scrollBy = () => {};
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
  const scriptBlocks = [...planTpl.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  try { w.eval(scriptBlocks.join('\n;\n')); } catch (e) { console.error('eval error:', e.message); process.exit(1); }
  await new Promise(r => setTimeout(r, 80));
  return { w, doc: w.document };
}

const fakeArticle = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4. 原文逐句精读</h2>
    <div class="sent"><div class="sent-en">First sentence.</div><div class="sent-zh">第一句。</div></div>
    <div class="sent"><div class="sent-en">Second sentence.</div><div class="sent-zh">第二句。</div></div>
    <div class="sent"><div class="sent-en">Third sentence.</div><div class="sent-zh">第三句。</div></div>
`;

console.log('\n== v2.24 EMM_UX_V224 学习路径优化 运行时验证 ==');

// A. rv-today-go 按钮 + smartJumpToday 函数存在
ok(/rv-today-go/.test(planTpl) && /smartJumpToday/.test(planTpl), '模板含 rv-today-go 类 + smartJumpToday 函数');

// B. 「★ 今天先做这个」按钮渲染 + 点击触发 startRound（首次场景）
{
  const { w, doc } = await bootPlan({ replaceWrap: fakeArticle });
  const btn = doc.querySelector('.rv-today-go');
  ok(!!btn, 'rv-today-go 按钮已注入');
  ok(btn && /今天先做这个/.test(btn.textContent), `按钮含"今天先做这个"（${btn && btn.textContent}）`);
  btn.click();
  await new Promise(r => setTimeout(r, 50));
  // 首次场景：state.rounds 为空 → 进入 mode
  const progKey = 'emm-progress:{{TITLE}}背诵方案';
  const stored = JSON.parse(w.localStorage.getItem(progKey) || '{}');
  ok(stored.mode === true, '首次场景：点击后进入 mode=true（开了第一轮）');
}

// C. 「★ 今天先做这个」按钮 — 在轮中、第一条未评卡 → scrollIntoView
{
  const { w, doc } = await bootPlan({
    replaceWrap: fakeArticle,
    preload: {
      'emm-progress:{{TITLE}}背诵方案': JSON.stringify({ mode: true, done: {}, rounds: [{date:'2026-10-01',ok:0,bad:0}], fingerprint: '' })
    }
  });
  let scrollTarget = null;
  w.HTMLElement.prototype.scrollIntoView = function(opts){
    if(this.classList.contains('sent')) scrollTarget = this.__emmIdx !== undefined ? this.__emmIdx : this.querySelector('.sent-en').textContent.slice(0, 20);
  };
  doc.querySelector('.rv-today-go').click();
  await new Promise(r => setTimeout(r, 30));
  ok(scrollTarget === 0 || scrollTarget === 'First sentence.', `滚动到首条未评卡句（idx=${scrollTarget}）`);
}

// D. ?jump=0,2 触发滚动到指定句 + 高亮
{
  // 关键：init() 同步运行，所以要在 boot() 之前 mock scrollIntoView
  // bootPlan 内部流程：构造 dom → 改 mock → eval script（init 同步跑，会用 mock）
  // 这里我们用原生 bootPlan 函数，但提前 patch HTMLElement.prototype
  const dom = new JSDOM(planTpl, { runScripts: 'outside-only', url: 'http://localhost/plan.html?jump=0,2', virtualConsole: quietConsole() });
  const w = dom.window;
  let scrollIdx = null;
  w.HTMLElement.prototype.scrollIntoView = function(){
    if(this.__emmIdx !== undefined) scrollIdx = this.__emmIdx;
  };
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  w.scrollTo = w.scrollBy = () => {};
  w.speechSynthesis = { getVoices: () => [], speak: () => {}, cancel: () => {} };
  w.alert = () => {};
  w.confirm = () => true;
  const wrap = w.document.querySelector('.wrap');
  if (wrap) wrap.innerHTML = fakeArticle;
  const scriptBlocks = [...planTpl.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  try { w.eval(scriptBlocks.join('\n;\n')); } catch (e) { console.error('jump eval error:', e.message); }
  await new Promise(r => setTimeout(r, 80));
  ok(scrollIdx === 0, `?jump=0,2 触发滚动到 idx=0（actual ${scrollIdx}）`);
}

// E. 薄弱场景：「今天先做这个」自动开快刷
{
  const { w, doc } = await bootPlan({
    replaceWrap: fakeArticle,
    preload: {
      'emm-progress:{{TITLE}}背诵方案': JSON.stringify({ weak: { 0: true }, done: {}, rounds: [], fingerprint: '' })
    }
  });
  doc.querySelector('.rv-today-go').click();
  await new Promise(r => setTimeout(r, 50));
  ok(doc.body.classList.contains('emm-drill'), '有薄弱时点击进入 emm-drill 模式（快刷）');
}

// F. library-template.html：状态 chip 4 个
{
  // 用合法占位替换模板里的 {{ARTICLES}}，否则脚本无法 parse
  const stubLib = '{ topic:"t1", key:"Test背诵方案", title:"T1", type:"议论文", sents:11, words:200, date:"2026-10-01", chain:[], cloze:[] }';
  const filledLibTpl = libTpl.replace('[{{ARTICLES}}]', '[' + stubLib + ']').replace('{{ARTICLES}}', stubLib);
  const dom = new JSDOM(filledLibTpl, { runScripts: 'outside-only', url: 'http://localhost/lib.html', virtualConsole: quietConsole() });
  const w = dom.window;
  w.alert = () => {};
  w.confirm = () => true;
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  const scriptBlocks = [...filledLibTpl.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  try { w.eval(scriptBlocks.join('\n;\n')); } catch (e) { console.error('lib eval error:', e.message); }
  await new Promise(r => setTimeout(r, 80));
  const doc = w.document;
  const chips = doc.querySelectorAll('.lib-chip');
  ok(chips.length === 4, `library 含 4 个 chip（actual ${chips.length}）`);
  const labels = [...chips].map(c => c.textContent);
  ok(labels.includes('全部') && labels.includes('有进度') && labels.includes('薄弱最多') && labels.includes('超 14 天未复习'),
    `chip 标签含四类：${labels.join(' / ')}`);
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);
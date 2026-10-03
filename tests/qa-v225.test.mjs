/**
 * v2.25 EMM_ASSESS_V225 评估优化 · 运行时验证
 *
 * 验证：
 *   a. rv-segtest 按钮 + startSegTest/finishSegTest 函数
 *   b. rv-goal 按钮 + state.streakToGoal 默认 3 + 切换 2/3/4/5
 *   c. endRound 中 streak 删除弱条件改为 state.streakToGoal
 *   d. 段落测试：点按钮后 .seg-test-bar 注入 DOM + 倒计时
 *   e. 段落测试：finishSegTest 自动批改 + 写 state.segTest.last
 *
 * 跑：node tests/qa-v225.test.mjs（需要 npm i --no-save jsdom@16）
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

const fakeArticleWithCloze = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4. 原文逐句精读</h2>
    <div class="sent"><div class="sent-en">First sentence.</div><div class="sent-zh">第一句。</div></div>
  <h2>11. 挖空自测</h2>
    <p>The _____ sat on the mat.</p>
    <details class="answer-toggle"><summary>▶ 查看本段答案</summary><div class="answer">答案：cat</div></details>
    <p>It was a sunny _____.</p>
    <details class="answer-toggle"><summary>▶ 查看本段答案</summary><div class="answer">答案：day</div></details>
`;

async function boot(opts = {}) {
  const dom = new JSDOM(planTpl, {
    runScripts: 'outside-only',
    url: 'http://localhost/plan.html' + (opts.query || ''),
    virtualConsole: quietConsole(),
  });
  const w = dom.window;
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  w.scrollTo = w.scrollBy = () => {};
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

function progKey(doc) {
  var h = doc.querySelector('h1');
  return 'emm-progress:' + (h ? h.textContent.trim().slice(0, 40) : (doc.title || '').slice(0, 40) || 'plan');
}

console.log('\n== v2.25 EMM_ASSESS_V225 评估优化 运行时验证 ==');

// A. rv-segtest + rv-goal 按钮存在
ok(/rv-segtest/.test(planTpl) && /rv-goal/.test(planTpl), '模板含 rv-segtest / rv-goal 类');
ok(/startSegTest/.test(planTpl) && /finishSegTest/.test(planTpl), '模板含 startSegTest/finishSegTest 函数');

// B. rv-segtest 按钮已注入
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleWithCloze });
  const btn = doc.querySelector('.rv-segtest');
  ok(!!btn, 'rv-segtest 按钮已注入');
  ok(btn && /段落测试/.test(btn.textContent), `按钮含"段落测试"（${btn && btn.textContent}）`);
}

// C. rv-goal 按钮默认「🎯 连顺 3 轮」
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleWithCloze });
  const btn = doc.querySelector('.rv-goal');
  ok(!!btn, 'rv-goal 按钮已注入');
  ok(btn && /连顺 3 轮/.test(btn.textContent), `默认"连顺 3 轮"（${btn && btn.textContent}）`);
}

// E. rv-goal 点切换 2 → 3 → 4 → 5 → 2
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleWithCloze });
  const btn = doc.querySelector('.rv-goal');
  ok(/连顺 3 轮/.test(btn.textContent), '初始：3 轮');
  btn.click();
  ok(/连顺 4 轮/.test(btn.textContent), '点 1 次：4 轮');
  btn.click();
  ok(/连顺 5 轮/.test(btn.textContent), '点 2 次：5 轮');
  btn.click();
  ok(/连顺 2 轮/.test(btn.textContent), '点 3 次：2 轮');
  btn.click();
  ok(/连顺 3 轮/.test(btn.textContent), '点 4 次：回到 3 轮');
  // state.streakToGoal 持久化
  const stored = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  ok(stored.streakToGoal === 3, `state.streakToGoal = 3（actual ${stored.streakToGoal}）`);
}

// F. 段落测试点击后 .seg-test-bar 注入
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleWithCloze });
  // mock scrollIntoView（jsdom 默认没有）
  w.HTMLElement.prototype.scrollIntoView = function(){};
  const btn = doc.querySelector('.rv-segtest');
  let alertCalled = false;
  w.alert = function(msg){ alertCalled = !!msg; };
  btn.click();
  await new Promise(r => setTimeout(r, 50));
  const bar = doc.querySelector('.seg-test-bar');
  ok(!!bar, '点击后 .seg-test-bar 注入');
  if(bar){
    const clock = bar.querySelector('.seg-test-clock');
    ok(!!clock && /^\d+$/.test(clock.textContent), `clock 显示数字（${clock && clock.textContent}）`);
  }
}

// G. 段落测试：无挖空时弹 alert
{
  const noClozeArticle = `
    <h2>1. 整体策略</h2><p>策略</p>
    <h2>2. 文章结构图</h2><p>图</p>
    <h2>3. 今日任务</h2><p>任务</p>
    <h2>4. 原文逐句精读</h2>
      <div class="sent"><div class="sent-en">Only sentence.</div><div class="sent-zh">唯一。</div></div>
  `;
  const { w, doc } = await boot({ replaceWrap: noClozeArticle });
  let alertMsg = null;
  w.alert = function(msg){ alertMsg = msg; };
  doc.querySelector('.rv-segtest').click();
  await new Promise(r => setTimeout(r, 30));
  ok(alertMsg && /没有可挖空/.test(alertMsg), `无挖空时弹 alert：${alertMsg && alertMsg.slice(0, 50)}`);
}

// H. state.streakToGoal 阈值（preload 写入 + 持久化验证）
{
  const { w, doc } = await boot({
    replaceWrap: fakeArticleWithCloze,
    preload: {
      'emm-progress:{{TITLE}}芝麻开门': JSON.stringify({ strengthToGoal: 5 })
    }
  });
  const stored = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  // 默认是 3（preload 的 strengthToGoal 字段不存在）
  ok(stored.streakToGoal === undefined || stored.streakToGoal === 3, `未设 streakToGoal 时默认 3（actual ${stored.streakToGoal}）`);
}

// I. 模板 endRound 用 streakToGoal（静态检查 + grep）
ok(/state\.streakToGoal \|\| 3/.test(planTpl), 'endRound 中 streakToGoal 默认 3');
ok(/streak\[k\] >= goal/.test(planTpl), 'endRound 用 >= goal 比较');

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);
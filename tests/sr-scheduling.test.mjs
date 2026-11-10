/**
 * v2.38.0 EMM_SR_SCHED_V238 · SM-2 真正驱动调度 · 运行时验证
 *
 * 背景：v2.20 起「🧠 标准」只显示 ef/interval/due，薄弱句增删仍由轻量档
 * 「连顺 N 轮毕业」驱动，SR.due 也不进今日任务卡。ANALYSIS.md §3.2 标为未做项。
 * 本版让标准模式真正由 SR 驱动：
 *   - 评「顺」→ srNext 排期到未来 → 从 weak 毕业（不再需要连顺 N 轮）
 *   - 评「卡」→ 留在 weak
 *   - due <= today → init / endRound / 切模式时自动回炉 weak
 *   - 今日任务卡显示到期句数 + 一键快刷
 * 轻量模式行为必须逐字不变（Test F 用 streakToGoal=3 连跑 3 轮做回归护栏）。
 *
 * 跑：node tests/sr-scheduling.test.mjs（需要 npm i --no-save jsdom@16）
 */
import { PLAN_TEMPLATE as template, bootCore, dstr, progKeyOfDoc as progKey } from './helpers/boot.mjs';

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

const fakeArticle = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4. 原文逐句精读</h2>
    <div class="sent"><div class="sent-en">The cat sat on the mat.</div><div class="sent-zh">猫坐在垫子上。</div></div>
    <div class="sent"><div class="sent-en">It was a sunny day.</div><div class="sent-zh">这是晴天。</div></div>
    <div class="sent"><div class="sent-en">Birds fly in the sky.</div><div class="sent-zh">鸟儿在天空中飞翔。</div></div>
`;

const KEY = 'emm-progress:{{TITLE}}背诵方案';
const TODAY = dstr(0);
const PAST = dstr(-3);
const FUTURE = dstr(30);

function stateOf(w, doc) { return JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}'); }
function boot(prog) {
  return bootCore({
    replaceWrap: fakeArticle,
    preload: { [KEY]: JSON.stringify(prog) },
  });
}
async function round(doc, v) {
  doc.querySelector('.rv-round').click();
  await new Promise(r => setTimeout(r, 25));
  doc.querySelectorAll('.rv-judge [data-v=' + v + ']')[0].click();
  await new Promise(r => setTimeout(r, 25));
  doc.querySelector('.rv-round').click();
  await new Promise(r => setTimeout(r, 50));
}
const srEntry = due => ({ ef: 2.5, interval: 1, reps: 1, due, lastQ: 4, aligned: 'sm2' });
const base = { done: {}, streak: {}, weak: {}, rounds: [], sr: {}, srMode: 'standard', streakToGoal: 3 };

console.log('\n== v2.38.0 SM-2 真正驱动调度 运行时验证 ==');

// A. 静态：锚点 + 纯函数 + 今日卡入口
ok(/EMM_SR_SCHED_V238/.test(template), 'EMM_SR_SCHED_V238 锚点存在');
ok((template.match(/EMM_SR_SCHED_V238/g) || []).length === 1, '锚点恰好 1 次（version-check 门禁）');
ok(/window\.EMMSR = \{ dueKeys: dueKeys/.test(template), 'SR 模块暴露 dueKeys 纯函数');

// B. dueKeys 纯函数边界
{
  const { w } = await boot(base);
  const fn = w.EMMSR && w.EMMSR.dueKeys;
  ok(typeof fn === 'function', 'window.EMMSR.dueKeys 可用');
  if (fn) {
    const got = fn({ 0: { due: PAST }, 1: { due: FUTURE }, 2: {}, 3: { due: TODAY } }, TODAY);
    ok(got.length === 2 && got.includes('0') && got.includes('3'),
      `dueKeys 只收 due<=today 且非空（actual ${JSON.stringify(got)}）`);
    ok(fn(null, TODAY).length === 0 && fn({}, '').length === 0, 'dueKeys 空输入安全');
  }
}

// C. 标准模式 init：到期句自动回炉 weak + 下游联动
{
  const { w, doc } = await boot({
    ...base,
    sr: { 0: srEntry(PAST), 1: srEntry(FUTURE) },
  });
  const st = stateOf(w, doc);
  ok(st.weak && st.weak[0] === true, 'init：due 已过期的第 1 句自动进 weak');
  ok(!(st.weak && st.weak[1]), 'init：due 在未来的第 2 句不进 weak');
  ok(doc.querySelectorAll('.sent.rv-weakline').length === 1, '下游：rv-weakline 标红 1 句（快刷/宫殿共用）');
  const ord = doc.querySelector('.emm-order');
  ok(!!ord && /SM-2 今日到期 <b>1<\/b> 句/.test(ord.innerHTML), '今日任务卡显示 SM-2 到期 1 句');
  ok(!!doc.querySelector('.emm-due-drill'), '今日卡提供「⚡ 开始快刷」入口');
  ok(doc.querySelector('.rv-goal').disabled === true, '标准模式「🎯 连顺 N 轮」按钮禁用（阈值不生效）');
  ok(doc.querySelector('.rv-dash').innerHTML.includes('SM-2 到期自动回炉'), '仪表盘文案标注由 SM-2 驱动');
}

// D. 点今日卡到期入口 → 进入快刷
{
  const { w, doc } = await boot({ ...base, sr: { 0: srEntry(PAST) } });
  w.HTMLElement.prototype.scrollIntoView = function () {};
  doc.querySelector('.emm-due-drill').click();
  ok(doc.body.classList.contains('emm-drill'), '点到期入口进入快刷模式');
  ok(doc.querySelector('.rv-drill').textContent.includes('薄弱 1'), '快刷按钮显示薄弱 1 句');
}

// E. 标准模式：评「顺」一次即毕业，不受 streakToGoal=5 影响
{
  const { w, doc } = await boot({
    ...base, streakToGoal: 5, weak: { 0: true }, streak: { 0: 0 },
  });
  await round(doc, 'ok');
  const st = stateOf(w, doc);
  ok(!(st.weak && st.weak[0]), '标准模式：1 次「顺」即从 weak 毕业（streakToGoal=5 不生效）');
  ok(st.sr && st.sr[0] && st.sr[0].reps === 1 && st.sr[0].due > TODAY,
    '毕业依据 = srNext 排期到未来（reps=1, due>today）');
}

// F. 标准模式：评「卡」留在 weak
{
  const { w, doc } = await boot({ ...base });
  await round(doc, 'bad');
  const st = stateOf(w, doc);
  ok(st.weak && st.weak[0] === true, '标准模式：评「卡」留在 weak');
  ok(st.sr && st.sr[0] && st.sr[0].reps === 0 && st.sr[0].interval === 1,
    'SM-2 对 q=2 重置 reps=0 / interval=1d');
}

// G. 轻量模式回归护栏：streakToGoal=3 必须连顺 3 轮才毕业（行为逐字不变）
{
  const { w, doc } = await boot({
    ...base, srMode: 'light', streakToGoal: 3, weak: { 0: true }, streak: { 0: 0 },
  });
  ok(doc.querySelector('.rv-dash').innerHTML.includes('连顺 2 轮自动毕业'), '轻量模式仪表盘文案不变（有薄弱句时）');
  await round(doc, 'ok');
  let st = stateOf(w, doc);
  ok(st.weak && st.weak[0] === true && st.streak[0] === 1, '轻量第 1 轮：仍在 weak，streak=1');
  await round(doc, 'ok');
  st = stateOf(w, doc);
  ok(st.weak && st.weak[0] === true && st.streak[0] === 2, '轻量第 2 轮：仍在 weak，streak=2');
  await round(doc, 'ok');
  st = stateOf(w, doc);
  ok(!(st.weak && st.weak[0]), '轻量第 3 轮：达到阈值才毕业');
  ok(doc.querySelector('.rv-goal').disabled === false, '轻量模式「🎯 连顺 N 轮」按钮可用');
  ok(doc.querySelector('.rv-dash').innerHTML.includes('暂无薄弱句'), '轻量模式毕业后仪表盘显示「暂无薄弱句」');
}

// H. 模式切换即时同步到期句
{
  const { w, doc } = await boot({
    ...base, srMode: 'light', sr: { 0: srEntry(PAST) }, weak: {},
  });
  ok(!stateOf(w, doc).weak || !stateOf(w, doc).weak[0], '轻量模式不自动回炉到期句');
  doc.querySelector('.rv-srmode').click();
  await new Promise(r => setTimeout(r, 40));
  ok(stateOf(w, doc).weak && stateOf(w, doc).weak[0] === true, '切到标准模式：到期句立即回炉（无需刷新/打卡）');
}

// I. 无到期句时不虚报
{
  const { doc } = await boot({ ...base, sr: { 0: srEntry(FUTURE) } });
  ok(!doc.querySelector('.emm-due-drill'), '无到期句时不显示快刷入口');
  ok(doc.querySelectorAll('.sent.rv-weakline').length === 0, '无到期句时不注入薄弱标红');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

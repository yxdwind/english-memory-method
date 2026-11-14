/**
 * v2.37.0 FSRS-5 调度（EMM_FSRS_V237）· 运行时验证
 *
 * a. 锚点唯一；01b-fsrs 是第 2 个脚本块（先于 main）；工具栏有 🧮 切换按钮
 * b. 数学核心黄金值：与 ts-fsrs v6.0.0 models/fsrs-5 输出 ±1e-6 一致（7 组场景，
 *    含 fresh/same-day/遗忘链/连续 Good/Hard/Easy——开发时用真 ts-fsrs 计算后固化）
 * c. fsrsNext 集成：FSRS 模式下 endRound 产出 {d, s, reps, due, lastDate}，srAlgo 落盘
 * d. switchAlgo 双向转换（含真实 SM-2 历史）+ 空壳（仅 lastQ）清理
 * e. dueKeys 对 FSRS 条目照常工作（due 字段同形）
 *
 * 跑：node tests/qa-v239.test.mjs
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
function near(a, b, label, tol = 1e-6) {
  ok(Math.abs(a - b) <= tol, label + '（实际 ' + a + '，期望 ' + b + '）');
}

console.log('\n== v2.39.0 FSRS-5 调度（EMM_FSRS_V239）==');

// 静态
ok((template.match(/EMM_FSRS_V239/g) || []).length === 1, 'EMM_FSRS_V239 锚点恰好 1 次');
const blocks = scriptBlocks(template);
const fsrsIdx = blocks.findIndex(b => b.indexOf('EMM_FSRS_V239') >= 0);
const storeIdx = blocks.findIndex(b => b.indexOf('EMM_STORE_V232') >= 0);
ok(fsrsIdx === 1, '01b-fsrs 是第 2 个脚本块（store 之后、main 之前）');
ok(storeIdx === 0 && blocks.length === 8, '共 8 个脚本块，store 仍为第 1');
ok(template.indexOf('rv-algo') >= 0, '工具栏含 🧮 调度切换按钮');

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

// b. 数学核心黄金值（来源：ts-fsrs v6.0.0 models/fsrs-5 实测输出）
{
  const { w } = await bootCore({ replaceWrap: fakeArticle });
  const F = w.EMMFSRS;
  ok(typeof F === 'object' && typeof F.next === 'function', 'window.EMMFSRS 已暴露');

  // A. fresh Good
  const a = F.initState(3);
  near(a.d, 5.28243442, 'A. fresh Good D₀(3)');
  near(a.s, 3.173, 'A. fresh Good S₀(3)=w2');
  ok(F.interval(a.s, 0.9) === 3, 'A. interval(S=3.173, r=0.9) = 3');

  // B. +3d Again（遗忘分支）
  const b = F.next(a, 1, 3);
  near(b.d, 6.79693258, 'B. Again 后 D');
  near(b.s, 1.05556109, 'B. Again 后 S（遗忘公式）');
  ok(F.interval(b.s, 0.9) === 1, 'B. Again 后 interval = 1');

  // C. 同日 Good（short-term 分支）
  const c = F.next(a, 3, 0);
  near(c.d, 5.27296793, 'C. 同日 Good D');
  near(c.s, 4.46685806, 'C. 同日 Good S（w17/w18）');
  ok(F.interval(c.s, 0.9) === 4, 'C. 同日 Good 后 interval = 4');

  // D. 连续 Good 链（0/1/3/7 天）
  const d1 = F.next(null, 3, 0);
  const d2 = F.next(d1, 3, 1);
  const d3 = F.next(d2, 3, 3);
  const d4 = F.next(d3, 3, 7);
  near(d2.s, 5.86914185, 'D2. +1d Good S');
  near(d3.s, 13.23882529, 'D3. +3d Good S');
  near(d4.s, 28.84179582, 'D4. +7d Good S');
  ok(F.interval(d2.s, 0.9) === 6 && F.interval(d3.s, 0.9) === 13 && F.interval(d4.s, 0.9) === 29,
     'D. Good 链 interval 3→6→13→29');

  // E. fresh Again
  const e = F.initState(1);
  near(e.d, 7.1949, 'E. fresh Again D₀(1)=w4');
  near(e.s, 0.40255, 'E. fresh Again S₀(1)=w0');
  ok(F.interval(e.s, 0.9) === 1, 'E. fresh Again interval = 1');

  // F/G. Hard 惩罚 / Easy 奖励（A 状态 +3d）
  const f = F.next(a, 2, 3);
  near(f.d, 6.03495025, 'F. Hard 后 D');
  near(f.s, 4.92451185, 'F. Hard 后 S（w15 惩罚）');
  const g = F.next(a, 4, 3);
  near(g.d, 4.51098561, 'G. Easy 后 D');
  near(g.s, 25.79360533, 'G. Easy 后 S（w16 奖励）');

  // 遗忘曲线边界：R(S,S) = 0.9
  near(F.forgettingCurve(3.173, 3.173), 0.9, 'R(S,S) = 0.9（FACTOR 设计约束）');
}

// c/d/e. 集成：FSRS 模式 endRound + 双向切换 + 空壳清理 + dueKeys
{
  const { w } = await bootCore({ replaceWrap: fakeArticle });

  // FSRS 模式下 endRound：fresh Good
  w.EMMSR.switchAlgo('fsrs');
  ok(w.EMMProgressStore.load().srAlgo === 'fsrs', 'switchAlgo 后 srAlgo=fsrs 落盘');
  w.__emmDispatch('judge', 0, 'ok');
  w.__emmDispatch('endRound', 0, { 0: 'ok' });
  const sr0 = w.EMMProgressStore.load().sr[0];
  near(sr0.s, 3.173, '集成：FSRS 模式首次「顺」S=w2');
  near(sr0.d, 5.28243442, '集成：首次「顺」D₀(3)');
  ok(sr0.reps === 1 && !!sr0.due && !!sr0.lastDate, '集成：reps/due/lastDate 齐备');

  // 双向转换：真实 SM-2 历史
  w.EMMProgressStore.patch(function (p) {
    p.sr[1] = { ef: 2.2, interval: 6, reps: 2, due: '2026-11-05', lastQ: 4 };
  });
  w.EMMSR.switchAlgo('sm2');
  ok(w.EMMProgressStore.load().srAlgo === 'sm2', '切回 sm2 落盘');
  const back0 = w.EMMProgressStore.load().sr[0];
  ok(back0.ef !== undefined && back0.d === undefined, 'FSRS→SM-2：d/s 换回 ef/interval（sr[0]）');
  near(back0.ef, 1.42939139, 'FSRS→SM-2：sr[0] ef = 2.5 − (5.28243442−1)×0.25');
  ok(back0.interval === 3, 'FSRS→SM-2：sr[0] interval = round(3.173) = 3');
  const back1 = w.EMMProgressStore.load().sr[1];
  near(back1.ef, 2.2, 'FSRS→SM-2：已是 SM-2 形态的 sr[1] 不被改动');

  // SM-2 → FSRS：真实历史映射
  w.EMMProgressStore.patch(function (p) {
    p.sr[1] = { ef: 2.2, interval: 6, reps: 2, due: '2026-11-05', lastQ: 4 };
  });
  w.EMMSR.switchAlgo('fsrs');
  const conv = w.EMMProgressStore.load().sr[1];
  near(conv.d, 2.2, 'SM-2→FSRS：d = 1 + (2.5−ef)×4');
  near(conv.s, 6, 'SM-2→FSRS：s = max(interval, 0.4)');
  ok(conv.reps === 2 && conv.due === '2026-11-05', 'SM-2→FSRS：reps/due 保留');

  // 空壳清理：仅 lastQ 的 judge 种子
  w.EMMProgressStore.patch(function (p) {
    p.sr[3] = { ef: 2.5, interval: 0, reps: 0, due: '', lastQ: 4 };
  });
  w.EMMSR.switchAlgo('sm2'); // no-op（已是 sm2 形态？sr[3] 有 ef → 保持）
  w.EMMSR.switchAlgo('fsrs'); // 再转 fsrs：空壳规则命中（reps 0 且 interval 0）
  ok(!w.EMMProgressStore.load().sr[3].ef, '空壳（仅 lastQ）在切换时被清空');

  // dueKeys 对 FSRS 条目照常工作
  w.EMMProgressStore.patch(function (p) {
    p.sr[2] = { d: 5, s: 3, reps: 1, due: '2020-01-01', lastQ: 3, lastDate: '2020-01-01' };
  });
  const due = w.EMMSR.dueKeys(w.EMMProgressStore.load().sr, '2026-11-10');
  ok(due.indexOf('2') >= 0, 'dueKeys 对 FSRS 条目照常工作（due 同形）');
}

// 按钮存在性（jsdom 不跑 confirm 交互，switchAlgo 已直测）
{
  const { doc } = await bootCore({ replaceWrap: fakeArticle });
  const btn = doc.querySelector('.rv-algo');
  ok(!!btn && btn.textContent.indexOf('SM-2') >= 0, '工具栏 🧮 按钮渲染且默认 SM-2');
}

// v2.42.1 回归护栏：switchAlgo 后任意 main save(state)（如阶梯点击）不得抹掉 srAlgo
// （真机演示抓到：02-sr patch 写入的 srAlgo 被 main 全量 save 覆盖丢失）
{
  const { w, doc } = await bootCore({ replaceWrap: fakeArticle });
  w.EMMSR.switchAlgo('fsrs');
  const lv1 = doc.querySelector('.emm-lv[data-seg="0"][data-lv="1"]');
  if (lv1) lv1.click(); // 触发 main 的 save(state)
  ok(w.EMMProgressStore.load().srAlgo === 'fsrs', '回归：main save 后 srAlgo=fsrs 幸存（__emmAlgoSync 钩子）');
  ok(w.EMMProgressStore.load().ladder && w.EMMProgressStore.load().ladder['0'], '同一次 save 正常携带 ladder（两写互不覆盖）');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

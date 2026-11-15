/**
 * v2.44.0 生成效应联动 · 留白 ↔ 阶梯升级 · 运行时验证
 *
 * ANALYSIS.md §2.1.3 早就点名「用户不改留白怎么办？没强提醒」，v2.22 只做了
 * L1→L2 的阶梯锁定，没和留白联动。本版在升到 L2+ 时给一次强提醒：
 *   取消 → 不升级，滚动并聚焦到该段的「一句话主线」输入框
 *   确定 → 放行（逃生口，避免把不愿填的用户锁死）
 * 只打扰「升级到 L2+」这一种情况：L1 起步 / 降级 / 点当前级别 / 已填留白都不弹。
 *
 * 用 confirm 而非硬阻断还有一个工程收益：bootCore 的 confirm 默认返回 true，
 * 存量 8 处阶梯点击用例零回归；真实浏览器里用户才看到这个选择。
 *
 * 跑：node tests/wb-gate.test.mjs（需要 npm i --no-save jsdom@16）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN_TEMPLATE as template, bootCore, progKeyOfDoc as progKey } from './helpers/boot.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY = 'emm-progress:{{TITLE}}背诵方案';

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
`;

function boot(opts = {}) {
  let confirmCalls = 0;
  const answer = opts.answer === undefined ? true : opts.answer;
  const envP = bootCore({
    replaceWrap: fakeArticle,
    confirm: () => { confirmCalls++; return answer; },
    preload: opts.preload || {},
  });
  return envP.then(env => ({ ...env, confirmCalls: () => confirmCalls }));
}
const lvBtn = (doc, lv) => doc.querySelector('.emm-lv[data-seg="0"][data-lv="' + lv + '"]');
const ladder = (w, doc) => (JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}').ladder || {})['0'];

console.log('\n== v2.44.0 留白 ↔ 阶梯升级联动 运行时验证 ==');

// 静态
ok(/function wbMainFilled/.test(template) && /function focusWbInput/.test(template),
  '模板含留白判定与聚焦辅助函数');
ok(/Slamecka & Graf 1978/.test(template), '提醒文案带生成效应一手出处');

// A. 取消 → 不升级 + 聚焦留白
{
  const { w, doc, confirmCalls } = await boot({ answer: false });
  w.HTMLElement.prototype.scrollIntoView = function () {};
  lvBtn(doc, 1).click();            // v2.22 渐进引导：先 L1 解锁 L2+
  lvBtn(doc, 2).click();
  ok(confirmCalls() === 1, `未填留白升 L2 触发 1 次强提醒（${confirmCalls()}）`);
  ok(ladder(w, doc) && ladder(w, doc).lv === 1, '取消后阶梯仍停在 L1（未升到 L2）');
  const ed = doc.querySelector('.wb-input[data-k="m0"]');
  ok(!!ed && ed.style.backgroundColor !== '', '取消后高亮并聚焦到该段一句话主线输入框');
  ok(doc.activeElement === ed, '焦点确实落在留白输入框');
}

// B. 确定 → 放行（逃生口，也是存量用例走的路径）
{
  const { w, doc, confirmCalls } = await boot({ answer: true });
  lvBtn(doc, 1).click();
  lvBtn(doc, 2).click();
  ok(confirmCalls() === 1, '确定路径也弹一次提醒');
  ok(ladder(w, doc) && ladder(w, doc).lv === 2, '确定后正常升到 L2');
}

// C. 已填留白 → 完全不打扰
{
  const preload = {};
  preload[KEY] = JSON.stringify({ wb: { main: { '0': '先有国家，再谈平等' }, pal: {} } });
  const { w, doc, confirmCalls } = await boot({ preload });
  lvBtn(doc, 1).click();
  lvBtn(doc, 3).click();
  ok(confirmCalls() === 0, '留白已填时不弹提醒');
  ok(ladder(w, doc) && ladder(w, doc).lv === 3, '直接升到 L3');
}

// D. L1 起步不打扰（v2.22 渐进引导路径保持原样）
{
  const { w, doc, confirmCalls } = await boot({ answer: false });
  lvBtn(doc, 1).click();
  ok(confirmCalls() === 0, '点 L1 起步不弹留白提醒');
  ok(ladder(w, doc) && ladder(w, doc).lv === 1, 'L1 正常落档');
}

// E. 降级 / 点当前级别不打扰（分开测，避免降级后再升回被误判为升级）
{
  const mk = () => {
    const preload = {};
    preload[KEY] = JSON.stringify({ ladder: { '0': { lv: 3, date: '2026-11-14' } } });
    return boot({ preload, answer: false });
  };
  {
    const { w, doc, confirmCalls } = await mk();
    const b = lvBtn(doc, 2); if (b) b.click();
    ok(confirmCalls() === 0, '降级（L3 → L2）不弹留白提醒');
    ok(ladder(w, doc) && ladder(w, doc).lv === 2, '降级正常落档');
  }
  {
    const { doc, confirmCalls } = await mk();
    const b = lvBtn(doc, 3); if (b) b.click();
    ok(confirmCalls() === 0, '点当前级别（L3 → L3）不弹留白提醒');
  }
}

// F. 现场填写留白后立即生效
{
  const { w, doc, confirmCalls } = await boot({ answer: false });
  lvBtn(doc, 1).click();
  const ed = doc.querySelector('.wb-input[data-k="m0"]');
  ed.textContent = '亲手写的临时主线';
  ed.dispatchEvent(new w.Event('input', { bubbles: true }));
  await new Promise(r => setTimeout(r, 30));
  const b3 = lvBtn(doc, 3);
  if (b3) b3.click();
  ok(confirmCalls() === 0, '现场填写后不再触发提醒（读的是实时 state.wb）');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

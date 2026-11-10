/**
 * v2.40.0 段级费曼追问模式（Feynman teach-back）· 运行时验证
 *
 * a. 静态：模板含 rv-feynman 按钮
 * b. 资格门：无 lv≥4 段 → alert 引导、不出面板
 * c. 会话流（预置两段 lv=4）：面板推进（段 0 → 段 1 → 小结）；
 *    「过了」记录 {tries, passes, last}；「卡住了」揭示句 chips → 点选入薄弱（state.weak）
 * d. 持久化：feynman 记录经 save(state) 落盘
 *
 * 跑：node tests/qa-v240.test.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN_TEMPLATE as template, bootCore } from './helpers/boot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

console.log('\n== v2.40.0 段级费曼追问模式 ==');

// a. 静态
ok(template.indexOf('rv-feynman') >= 0, '模板含 🎤 Feynman 按钮');
ok(template.indexOf('feynman-panel') >= 0, '模板含费曼面板逻辑');

// 双段 fakeArticle：4.1 / 4.2 各 2 句
const fakeArticle = `
<header><h1>测试文章背诵方案</h1><p>议论文 · 4 句</p></header>
<h2>1. 整体策略</h2><p>策略</p>
<h2>4.1 段一：现状</h2>
<div class="sent"><div class="sent-en">Artificial intelligence is changing classrooms.</div><div class="sent-zh">人工智能正在改变课堂。</div></div>
<div class="sent"><div class="sent-en">Students learn at their own pace now.</div><div class="sent-zh">学生现在按自己的节奏学习。</div></div>
<h2>4.2 段二：展望</h2>
<div class="sent"><div class="sent-en">Teachers remain irreplaceable guides.</div><div class="sent-zh">教师仍是不可替代的引导者。</div></div>
<div class="sent"><div class="sent-en">The future belongs to wise tool use.</div><div class="sent-zh">未来属于明智的工具使用。</div></div>
<h2>11. 挖空自测</h2><p>______ is changing ______.</p>
<footer>测试页脚</footer>
`;
const PROGRESS_KEY = 'emm-progress:测试文章背诵方案';
const seededProgress = JSON.stringify({
  start: '2026-11-01', done: {}, weak: {}, streak: {}, log: {}, quiz: 0,
  ladder: { 0: { lv: 4, date: '2026-11-10' }, 1: { lv: 4, date: '2026-11-10' } },
});

// b. 资格门：无 lv≥4 段
{
  const { w, doc, alerts } = await bootCore({ replaceWrap: fakeArticle });
  doc.querySelector('.rv-feynman').click();
  ok(!doc.querySelector('.feynman-panel'), '无资格时不出面板');
  ok(alerts.length >= 1 && alerts[0].indexOf('L4') >= 0, 'alert 引导先打 L4（实际：' + (alerts[0] || '').slice(0, 30) + '…）');
}

// c/d. 会话流
{
  const { w, doc } = await bootCore({
    replaceWrap: fakeArticle,
    preload: { [PROGRESS_KEY]: seededProgress },
  });
  // 两段都点到 L5（真实阶梯按钮，渐进解锁）
  for (let seg = 0; seg < 2; seg++) {
    for (let lv = 1; lv <= 5; lv++) {
      const btn = doc.querySelector('.emm-lv[data-seg="' + seg + '"][data-lv="' + lv + '"]');
      if (btn && !btn.disabled) btn.click();
    }
  }
  ok(w.EMMProgressStore.load().ladder[0].lv === 5 && w.EMMProgressStore.load().ladder[1].lv === 5, '阶梯按钮真实点到 L5×2');

  // 面板出现，当前为段 0
  doc.querySelector('.rv-feynman').click();
  const panel = doc.querySelector('.feynman-panel');
  ok(!!panel && panel.textContent.indexOf('段一') >= 0, '面板出现且从段 0 开始（段一）');
  ok(panel.textContent.indexOf('逻辑桥') >= 0, '三连追问模板渲染');

  // 段 0「过了」→ 推进到段 1 + 记录
  panel.querySelector('.feynman-pass').click();
  let prog = w.EMMProgressStore.load();
  ok(prog.feynman && prog.feynman[0] && prog.feynman[0].passes === 1 && prog.feynman[0].tries === 1,
     '「过了」记录 {tries:1, passes:1}');
  ok(panel.textContent.indexOf('段二') >= 0, '推进到段 1（段二）');

  // 段 1「卡住了」→ chips 揭示 → 点选句 3 → 入薄弱
  panel.querySelector('.feynman-stuck').click();
  const chips = panel.querySelectorAll('.feynman-chip');
  ok(chips.length === 2, '卡住时揭示该段 2 句 chips');
  chips[1].click();
  ok(chips[1].classList.contains('feynman-chip-on'), 'chip 点选高亮');
  panel.querySelector('.feynman-enroll').click();
  prog = w.EMMProgressStore.load();
  ok(prog.weak[3] === true, '点名的句 3 入薄弱（state.weak[3]=true）');
  ok(!prog.weak[2], '未点名的句 2 不入薄弱');
  ok(prog.feynman[1] && prog.feynman[1].tries === 1, '段 1 记录 {tries:1}');

  // 小结
  ok(panel.textContent.indexOf('Feynman 小结') >= 0 && panel.textContent.indexOf('新入薄弱') >= 0,
     '全部段走完出小结');
  ok(panel.textContent.indexOf('过了 <b>1</b>') >= 0 || /过了.*1/.test(panel.textContent), '小结含过了 1 段');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

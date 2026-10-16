/**
 * v2.30.0 EMM_SPEECH_V230 / EMM_TODAYALL_V230 / EMM_VOCAB_V230 教学纵深三件套 · 运行时验证
 *
 * 用 jsdom 加载 plan-template.html + library-template.html，验证：
 *   a. 发音自动评分：影子跟读面板「🤖 自动评分」按钮——mock SpeechRecognition 转写 →
 *      LCS 对齐自动填 ✓/✗ 标注（可手动修正后保存）；错词 ≥25% 入薄弱清单；
 *      不支持语音识别时 alert 降级；空转写/无匹配转写有守卫
 *   b. 能力横幅：有 SR 时不弹；无 SR 时横幅列「自动评分」替代做法
 *   c. 记忆库「今日全局」排期条：跨篇到期/新学聚合、预估时长、撞车建议、空态
 *   d. 生词本：薄弱句锚词提取候选 → 逐词入本（emm-vocab:v1）→ SM-2 调度 → 毕业/移除
 *
 * 跑：node tests/qa-v230.test.mjs（需要 npm i --no-save jsdom@16）
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
const planTemplate = fs.readFileSync(path.join(HERE, '..', 'assets', 'plan-template.html'), 'utf8');
const libTemplate = fs.readFileSync(path.join(HERE, '..', 'assets', 'library-template.html'), 'utf8');

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

function dstr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

// ── 可控的 SpeechRecognition mock ──
class FakeSR {
  constructor() {
    FakeSR.instances.push(this);
    this.lang = ''; this.interimResults = false; this.maxAlternatives = 1;
    this.onresult = null; this.onerror = null; this.onend = null;
  }
  start() { FakeSR.started++; }
  stop() { FakeSR.stopped++; if (this.onend) this.onend(); }
  abort() { this.stop(); }
}
FakeSR.instances = []; FakeSR.started = 0; FakeSR.stopped = 0;
function resetSR() { FakeSR.instances = []; FakeSR.started = 0; FakeSR.stopped = 0; }

// ── plan boot（同 qa-v229 模式）──
const fakeArticle = `
<header><h1>测试文章背诵方案</h1><p>议论文 · 2 句</p></header>
<h2>1. 整体策略</h2><p>策略</p>
<h2>2. 文章结构图</h2><p>图</p>
<h2>3. 今日任务</h2><p>任务</p>
<h2>4. 关键词串联表</h2><p>表</p>
<div class="sent"><div class="sent-en">This is a simple sentence.</div><div class="sent-zh">这是一个简单的句子。</div></div>
<div class="sent"><div class="sent-en">Memory hooks chain every idea.</div><div class="sent-zh">记忆钩子把每个想法串成链。</div></div>
<h2>11. 挖空自测</h2>
<p>This is a ______ sentence about ______ hooks.</p>
<details class="answer-toggle"><summary>▶ 查看本段答案</summary><div class="answer">答案：simple / memory</div></details>
<h2>15. 记忆钩子（跨段总链）</h2>
<div class="hook-chain"><span class="seg">段钩</span><span class="bridge">⇒</span><span class="seg">句钩</span><span class="anchor">[anchor]</span></div>
<h2>17. 记忆宫殿映射</h2>
<div class="card"><div class="palace-route">
  <div class="palace-stop"><span class="st-no">1</span><div class="st-name">站1·家门</div><div class="st-hook">钩子A</div></div>
  <div class="palace-stop"><span class="st-no">2</span><div class="st-name">站2·鞋柜</div><div class="st-hook">钩子B</div></div>
</div></div>
<footer>测试页脚</footer>
`;

async function bootPlan(opts = {}) {
  const dom = new JSDOM(planTemplate, {
    runScripts: 'outside-only',
    url: 'http://localhost/plan.html',
    virtualConsole: quietConsole(),
  });
  const w = dom.window;
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  w.scrollTo = () => {};
  w.speechSynthesis = { getVoices: () => [], speak: () => {}, cancel: () => {} };
  if (opts.fullCaps) {
    w.MediaRecorder = function MediaRecorder() {};
    try {
      Object.defineProperty(w.navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.resolve({}) }, configurable: true });
    } catch (e) {}
  }
  if (opts.withSR || opts.fullCaps) w.SpeechRecognition = FakeSR;
  const alerts = []; w.alert = (m) => alerts.push(String(m)); w.confirm = () => true;
  const wrap = w.document.querySelector('.wrap');
  if (wrap) wrap.innerHTML = fakeArticle;
  const scriptBlocks = [...planTemplate.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  try { w.eval(scriptBlocks.join('\n;\n')); } catch (e) { console.error('eval error:', e.message); process.exit(1); }
  await new Promise(r => setTimeout(r, 80));
  return { w, doc: w.document, alerts };
}

// ── library boot（同 smoke 模式）──
const libA = {
  topic: 'success', file: 'success-memorization-plan.html', key: 'Success背诵方案',
  title: 'Success', type: '议论文', sents: 3, words: 120, days: 16, date: '2026-10-01',
  chain: [
    { para: '起点钩', steps: [
      { h: '钩A', b: '⇒', a: 'test sentence', sidx: 1, en: 'Test sentence number 1 the words.' },
      { h: '钩B', b: '→', a: 'number two', sidx: 2, en: 'Test sentence number 2 the words.' },
    ] },
    { para: '收束钩', steps: [
      { h: '钩C', b: '', a: 'number three', sidx: 3, en: 'Test sentence number 3 the words.' },
    ] },
  ],
  cloze: [ { q: 'Test sentence ______ number 1 the words.', a: ['words'] } ],
};
const libB = {
  topic: 'dream', file: 'dream-memorization-plan.html', key: 'Dream背诵方案',
  title: 'Dream', type: '长文', sents: 2, words: 80, days: 17, date: '2026-09-20',
  chain: [ { para: '段钩D', steps: [
    { h: '钩D', b: '', a: 'anchor d', sidx: 1, en: 'Dream sentence one here.' },
    { h: '钩E', b: '', a: 'anchor e', sidx: 2, en: 'Dream sentence two here.' },
  ] } ],
  cloze: [ { q: 'Dream one ______ and ______ here.', a: ['onlyone'] } ],
};

async function bootLib(articles, opts = {}) {
  const html = fillLib(articles);
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'http://localhost/memory-library.html',
    virtualConsole: quietConsole(),
  });
  const w = dom.window;
  w.Element.prototype.scrollIntoView = () => {};
  w.scrollTo = () => {};
  if (opts.seed) {
    Object.entries(opts.seed).forEach(([k, v]) => {
      w.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    });
  }
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
  w.eval(js);
  await new Promise(r => setTimeout(r, 80));
  return { w, doc: w.document };
}
function fillLib(articles) {
  return libTemplate
    .replace('{{DATE}}', '2026-10-16')
    .replace('{{ARTICLES}}', articles.map(a => JSON.stringify(a)).join(',\n'));
}

const KEY_A = 'emm-progress:Success背诵方案';
const KEY_B = 'emm-progress:Dream背诵方案';

console.log('\n== v2.30.0 教学纵深三件套（自动评分 / 今日全局 / 生词本）运行时验证 ==');

// ── 静态：锚点与关键类名 ──
ok((planTemplate.match(/EMM_SPEECH_V230/g) || []).length === 1, 'EMM_SPEECH_V230 锚点恰好 1 次（plan-template）');
ok((libTemplate.match(/EMM_TODAYALL_V230/g) || []).length === 1, 'EMM_TODAYALL_V230 锚点恰好 1 次（library-template）');
ok((libTemplate.match(/EMM_VOCAB_V230/g) || []).length === 1, 'EMM_VOCAB_V230 锚点恰好 1 次（library-template）');
ok(/sv-auto/.test(planTemplate) && /sv-auto\.listening/.test(planTemplate), '模板含 sv-auto 按钮与 listening 样式');
ok(/emm-lib-todayall/.test(libTemplate) && /emm-lib-vocab/.test(libTemplate), '记忆库含今日全局/生词本容器');
ok(/emm-vocab:v1/.test(libTemplate), '生词本存储键 emm-vocab:v1 已定义');

// ── A. 影子自动评分 ──
console.log('\n== 发音自动评分：降级 / 聆听 / 对齐标注 ==');
{
  resetSR();
  const { w, doc, alerts } = await bootPlan({});
  doc.querySelector('.rv-shadow-btn').click();
  const panel = doc.querySelector('.sv-panel');
  ok(panel && panel.style.display === 'block', '影子面板已打开');
  ok(!!doc.querySelector('.sv-auto'), '自动评分按钮已注入');
  doc.querySelector('.sv-auto').click();
  ok(alerts.some(a => /语音识别/.test(a)), '不支持语音识别时弹 alert 降级');
  ok(FakeSR.instances.length === 0, '未创建识别实例');
}
{
  resetSR();
  const { w, doc } = await bootPlan({ withSR: true });
  doc.querySelector('.rv-shadow-btn').click();
  doc.querySelector('.sv-auto').click();
  ok(FakeSR.instances.length === 1 && FakeSR.started === 1, '点击后创建识别实例并 start');
  const inst = FakeSR.instances[0];
  ok(inst.lang === 'en-US' && inst.interimResults === false, '识别参数 lang=en-US / 非中间结果');
  const btn = doc.querySelector('.sv-auto');
  ok(/正在听/.test(btn.textContent) && btn.classList.contains('listening'), '聆听态：按钮文案与样式切换');
  // 部分正确转写：漏掉 "a"
  inst.onresult({ results: [[{ transcript: 'this is simple sentence' }]] });
  const words1 = [...doc.querySelectorAll('.sv-w')];
  ok(words1.length === 5, '第 1 句渲染 5 个词按钮');
  ok(words1[0].classList.contains('sv-ok') && words1[1].classList.contains('sv-ok'), '匹配词标 ✓');
  ok(words1[2].classList.contains('sv-bad'), '缺失词标 ✗（a）');
  ok(words1[3].classList.contains('sv-ok') && words1[4].classList.contains('sv-ok'), '后续匹配词标 ✓');
  const st1 = doc.querySelector('.sv-status').textContent;
  ok(/识别：/.test(st1) && /已自动标注 ✓4 \/ ✗1/.test(st1), '状态行显示识别文本与统计');
  // 空转写守卫
  doc.querySelector('.sv-clear').click();
  inst.onresult({ results: [[{ transcript: '' }]] });
  ok(/没听清/.test(doc.querySelector('.sv-status').textContent), '空转写提示「没听清」');
  ok(!doc.querySelector('.sv-w.sv-ok') && !doc.querySelector('.sv-w.sv-bad'), '空转写不改动标注');
  // 无匹配转写守卫
  inst.onresult({ results: [[{ transcript: 'completely unrelated words here' }]] });
  ok(/无匹配词/.test(doc.querySelector('.sv-status').textContent), '无匹配转写有守卫提示');
  ok(!doc.querySelector('.sv-w.sv-ok'), '无匹配不填标注');
  // onend 恢复按钮
  inst.onend();
  ok(/自动评分/.test(btn.textContent) && !btn.classList.contains('listening'), 'onend 后按钮恢复');
}
{
  resetSR();
  const { w, doc } = await bootPlan({ withSR: true });
  doc.querySelector('.rv-shadow-btn').click();
  // 第 2 句：识别只听到一半 → 错词 60% → 保存后入薄弱
  doc.querySelector('.sv-skip').click();
  doc.querySelector('.sv-auto').click();
  let inst = FakeSR.instances[0];
  inst.onresult({ results: [[{ transcript: 'memory hooks' }]] });
  const words2 = [...doc.querySelectorAll('.sv-w')];
  ok(words2[0].classList.contains('sv-ok') && words2[1].classList.contains('sv-ok'), '第 2 句前两词 ✓');
  ok(words2.slice(2).every(b => b.classList.contains('sv-bad')), '漏读词全部 ✗（3 个）');
  const saveBtn = doc.querySelector('.sv-save');
  ok(!saveBtn.disabled, '自动标注后保存按钮解锁');
  saveBtn.click();
  const saved = JSON.parse(w.localStorage.getItem('emm-progress:测试文章背诵方案') || '{}');
  ok(saved.weak && saved.weak['1'] === true, '错词 ≥25% 自动入薄弱清单（weak[1]）');
  ok(saved.shadow && saved.shadow['1'] && saved.shadow['1'].bad === 3, '评分结果写入 state.shadow[1]');
  // 模拟浏览器在识别结果后自动结束，再点按钮开新一轮
  FakeSR.instances[0].onend();
  doc.querySelector('.sv-auto').click();
  ok(FakeSR.instances.length === 2 && FakeSR.started === 2, '保存后可再次开始新的识别');
  FakeSR.instances[1].stop();
  ok(FakeSR.stopped >= 1, '识别可手动停止');
}

// ── B. 能力横幅 ──
console.log('\n== 能力横幅：语音识别行 ==');
{
  resetSR();
  const { doc } = await bootPlan({ fullCaps: true });
  ok(!doc.getElementById('emm-cap'), '全能力（含语音识别）时不弹横幅');
}
{
  resetSR();
  const { doc } = await bootPlan({});
  const cap = doc.getElementById('emm-cap');
  ok(!!cap && /自动评分/.test(cap.textContent), '缺语音识别时横幅列「自动评分」替代做法');
}

// ── C. 今日全局排期条 ──
console.log('\n== 记忆库今日全局：聚合 / 排序 / 撞车 / 空态 ==');
{
  const { doc } = await bootLib([libA, libB]);
  const box = doc.getElementById('emm-lib-todayall');
  ok(!!box && !box.hidden, '今日全局条已渲染');
  ok(/今天没有到期的复习/.test(box.textContent), '无进度时显示空态文案');
}
{
  const progA = { done: {}, streak: {}, weak: { '0': true, '1': true }, rounds: [{ date: dstr(-1), ok: 2, bad: 2 }],
    mode: false, quiz: 0, start: '', perDay: 1, ladder: {}, log: {}, wb: {},
    sr: { '0': { ef: 2.5, interval: 1, reps: 1, due: dstr(-1), lastQ: 4 }, '1': { ef: 2.5, interval: 1, reps: 1, due: dstr(-1), lastQ: 4 } } };
  const progB = { done: {}, streak: {}, weak: {}, rounds: [], mode: false, quiz: 0, start: dstr(-3), perDay: 1, ladder: {}, log: {}, wb: {}, sr: {} };
  const { doc } = await bootLib([libA, libB], { seed: { [KEY_A]: progA, [KEY_B]: progB } });
  const box = doc.getElementById('emm-lib-todayall');
  const rows = [...box.querySelectorAll('.ta-row')];
  ok(rows.length === 2, '两篇有动态 → 两行');
  ok(/《Success》/.test(rows[0].textContent) && /到期 2 句/.test(rows[0].textContent), '到期多的 A 篇排前，显示「到期 2 句」');
  ok(/薄弱 2/.test(rows[0].textContent), 'A 行显示薄弱数');
  ok(/《Dream》/.test(rows[1].textContent) && /新学中 Day 4\/17/.test(rows[1].textContent), 'B 行显示新学进度 Day 4/17');
  ok(/预计 ~2 分钟/.test(rows[0].textContent) && /预计 ~15 分钟/.test(rows[1].textContent), '每行预估时长');
  ok(/预计总时长 ~17 分钟/.test(box.textContent), '汇总总时长');
  ok(/共 2 篇待动/.test(box.textContent) && !/建议先清/.test(box.textContent), '2 篇不触发撞车建议');
}
{
  const mk = (n) => ({ topic: 't' + n, file: 't' + n + '-memorization-plan.html', key: 'T' + n + '背诵方案',
    title: 'T' + n, type: '议论文', sents: 2, words: 50, days: 16, date: '2026-10-01', chain: [], cloze: [] });
  const seed = {};
  [1, 2, 3, 4].forEach(n => {
    seed['emm-progress:T' + n + '背诵方案'] = { done: {}, streak: {}, weak: { '0': true }, rounds: [], mode: false, quiz: 0,
      start: '', perDay: 1, ladder: {}, log: {}, wb: {}, sr: { '0': { ef: 2.5, interval: 1, reps: 1, due: dstr(-1), lastQ: 4 } } };
  });
  const arts = [mk(1), mk(2), mk(3), mk(4)];
  const { doc } = await bootLib(arts, { seed });
  const box = doc.getElementById('emm-lib-todayall');
  ok(box.querySelectorAll('.ta-row').length === 4, '4 篇待动 → 4 行');
  ok(/建议先清/.test(box.textContent), '超 3 篇触发撞车错峰建议');
}

// ── D. 生词本 ──
console.log('\n== 生词本：提取 / 入本 / 调度 / 毕业 / 移除 ==');
{
  const { w, doc } = await bootLib([libA], { seed: { [KEY_A]: { done: {}, streak: {}, weak: { '0': true }, rounds: [], mode: false, quiz: 0, start: '', perDay: 1, ladder: {}, log: {}, wb: {}, sr: {} } } });
  const box = doc.getElementById('emm-lib-vocab');
  ok(!!box && !box.hidden, '生词本面板已渲染');
  ok(/还没有在册生词/.test(box.textContent), '空态文案');
  box.querySelector('.vc-extract').click();
  const zone = box.querySelector('.vc-cands');
  const adds = [...zone.querySelectorAll('.vc-add')].map(b => b.getAttribute('data-w'));
  ok(adds.includes('test') && adds.includes('sentence'), '薄弱句锚词成为候选（test / sentence）');
  ok(!adds.includes('number'), '非薄弱句锚词不入候选');
  zone.querySelector('.vc-add[data-w="test"]').click();
  const store = JSON.parse(w.localStorage.getItem('emm-vocab:v1'));
  ok(store.words && store.words.test, '入本写入 emm-vocab:v1');
  ok(store.words.test.due === dstr(1) && store.words.test.interval === 1 && store.words.test.reps === 1, '新词 SM-2 初始调度（明天到期）');
  ok(/在册 1 词/.test(box.querySelector('.vc-counts').textContent), '计数更新为在册 1 词');
  const adds2 = [...box.querySelectorAll('.vc-add')].map(b => b.getAttribute('data-w'));
  ok(!adds2.includes('test'), '已入册词不再出现在候选');
}
{
  const vocab = { words: { memory: { ef: 2.5, interval: 1, reps: 1, due: dstr(-1), lastQ: 4,
    src: [{ t: 'Success', file: '', sidx: 1, h: '钩A', en: 'Test sentence number 1 the words.' }] } } };
  const { w, doc } = await bootLib([libA], { seed: { 'emm-vocab:v1': JSON.stringify(vocab) } });
  const box = doc.getElementById('emm-lib-vocab');
  ok(/今日到期 1 词/.test(box.textContent), '昨日到期词进入今日列表');
  ok(/来自《Success》· 句钩「钩A」/.test(box.textContent), '词卡显示来源与句钩');
  box.querySelector('.vc-ok').click();
  const st = JSON.parse(w.localStorage.getItem('emm-vocab:v1'));
  ok(st.words.memory.reps === 2 && st.words.memory.interval === 6, '✓ 后 SM-2 推进（reps 2 / interval 6）');
  ok(st.words.memory.due === dstr(6), '到期日推到 6 天后（reps 1 → interval 6）');
  ok(/今天没有到期的生词/.test(box.textContent), '调度后从今日列表消失');
}
{
  const vocab = { words: { memory: { ef: 2.5, interval: 7, reps: 2, due: dstr(-1), lastQ: 4,
    src: [{ t: 'Success', file: '', sidx: 1, h: '钩A', en: 'Test sentence number 1 the words.' }] } } };
  const { doc } = await bootLib([libA], { seed: { 'emm-vocab:v1': JSON.stringify(vocab) } });
  const box = doc.getElementById('emm-lib-vocab');
  ok(!/今日到期/.test(box.textContent) && /已毕业 1/.test(box.textContent), 'reps≥2 且 interval≥7 毕业不再调度');
  box.querySelector('.vc-toggle-all').click();
  ok(/memory/.test(box.querySelector('.vc-cands').textContent) && /已毕业/.test(box.querySelector('.vc-cands').textContent), '在册词表可展开并显示毕业徽标');
}
{
  const vocab = { words: { memory: { ef: 2.5, interval: 1, reps: 1, due: dstr(-1), lastQ: 4,
    src: [{ t: 'Success', file: '', sidx: 1, h: '钩A', en: 'Test sentence number 1 the words.' }] } } };
  const { w, doc } = await bootLib([libA], { seed: { 'emm-vocab:v1': JSON.stringify(vocab) } });
  const box = doc.getElementById('emm-lib-vocab');
  box.querySelector('.vc-del').click();
  const st = JSON.parse(w.localStorage.getItem('emm-vocab:v1'));
  ok(!st.words || !st.words.memory, '移除按钮从存储删除词');
  ok(/还没有在册生词/.test(box.textContent), '删空后回到空态');
}
{
  const vocab = { words: { memory: { ef: 2.5, interval: 6, reps: 2, due: dstr(-1), lastQ: 4,
    src: [{ t: 'Success', file: '', sidx: 1, h: '钩A', en: 'Test sentence number 1 the words.' }] } } };
  const { w, doc } = await bootLib([libA], { seed: { 'emm-vocab:v1': JSON.stringify(vocab) } });
  const box = doc.getElementById('emm-lib-vocab');
  box.querySelector('.vc-no').click();
  const st = JSON.parse(w.localStorage.getItem('emm-vocab:v1'));
  ok(st.words.memory.reps === 0 && st.words.memory.interval === 1, '✗ 后 SM-2 重置（reps 0 / interval 1）');
  ok(/今天没有到期的生词/.test(box.textContent) && /待复习 1 词/.test(box.textContent), '重置后进入待复习（明日到期）');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

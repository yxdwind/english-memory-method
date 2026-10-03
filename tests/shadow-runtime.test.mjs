/**
 * v2.19 EMM_SHADOW_V219 影子跟读 · 运行时验证
 *
 * 用 jsdom 加载 plan-template.html（注入真实示例数据），验证：
 *   a. EMM_SHADOW_V219 标识存在且唯一
 *   b. rv-bar 上有 🎙️ 影子跟读 按钮
 *   c. 点击按钮 → 影子面板显示，自动播放原句
 *   d. 逐词标注：点 1 次=✓ / 2 次=✗ / 3 次=重置
 *   e. 保存：错词 ≥ 25% 自动入薄弱清单；state.shadow[idx] 写入
 *   f. 持久化：跨刷新可读
 *   g. 跳过句、上一句/下一句、清空标注功能
 *   h. 无 MediaRecorder 时优雅降级（不抛错，alert 不存在时静默）
 *
 * 跑：node tests/shadow-runtime.test.mjs（需要 npm i --no-save jsdom@16）
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
  vc.on('error', (...args) => console.error('[js]', ...args));
  vc.on('warn', (...args) => console.warn('[js]', ...args));
  vc.on('log', (...args) => console.log('[js]', ...args));
  // jsdom 在 error 时也会抛 window.onerror
  return vc;
}

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
    <div class="sent"><div class="sent-en">The cat sat on the mat.</div>
        <div class="sent-zh">猫坐在垫子上。</div>
        <div class="pron"><span class="lbl">连读</span>sat on · /sæt ɑn/ · 连读</div></div>
    <div class="sent"><div class="sent-en">It was a sunny day.</div>
        <div class="sent-zh">这是晴天。</div>
        <div class="pron"><span class="lbl">弱读</span>was · /wəz/ · 弱读</div></div>
    <div class="sent"><div class="sent-en">Birds fly in the sky.</div>
        <div class="sent-zh">鸟儿在天空中飞翔。</div>
        <div class="pron"><span class="lbl">连读</span>fly in · /flaɪ ɪn/ · 连读</div></div>
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
  w.speechSynthesis = {
    getVoices: () => [],
    speak: opts.recordSpeak ? ((u) => { (opts.recordSpeak.calls || (opts.recordSpeak.calls = [])).push(u.text); }) : (() => {}),
    cancel: () => {},
  };
  if (opts.preload) {
    Object.entries(opts.preload).forEach(([k, v]) => {
      try { w.localStorage.setItem(k, String(v)); } catch (e) {}
    });
  }
  const wrap = w.document.querySelector('.wrap');
  if (wrap && opts.replaceWrap) {
    // 替换整个 wrap 内容（避免模板里的示例 .sent 干扰计数）
    wrap.innerHTML = opts.replaceWrap;
  } else if (wrap && opts.prefix) {
    wrap.innerHTML = opts.prefix + wrap.innerHTML;
  }
  // 运行所有 <script> 块（顺序：v2.18 主组件 → v2.18 fold → v2.19 shadow）
  const scriptBlocks = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  // 拼接所有 script 一次性 eval：浏览器把同一 <script> 块里的所有内容作为同一词法作用域运行，
  // 所以"独立 eval 各 IIFE"会因 strict mode 看不到 `state/sentences` 而失效；必须拼接
  const allScripts = scriptBlocks.join('\n;\n');
  try { w.eval(allScripts); } catch (e) {
    console.error('eval error:', e.message, '\n', e.stack && e.stack.split('\n').slice(0, 4).join('\n'));
    process.exit(1);
  }
  await new Promise(r => setTimeout(r, 100));
  return { w, doc: w.document };
}

console.log('\n== v2.19 EMM_SHADOW_V219 影子跟读 运行时验证 ==');

// 静态检查
ok(!!template.match(/EMM_SHADOW_V219/), 'EMM_SHADOW_V219 标识存在');
ok((template.match(/EMM_SHADOW_V219/g) || []).length === 1, 'EMM_SHADOW_V219 恰好 1 次');

// 第一句：三句文本下，开启 + 逐词标注 + 保存
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  ok(!!doc.querySelector('.rv-shadow-btn'), 'rv-bar 上 🎙️ 影子跟读 按钮存在');
  const panel = () => doc.querySelector('#emm-shadow .sv-panel');
  ok(!panel() || panel().style.display === 'none', '初始：影子面板隐藏');
  doc.querySelector('.rv-shadow-btn').click();
  await new Promise(r => setTimeout(r, 30));
  ok(panel() && panel().style.display === 'block', '点击按钮：影子面板显示');

  // 当前句子应该是第 1 句
  const sent = doc.querySelector('#emm-shadow .sv-sent');
  ok(sent && sent.textContent.includes('第 1 句 / 共 3 句'), '显示当前句（1/3）');
  ok(sent && sent.textContent.includes('The cat sat on the mat.'), '显示句文本');

  // 词按钮渲染
  const words = doc.querySelectorAll('#emm-shadow .sv-w');
  ok(words.length === 6, `6 个词按钮（实际 ${words.length}）`); // The, cat, sat, on, the, mat

  // 标注循环：第 1 词 ✓（每次 click 后 innerHTML 重渲染，旧 words 引用失效，需重新查）
  function clickWord(idx, times) {
    for (let t = 0; t < times; t++) {
      const w0 = doc.querySelectorAll('#emm-shadow .sv-w')[idx];
      w0.click();
    }
  }
  clickWord(0, 1);
  ok(doc.querySelectorAll('#emm-shadow .sv-w')[0].classList.contains('sv-ok'), '点 1 次：标 ✓');
  clickWord(0, 1);
  ok(doc.querySelectorAll('#emm-shadow .sv-w')[0].classList.contains('sv-bad'), '点 2 次：标 ✗');
  clickWord(0, 1);
  ok(!doc.querySelectorAll('#emm-shadow .sv-w')[0].classList.contains('sv-ok') &&
     !doc.querySelectorAll('#emm-shadow .sv-w')[0].classList.contains('sv-bad'), '点 3 次：重置');
  clickWord(0, 1); // 标 ✓

  // 保存按钮：标了至少 1 个才能保存
  const saveBtn = doc.querySelector('#emm-shadow .sv-save');
  ok(!saveBtn.disabled, '标了 1 个词后保存按钮启用');

  // 把其他 5 个词都标成 ✗（错词占 100%，应入薄弱清单）
  for (let i = 1; i < 6; i++) clickWord(i, 2); // 每个点 2 次 = ✗
  saveBtn.click();
  await new Promise(r => setTimeout(r, 50));

  // 找到 shadow 写入的 key（keyOf 取决于 h1 或 title 的 fallback）
  function progKey(){
    var h = doc.querySelector('h1');
    return 'emm-progress:' + (h ? h.textContent.trim().slice(0, 40) : (doc.title || '').slice(0, 40) || 'plan');
  }
  // state.shadow[0] 应已写入
  const stored = JSON.parse(w.localStorage.getItem(progKey()) || '{}');
  ok(stored.shadow && stored.shadow[0] && stored.shadow[0].bad === 5, 'state.shadow[0] 保存：bad=5');
  ok(stored.shadow[0].ok === 1, 'state.shadow[0] 保存：ok=1');

  // 错词 ≥ 25% → 自动入薄弱
  ok(stored.weak && stored.weak[0] === true, '错词 5/6=83% → 自动入薄弱清单');
}

// 跨刷新：state.shadow 持久化
{
  // shadow 用 h1 / document.title 拼 key；测试里没有 h1，document.title 是模板默认的"{{TITLE}}背诵方案"
  const { w, doc } = await boot({ replaceWrap: fakeArticle, preload: { 'emm-progress:{{TITLE}}背诵方案': JSON.stringify({ shadow: { 1: { ok: 4, bad: 0, total: 4, marks: [1,1,1,1], date: '2026-10-01' } } }) } });
  // 先标第 2 句为已存在
  // 开启影子 → 应自动加载第 0 句（idx=0）
  doc.querySelector('.rv-shadow-btn').click();
  await new Promise(r => setTimeout(r, 50));
  const sent = doc.querySelector('#emm-shadow .sv-sent');
  ok(sent.textContent.includes('The cat sat on the mat.'), '初始 idx=0');
  // 跳到下一句
  doc.querySelector('#emm-shadow .sv-skip').click();
  await new Promise(r => setTimeout(r, 50));
  // 跨刷新 shadow[1] 应自动加载（之前的 marks）
  const words2 = doc.querySelectorAll('#emm-shadow .sv-w');
  const okCount = [...words2].filter(w => w.classList.contains('sv-ok')).length;
  ok(okCount === 4, '持久化的 marks 在新 session 加载为 ✓');
}

// 清空标注 + 重做
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  doc.querySelector('.rv-shadow-btn').click();
  await new Promise(r => setTimeout(r, 50));
  const clickWord = (idx, times) => {
    for (let t = 0; t < times; t++) doc.querySelectorAll('#emm-shadow .sv-w')[idx].click();
  };
  clickWord(0, 1); // ✓
  clickWord(0, 2); // ✗ → reset
  clickWord(0, 1); // ✓
  doc.querySelector('#emm-shadow .sv-clear').click();
  await new Promise(r => setTimeout(r, 20));
  const okAfter = doc.querySelectorAll('#emm-shadow .sv-w.sv-ok').length;
  ok(okAfter === 0, '清空标注后无 ✓');
}

// 不存在 MediaRecorder：优雅降级（不抛错）
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  // jsdom 默认没有 mediaDevices
  // 点"🎤 录音"应该弹 alert（被忽略）不抛错
  let alertCalled = false;
  w.alert = (msg) => alertCalled = true;
  w.navigator.mediaDevices = undefined; // 强制无 mediaDevices
  doc.querySelector('.rv-shadow-btn').click();
  await new Promise(r => setTimeout(r, 50));
  let threw = false;
  try { doc.querySelector('#emm-shadow .sv-record').click(); } catch (e) { threw = true; }
  ok(!threw, '无 MediaRecorder 时点击录音按钮不抛错');
  ok(alertCalled, '弹 alert 提示降级');
}

// 点 2 次 = ✓ → ✗ 仍然正确（边界）
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  doc.querySelector('.rv-shadow-btn').click();
  await new Promise(r => setTimeout(r, 50));
  const w0 = () => doc.querySelectorAll('#emm-shadow .sv-w')[0];
  w0().click();
  ok(w0().classList.contains('sv-ok'), '循环第 1 步：✓');
  w0().click();
  ok(w0().classList.contains('sv-bad'), '循环第 2 步：✗');
  w0().click();
  ok(!w0().classList.contains('sv-ok') && !w0().classList.contains('sv-bad'), '循环第 3 步：pending');
  w0().click();
  ok(w0().classList.contains('sv-ok'), '循环第 4 步：✓（从 pending 回到 ✓）');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);
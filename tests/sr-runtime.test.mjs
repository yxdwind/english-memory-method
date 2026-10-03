/**
 * v2.20 EMM_SR_V220 SM-2 算法升级 · 运行时验证
 *
 * 用 jsdom 加载 plan-template.html，验证：
 *   a. EMM_SR_V220 标识存在且唯一
 *   b. srNext() 算法正确（Wozniak 1990 spec）：
 *      - q<3 → reps=0, interval=1
 *      - reps=0/1 → 1/6
 *      - reps>1 → round(prev.interval * ef)
 *      - EF 更新钳制到 ≥ 1.3
 *   c. judge() 钩入 __emmDispatch('judge', ...)
 *   d. endRound() 钩入 __emmDispatch('endRound', ...) → state.sr[idx] 写入
 *   e. 轻量 / 标准模式 toggle 切换 state.srMode
 *   f. 标准模式仪表盘显示 SM-2 间隔详情
 *   g. Ebbinghaus 对齐：standard 下 due ≥ max(SM2, Ebbinghaus)
 *   h. 持久化：跨刷新 state.sr 保留
 *   i. 重置进度清空 state.sr
 *
 * 跑：node tests/sr-runtime.test.mjs（需要 npm i --no-save jsdom@16）
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
        <div class="sent-zh">猫坐在垫子上。</div></div>
    <div class="sent"><div class="sent-en">It was a sunny day.</div>
        <div class="sent-zh">这是晴天。</div></div>
    <div class="sent"><div class="sent-en">Birds fly in the sky.</div>
        <div class="sent-zh">鸟儿在天空中飞翔。</div></div>
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

console.log('\n== v2.20 EMM_SR_V220 SM-2 算法升级 运行时验证 ==');

// 静态检查
ok(!!template.match(/EMM_SR_V220/), 'EMM_SR_V220 标识存在');
ok((template.match(/EMM_SR_V220/g) || []).length === 1, 'EMM_SR_V220 恰好 1 次');

// ── A. 算法正确性（提取 srNext + ebbinghausDueDays，独立 eval 测）────
{
  // 从模板里抽出 SR IIFE 块（v2.20 注释后的 IIFE）
  const m = template.match(/\/\* ===== v2\.20 EMM_SR_V220[\s\S]*?\}\)\(\);[\s\S]*?<\/script>/);
  ok(!!m, 'SR IIFE 块可在模板中定位');
  if (!m) {
    console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
    process.exit(1);
  }
  // 在隔离 scope 里 eval，把 srNext + alignWithEbbinghaus 暴露到 window
  const dom = new JSDOM('<!doctype html><html><body></body></html>', { runScripts: 'outside-only', url: 'http://localhost/x', virtualConsole: quietConsole() });
  const w = dom.window;
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  // 注入 __test__ export：在 IIFE 末尾追加赋值
  const iife = m[0].replace(/\}\)\(\);[\s\S]*?<\/script>/, 'window.__srNext = srNext; window.__align = alignWithEbbinghaus; window.__ebb = ebbinghausDueDays; })();');
  try { w.eval(iife); } catch (e) {
    console.error('iife eval err:', e.message);
    process.exit(1);
  }
  const srNext = w.__srNext, align = w.__align, ebb = w.__ebb;

  // 单元测试
  // 1) 初始 ✓（q=4）→ EF 公式：EF' = 2.5 + (0.1 - 1*(0.08+0.02)) = 2.5 + 0 = 2.5（EF 不变）
  let r = srNext(4, null);
  ok(Math.abs(r.ef - 2.5) < 1e-6, `初评 ✓：ef=2.5（实际 ${r.ef.toFixed(4)}，q=4 时 EF 持平）`);
  ok(r.reps === 1, `初评 ✓：reps=1（实际 ${r.reps}）`);
  ok(r.interval === 1, `初评 ✓：interval=1d（实际 ${r.interval}d）`);

  // 2) reps=1 → interval=6
  r = srNext(4, { ef: 2.6, interval: 1, reps: 1, due: '', lastQ: 4 });
  ok(r.interval === 6, `reps=1：interval=6d（实际 ${r.interval}d）`);
  ok(r.reps === 2, `reps=1→reps=2（实际 ${r.reps}）`);

  // 3) reps=2, prev.interval=6, ef=2.6 → interval=round(6*2.6)=16
  r = srNext(4, { ef: 2.6, interval: 6, reps: 2, due: '', lastQ: 4 });
  ok(r.interval === 16, `reps=2：interval=16d（实际 ${r.interval}d，6*2.6=15.6 四舍五入）`);

  // 4) ✗ → 重置 reps=0, interval=1
  r = srNext(2, { ef: 2.6, interval: 16, reps: 3, due: '', lastQ: 4 });
  ok(r.reps === 0, `✗：reps 重置 0（实际 ${r.reps}）`);
  ok(r.interval === 1, `✗：interval=1d（实际 ${r.interval}d）`);

  // 5) EF 钳制：q=0 反复 → ef 趋近 1.3
  let ef = 2.5;
  for (let i = 0; i < 20; i++) {
    ef = srNext(0, { ef, interval: 1, reps: 0, due: '', lastQ: 0 }).ef;
  }
  ok(ef >= 1.3 && ef <= 1.3001, `EF 钳制 ≥ 1.3（实际 ${ef.toFixed(4)}）`);

  // 6) due 字段：间隔 1 天后是明天
  const today = new Date();
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);
  const expectedDue = tomorrow.getFullYear() + '-' + String(tomorrow.getMonth()+1).padStart(2,'0') + '-' + String(tomorrow.getDate()).padStart(2,'0');
  r = srNext(4, null);
  ok(r.due === expectedDue, `due=明天（实际 ${r.due} vs ${expectedDue}）`);

  // 7) Ebbinghaus 表
  ok(ebb(1) === 1, `Ebbinghaus reps=1 → 1d`);
  ok(ebb(2) === 2, `Ebbinghaus reps=2 → 2d`);
  ok(ebb(3) === 4, `Ebbinghaus reps=3 → 4d`);
  ok(ebb(4) === 7, `Ebbinghaus reps=4 → 7d`);
  ok(ebb(5) === 15, `Ebbinghaus reps=5 → 15d`);
  ok(ebb(0) === 0, `Ebbinghaus reps=0 → 0`);

  // 8) align：SM2=1d（ef=1.3, reps=2 → round(1*1.3)=1）, Ebbinghaus=4d（reps=3）→ 抬高到 4d
  let prev = { ef: 1.3, interval: 1, reps: 2, due: '', lastQ: 2 };
  let nxt = srNext(4, prev); // q=4, reps=2 → interval=round(1*1.3)=1, reps=3
  nxt = align(nxt);
  ok(nxt.interval === 4 && nxt.aligned === 'ebbinghaus', `Ebbinghaus 抬高 reps=3：SM2=1d → 4d（实际 ${nxt.interval}d）`);

  // 9) align：SM2=16d, Ebbinghaus=4d → aligned=sm2, interval=16d
  prev = { ef: 2.6, interval: 6, reps: 2, due: '', lastQ: 4 };
  nxt = srNext(4, prev); // q=4 → interval=round(6*2.6)=16d
  nxt = align(nxt);
  ok(nxt.interval === 16 && nxt.aligned === 'sm2', `Ebbinghaus 对齐：SM2 胜（16d）`);
}

// ── B. UI 集成：mode toggle 按钮 ──────────────────────────────────────
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  const srBtn = doc.querySelector('.rv-srmode');
  ok(!!srBtn, 'rv-srmode 按钮存在');
  ok(srBtn && srBtn.textContent === '📚 轻量', `默认显示「📚 轻量」（实际「${srBtn && srBtn.textContent}」）`);
  // 点击切到标准
  srBtn.click();
  await new Promise(r => setTimeout(r, 30));
  ok(doc.querySelector('.rv-srmode').textContent === '🧠 标准', '点击：切换为「🧠 标准」');
  // 再点切回
  doc.querySelector('.rv-srmode').click();
  await new Promise(r => setTimeout(r, 30));
  ok(doc.querySelector('.rv-srmode').textContent === '📚 轻量', '再次点击：切回「📚 轻量」');
  // state.srMode 持久化
  const stored = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  ok(stored.srMode === 'light', 'state.srMode=light 持久化');
}

// ── C. judge() 钩入 __emmDispatch ─────────────────────────────────────
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  // 第 1 句的"顺"按钮
  const firstOk = doc.querySelector('.rv-judge [data-v=ok]');
  ok(!!firstOk, '第 1 句有 ✓ 按钮');
  firstOk.click();
  await new Promise(r => setTimeout(r, 30));
  const stored = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  ok(stored.sr && stored.sr[0] && stored.sr[0].lastQ === 4, `judge() 后 state.sr[0].lastQ=4（实际 ${stored.sr && stored.sr[0] && stored.sr[0].lastQ}）`);
}

// ── D. endRound() 批量算 SR，仪表盘渲染 ──────────────────────────────
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  // 把 3 句都打成 ✓：先点"开始本轮"，再依次点击每句的"顺"
  doc.querySelector('.rv-round').click();
  await new Promise(r => setTimeout(r, 30));
  doc.querySelectorAll('.rv-judge [data-v=ok]').forEach(b => b.click());
  await new Promise(r => setTimeout(r, 30));
  // 结束本轮
  doc.querySelector('.rv-round').click(); // 现在变成"结束本轮"
  await new Promise(r => setTimeout(r, 80));
  const stored = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  ok(stored.sr && Object.keys(stored.sr).length === 3, `endRound 后 state.sr 有 3 条（实际 ${stored.sr && Object.keys(stored.sr).length}）`);
  ok(stored.sr[0] && Math.abs(stored.sr[0].ef - 2.5) < 1e-6, `第 1 句 ef=2.5（q=4 持平，实际 ${stored.sr && stored.sr[0] && stored.sr[0].ef.toFixed(4)}）`);
  ok(stored.sr[0] && stored.sr[0].reps === 1, `第 1 句 reps=1（实际 ${stored.sr && stored.sr[0] && stored.sr[0].reps}）`);

  // 仪表盘：在 light 模式下不应显示 SM-2 详情
  ok(!doc.querySelector('.rv-dash').innerHTML.includes('SM-2 间隔'), 'light 模式仪表盘不显 SM-2 详情');

  // 切到 standard
  doc.querySelector('.rv-srmode').click();
  await new Promise(r => setTimeout(r, 30));
  ok(doc.querySelector('.rv-dash').innerHTML.includes('SM-2 间隔'), 'standard 模式仪表盘显 SM-2 详情');
  ok(doc.querySelector('.rv-dash').innerHTML.includes('ef='), 'standard 模式仪表盘含 ef 字段');
}

// ── E. Ebbinghaus 对齐（标准模式）：q=2 后 reps=0, 不触发 Ebbinghaus（reps<=0 时 ebb=0） ───────────
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  doc.querySelector('.rv-srmode').click(); // 切到 standard
  await new Promise(r => setTimeout(r, 30));
  // 第 1 句打 ✗
  doc.querySelector('.rv-round').click();
  await new Promise(r => setTimeout(r, 30));
  doc.querySelectorAll('.rv-judge [data-v=bad]')[0].click();
  await new Promise(r => setTimeout(r, 30));
  doc.querySelector('.rv-round').click(); // 结束
  await new Promise(r => setTimeout(r, 50));
  const stored = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  const sr = stored.sr && stored.sr[0];
  ok(sr && sr.aligned === 'sm2', `q=2 失败后 reps=0，Ebbinghaus 不应用（aligned=${sr && sr.aligned}）`);
  ok(sr && sr.reps === 0, `reps=0（actual ${sr && sr.reps}）`);
  ok(sr && sr.interval === 1, `interval=1d（actual ${sr && sr.interval}d）`);
}

// ── F. 持久化：跨刷新 state.sr 保留 ───────────────────────────────────
{
  const fakeKey = progKeyDoc(fakeKeyArticle());
  const preload = {};
  preload[fakeKey] = JSON.stringify({
    sr: { 0: { ef: 2.6, interval: 1, reps: 1, due: '2099-12-31', lastQ: 4, aligned: 'sm2' } },
    srMode: 'standard'
  });
  const { w, doc } = await boot({ replaceWrap: fakeArticle, preload });
  // 跨刷新后应能看到 SM-2 详情
  const dash = doc.querySelector('.rv-dash').innerHTML;
  ok(dash.includes('SM-2 间隔'), '跨刷新 standard 模式保留');
  ok(dash.includes('2099-12-31'), '跨刷新 due 字段保留');
  ok(dash.includes('ef=2.60'), `跨刷新 ef 保留（实际 ef=${dash.match(/ef=([\d.]+)/)[1]}）`);
}

// 辅助：构造与 fakeArticle 匹配的 key（jsdom 没有 h1，用 document.title）
function fakeKeyArticle() {
  return fakeArticle;
}
function progKeyDoc(article) {
  return 'emm-progress:{{TITLE}}背诵方案';
}

// ── G. 重置进度清空 state.sr ─────────────────────────────────────────
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  // 先写一些 state.sr
  w.localStorage.setItem(progKey(doc), JSON.stringify({ sr: { 0: { ef: 2.6, interval: 6, reps: 2, due: '2099-01-01', lastQ: 4 } } }));
  // 触发重置
  w.confirm = () => true;
  doc.querySelector('.rv-reset').click();
  await new Promise(r => setTimeout(r, 50));
  const stored = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  ok(!stored.sr || Object.keys(stored.sr).length === 0, `重置后 state.sr 清空（实际 ${stored.sr ? Object.keys(stored.sr).length : 0} 条）`);
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);
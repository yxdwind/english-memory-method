/**
 * v2.29.0 EMM_QUICK3_V229 / EMM_CAP_V229 / EMM_ANKI_V229 入门减负三件套 · 运行时验证
 *
 * 用 jsdom 加载 plan-template.html，验证：
 *   a. 首屏「3 步快背」卡自动注入（header 之后、3 步、跳转按钮可点不报错）
 *   b. 页脚自动渲染版本戳 v2.29.0（RELEASE-CHECKLIST 版本水印）
 *   c. 能力探测横幅：jsdom 无 MediaRecorder → 横幅出现且列明替代做法；
 *      「知道了」可关闭并持久化；预置 emm-cap-dismissed=1 不再出现；
 *      TTS+录音+存储全可用时横幅不出现
 *   d. Anki/CSV 导出：复习条有 🗂 Anki 按钮；挖空输入框带 data-ans；
 *      点击导出按卡片数弹提示（URL.createObjectURL 已 mock）
 *   e. 图例条含逻辑桥符号（⇒ ↔ → ＋ :）
 *
 * 跑：node tests/qa-v229.test.mjs（需要 npm i --no-save jsdom@16）
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

// 带 header / 逐句区 / 挖空 / 钩子链 / 页脚的完整假文章（quick3 依赖 header 存在）
const fakeArticle = `
<header><h1>测试文章背诵方案</h1><p>议论文 · 2 句</p></header>
<h2>1. 整体策略</h2><p>策略</p>
<h2>2. 文章结构图</h2><p>图</p>
<h2>3. 今日任务</h2><p>任务</p>
<h2>4. 关键词串联表</h2><p>表</p>
<div class="legend"><span><b style="color:#d97706">⌒</b> 连读</span><span>⇒</span></div>
<div class="sent"><div class="sent-en">This is a <span class="tie">⌒</span> simple sentence.</div><div class="sent-zh">这是一个简单的句子。</div></div>
<div class="sent"><div class="sent-en">Memory hooks chain every idea.</div><div class="sent-zh">记忆钩子把每个想法串成链。</div></div>
<h2>11. 挖空自测</h2>
<p>This is a ______ sentence about ______ hooks.</p>
<details class="answer-toggle"><summary>▶ 查看本段答案</summary><div class="answer">答案：simple / memory</div></details>
<h2>15. 记忆钩子（跨段总链）</h2>
<div class="hook-chain"><span class="seg">段钩</span><span class="bridge">⇒</span><span class="seg">句钩</span><span class="anchor">[anchor]</span></div>
<h2>17. 记忆宫殿映射</h2>
<div class="card">
<div class="palace-route">
  <div class="palace-stop"><span class="st-no">1</span><div class="st-name">站1·家门</div><div class="st-hook">钩子A</div></div>
  <div class="palace-stop"><span class="st-no">2</span><div class="st-name">站2·鞋柜</div><div class="st-hook">钩子B</div></div>
  <div class="palace-stop"><span class="st-no">3</span><div class="st-name">站3·沙发</div><div class="st-hook">钩子C</div></div>
</div>
</div>
<footer>测试页脚</footer>
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
  // 默认让 TTS 可用（只缺录音），便于分别验证两条分支
  if (opts.noTTS) { try { delete w.speechSynthesis; } catch (e) {} }
  else { w.speechSynthesis = { getVoices: () => [], speak: () => {}, cancel: () => {} }; }
  if (opts.fullCaps) {
    w.MediaRecorder = function MediaRecorder() {};
    try {
      Object.defineProperty(w.navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.resolve({}) }, configurable: true });
    } catch (e) {}
  }
  const alerts = [];
  w.alert = (m) => alerts.push(String(m));
  w.confirm = () => true;
  // 捕获下载（a.click）
  const downloads = [];
  const origClick = w.HTMLAnchorElement.prototype.click;
  w.HTMLAnchorElement.prototype.click = function () {
    if (this.download) downloads.push({ name: this.download, href: this.href });
    else origClick.call(this);
  };
  if (opts.preload) {
    Object.entries(opts.preload).forEach(([k, v]) => {
      try { w.localStorage.setItem(k, String(v)); } catch (e) {}
    });
  }
  const wrap = w.document.querySelector('.wrap');
  if (wrap && opts.replaceWrap !== null) wrap.innerHTML = opts.replaceWrap === undefined ? fakeArticle : opts.replaceWrap;
  const scriptBlocks = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  const allScripts = scriptBlocks.join('\n;\n');
  try { w.eval(allScripts); } catch (e) {
    console.error('eval error:', e.message);
    process.exit(1);
  }
  await new Promise(r => setTimeout(r, 80));
  return { w, doc: w.document, alerts, downloads };
}

console.log('\n== v2.29.0 入门减负三件套（3 步快背 / 能力横幅 / Anki 导出）运行时验证 ==');

// ── 静态：锚点与关键类名/符号 ──
ok((template.match(/EMM_QUICK3_V229/g) || []).length === 1, 'EMM_QUICK3_V229 锚点恰好 1 次');
ok((template.match(/EMM_CAP_V229/g) || []).length === 1, 'EMM_CAP_V229 锚点恰好 1 次');
ok((template.match(/EMM_ANKI_V229/g) || []).length === 1, 'EMM_ANKI_V229 锚点恰好 1 次');
ok(/emm-quick3/.test(template) && /emm-cap/.test(template), '模板含 quick3 / cap 样式与类名');
ok(/rv-anki/.test(template) && /exportAnki/.test(template) && /data-ans/.test(template), '模板含 Anki 导出按钮 + exportAnki + data-ans');
ok(/⇒/.test(template) && /↔/.test(template) && /→/.test(template), '图例条含逻辑桥符号 ⇒ ↔ →');

// ── A. 3 步快背卡 + 页脚版本戳 ──
{
  const { doc } = await boot({});
  const q3 = doc.getElementById('emm-quick3');
  ok(!!q3, '首屏注入「3 步快背」卡');
  const header = doc.querySelector('header');
  ok(!!header && header.nextElementSibling === q3, '快背卡位于 header 之后（首屏可见）');
  const steps = q3 ? q3.querySelectorAll('ol li') : [];
  ok(steps.length === 3, `快背卡共 3 步（actual ${steps.length}）`);
  ok(/听读/.test(q3.textContent) && /钩子链/.test(q3.textContent) && /复述打卡/.test(q3.textContent), '3 步内容 = 听读 → 钩子链 → 复述打卡');
  const jumps = q3 ? q3.querySelectorAll('.q3-jump') : [];
  ok(jumps.length === 3, `3 个跳转按钮（actual ${jumps.length}）`);
  let threw = false;
  try { jumps.forEach(b => b.click()); } catch (e) { threw = true; }
  ok(!threw, '跳转按钮点击不抛错（scrollIntoView 在 jsdom 缺省时被守卫）');
  const ft = doc.querySelector('footer');
  ok(!!ft && /v2\.29\.0/.test(ft.textContent), '页脚自动渲染版本戳 v2.29.0');
}

// ── B. 能力横幅：缺录音 → 出现 + 可关闭 + 持久化 ──
{
  const { doc, w } = await boot({});
  const cap = doc.getElementById('emm-cap');
  ok(!!cap, '缺录音能力时横幅出现');
  ok(!!cap && /影子跟读/.test(cap.textContent) && /替代做法/.test(cap.textContent), '横幅列明受影响功能 + 替代做法');
  const dis = cap && cap.querySelector('.cap-dismiss');
  ok(!!dis, '横幅含「知道了」关闭按钮');
  dis.click();
  ok(!doc.getElementById('emm-cap'), '点击后横幅移除');
  ok(w.localStorage.getItem('emm-cap-dismissed') === '1', '关闭状态写入 localStorage');
}
{
  // 预置已关闭 → 不再出现
  const { doc } = await boot({ preload: { 'emm-cap-dismissed': '1' } });
  ok(!doc.getElementById('emm-cap'), '预置 emm-cap-dismissed=1 时横幅不出现');
}
{
  // 无 TTS 时横幅同时列出听写
  const { doc } = await boot({ noTTS: true });
  const cap = doc.getElementById('emm-cap');
  ok(!!cap && /听写/.test(cap.textContent), '无 speechSynthesis 时横幅列出「听写」不可用');
}
{
  // 全能力 → 无横幅
  const { doc } = await boot({ fullCaps: true });
  ok(!doc.getElementById('emm-cap'), 'TTS+录音+存储全可用时不弹横幅');
}

// ── C. Anki 导出 ──
{
  const { doc, alerts, downloads } = await boot({});
  const btn = doc.querySelector('.rv-btn.rv-anki');
  ok(!!btn, '复习条含「🗂 Anki」导出按钮');
  const inputs = doc.querySelectorAll('.emm-clz');
  ok(inputs.length === 2, `挖空输入框已交互化（actual ${inputs.length}）`);
  const ansOk = Array.from(inputs).every(i => i.getAttribute('data-ans'));
  ok(ansOk, '每个挖空输入框带 data-ans 答案属性');
  btn.click();
  const last = alerts[alerts.length - 1] || '';
  ok(/已导出 \d+ 张卡片/.test(last), `点击导出弹卡片数提示（actual: ${last.slice(0, 40)}）`);
  ok(downloads.length >= 1 && /-emm-anki-\d{4}-\d{2}-\d{2}\.csv$/.test(downloads[downloads.length - 1].name), '下载文件名为 <篇名>-emm-anki-<日期>.csv');
}

// ── D. 记忆宫殿路线引导 ──
{
  const { doc, w } = await boot({});
  ok((template.match(/EMM_PALACE_V229/g) || []).length === 1, 'EMM_PALACE_V229 锚点恰好 1 次');
  const onboard = doc.getElementById('emm-palace-onboard');
  ok(!!onboard, '首次访问（无路线）显示宫殿引导条');
  ok(!!doc.querySelector('.emm-palace-manage'), '宫殿区有常驻「重新定义路线」入口');
  onboard.querySelector('.emm-palace-go').click();
  const ed = doc.getElementById('emm-palace-editor');
  ok(!!ed, '点击「定义我的路线」打开编辑器');
  const ta = ed && ed.querySelector('.emm-palace-ta');
  ok(!!ta && /家门/.test(ta.value), '编辑器预填当前站点名');
  ta.value = '玄关\n沙发\n书桌';
  ed.querySelector('.emm-palace-save').click();
  const saved = JSON.parse(w.localStorage.getItem('emm-palace-route') || '[]');
  ok(saved.length === 3 && saved[0] === '玄关', '保存后路线写入 localStorage');
  const names = Array.from(doc.querySelectorAll('.palace-stop .st-name')).map(n => n.textContent);
  ok(names[0] === '玄关' && names[1] === '沙发' && names[2] === '书桌', '保存后站点名立即套用');
  ok(!doc.getElementById('emm-palace-onboard'), '保存路线后引导条消失');
}
{
  // 预置路线：打开即自动套用 + 不弹引导
  const { doc } = await boot({ preload: { 'emm-palace-route': '["玄关","沙发","书桌"]' } });
  const names = Array.from(doc.querySelectorAll('.palace-stop .st-name')).map(n => n.textContent);
  ok(names[0] === '玄关', '预置路线时打开即自动套用站点名');
  ok(!doc.getElementById('emm-palace-onboard'), '已有路线时不弹引导条');
}
{
  // 跳过引导：持久化不再显示
  const { doc, w } = await boot({});
  doc.getElementById('emm-palace-onboard').querySelector('.emm-palace-skip').click();
  ok(!doc.getElementById('emm-palace-onboard'), '「先用默认路线」移除引导条');
  ok(w.localStorage.getItem('emm-palace-onboard-dismissed') === '1', '跳过状态写入 localStorage');
}

console.log(`\n结果: ${passed} 通过, ${failed} 失败`);
process.exit(failed ? 1 : 0);

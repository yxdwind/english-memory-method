/**
 * v2.23 EMM_QUALITY_V223 内容质量大礼包 · 运行时验证
 *
 * 验证：
 *   a. 多段文章渲染时仪表盘有「按段统计」表（4 列：段/句/薄弱/耗时）
 *   b. 单段文章不渲染「按段统计」
 *   c. state.segTimes 记录勾选时间
 *   e. ?check=1 内容可疑项：译文长度比、IPA 中文检测、连读覆盖率
 *   f. SKILL.md 含 Step 0 模式识别表格
 *
 * 跑：node tests/qa-v223.test.mjs（需要 npm i --no-save jsdom@16）
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
const template = fs.readFileSync(path.join(ROOT, 'skills', 'english-memory-method', 'assets', 'plan-template.html'), 'utf8');
const skillMd = fs.readFileSync(path.join(ROOT, 'SKILL.md'), 'utf8');

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

const fakeArticleTwoSeg = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4.1 第1段</h2>
    <div class="sent"><div class="sent-en">First sentence.</div><div class="sent-zh">第一句。</div>
        <div class="pron"><span class="lbl">连读</span>First sentence · 连读</div></div>
  <h2>4.2 第2段</h2>
    <div class="sent"><div class="sent-en">Second sentence.</div><div class="sent-zh">第二句。</div>
        <div class="pron"><span class="lbl">弱读</span>Second · 弱读</div></div>
`;

const fakeArticleSingle = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4. 原文逐句精读</h2>
    <div class="sent"><div class="sent-en">Only one sentence.</div><div class="sent-zh">唯一一句。</div>
        <div class="pron"><span class="lbl">连读</span>Only · 连读</div></div>
`;

const fakeArticleBadTrans = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4. 原文逐句精读</h2>
    <div class="sent"><div class="sent-en">The cat sat on the mat.</div><div class="sent-zh">猫</div>
        <div class="pron"><span class="lbl">连读</span>cat on · /kæt ɑn/</div></div>
`;

const fakeArticleBadIPA = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4. 原文逐句精读</h2>
    <div class="sent"><div class="sent-en">Test sentence here.</div><div class="sent-zh">测试句。</div>
        <div class="pron"><span class="lbl">连读</span>连读 /错的中文/</div></div>
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
  w.alert = opts.alert || (() => {});
  w.confirm = opts.confirm || (() => true);
  if (opts.preload) {
    Object.entries(opts.preload).forEach(([k, v]) => {
      try { w.localStorage.setItem(k, String(v)); } catch (e) {}
    });
  }
  const wrap = w.document.querySelector('.wrap');
  if (wrap && opts.replaceWrap) wrap.innerHTML = opts.replaceWrap;
  const scriptBlocks = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  try { w.eval(scriptBlocks.join('\n;\n')); } catch (e) { console.error('eval error:', e.message); process.exit(1); }
  await new Promise(r => setTimeout(r, 80));
  return { w, doc: w.document };
}

function progKey(doc) {
  var h = doc.querySelector('h1');
  return 'emm-progress:' + (h ? h.textContent.trim().slice(0, 40) : (doc.title || '').slice(0, 40) || 'plan');
}

console.log('\n== v2.23 EMM_QUALITY_V223 内容质量大礼包 运行时验证 ==');

// A. 多段文章渲染时仪表盘有「按段统计」表
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleTwoSeg });
  const dash = doc.querySelector('.rv-dash').innerHTML;
  ok(/按段统计/.test(dash), '仪表盘含「按段统计」标题');
  const tableMatch = dash.match(/按段统计[\s\S]+?<table[^>]*>([\s\S]+?)<\/table>/);
  ok(!!tableMatch, '仪表盘含 4 列表格');
  if (tableMatch) {
    var headers = tableMatch[1].match(/<th[^>]*>([^<]+)<\/th>/g) || [];
    var cols = headers.map(function(h){ return h.replace(/<[^>]+>/g, ''); });
    ok(cols.includes('段') && cols.includes('句') && cols.includes('薄弱') && cols.includes('耗时'),
      `表头为「段/句/薄弱/耗时」（actual: ${cols.join('/')}）`);
  }
  // 应有 2 行
  const rows = doc.querySelectorAll('.rv-dash table tbody tr');
  ok(rows.length === 2, `2 段文章渲染 2 行统计（actual ${rows.length}）`);
}

// B. 单段文章不渲染「按段统计」
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleSingle });
  const dash = doc.querySelector('.rv-dash').innerHTML;
  ok(!/按段统计/.test(dash), '单段文章不显示「按段统计」');
}

// C. state.segTimes 记录勾选时间
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleTwoSeg });
  const firstCheck = doc.querySelector('.emm-donechk');
  firstCheck.click();
  await new Promise(r => setTimeout(r, 30));
  const stored = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  ok(stored.segTimes && stored.segTimes[0] && stored.segTimes[0].startTs, 'state.segTimes[0].startTs 记录');
  ok(typeof stored.segTimes[0].startTs === 'number' && stored.segTimes[0].startTs > 0, 'startTs 是合法时间戳');
}

// D. 薄弱率：state.weak 里有 1 句 → 第 1 段 100% 薄弱
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleTwoSeg, preload: {
    'emm-progress:{{TITLE}}背诵方案': JSON.stringify({ weak: { 0: true }, done: {}, rounds: [], fingerprint: '', srMode: 'light' })
  }});
  const html = doc.querySelector('.rv-dash').innerHTML;
  ok(/100%/.test(html), '第 1 段薄弱率 100%');
}

// E1. ?check=1 译文长度比：偏短
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleBadTrans, query: '?check=1' });
  const rpt = doc.querySelector('.emm-check-rpt');
  ok(!!rpt && /内容可疑项/.test(rpt.textContent), '?check=1 报告含「内容可疑项」节');
  ok(/译文偏短/.test(rpt.textContent), '译文偏短被标 ⚠');
  ok(/译文长度比合理/.test(rpt.textContent), '译文长度比统计行存在');
}

// E2. ?check=1 IPA 含中文
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleBadIPA, query: '?check=1' });
  const rpt = doc.querySelector('.emm-check-rpt');
  ok(/IPA 含中文/.test(rpt.textContent), 'IPA 含中文被标 ⚠');
}

// E3. ?check=1 连读覆盖率
{
  const { w, doc } = await boot({ replaceWrap: fakeArticleSingle, query: '?check=1' });
  const rpt = doc.querySelector('.emm-check-rpt');
  ok(/连读注解覆盖/.test(rpt.textContent), '连读覆盖率行存在');
  ok(/连读注解覆盖 1 \/ 1/.test(rpt.textContent), '单句单段覆盖 100%');
}

// F. SKILL.md 含 Step 0 模式识别
ok(/### Step 0.*模式识别/.test(skillMd), 'SKILL.md 含 Step 0 模式识别');
ok(/短文.*长文.*演讲稿/.test(skillMd), 'SKILL.md 模式识别含三类体裁');
ok(/演讲骨架|长文段落单元/.test(skillMd), 'SKILL.md 模式识别列出专属组件');

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);
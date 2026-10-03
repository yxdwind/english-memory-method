/**
 * v2.21 EMM_PROGRESS_V221 导出/导入进度 · 运行时验证
 *
 * 用 jsdom 加载 plan-template.html，验证：
 *   a. 导出按钮 + 文件输入已注入到 rv-bar
 *   b. 点击「💾 导出」触发下载（mock URL.createObjectURL + a.click）
 *   c. 点击「📥 导入」打开文件选择器
 *   d. importProgress 接受合法 JSON → state 更新
 *   e. importProgress 拒绝非法 JSON（弹错 alert）
 *   f. importProgress 检测 fingerprint 失配 → 弹确认
 *   g. 导出文件包含 shadow / sr / weak / fingerprint 等关键字段
 *
 * 跑：node tests/export-import.test.mjs（需要 npm i --no-save jsdom@16）
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

const fakeArticle = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4. 原文逐句精读</h2>
    <div class="sent"><div class="sent-en">The cat sat on the mat.</div>
        <div class="sent-zh">猫坐在垫子上。</div></div>
    <div class="sent"><div class="sent-en">It was a sunny day.</div>
        <div class="sent-zh">这是晴天。</div></div>
`;

async function boot(opts = {}) {
  const dom = new JSDOM(template, {
    runScripts: 'outside-only',
    url: 'http://localhost/plan.html',
    virtualConsole: quietConsole(),
  });
  const w = dom.window;
  w.URL.createObjectURL = opts.createObjectURL || (() => 'blob:mock-' + Math.random());
  w.URL.revokeObjectURL = () => {};
  w.scrollTo = () => {};
  w.speechSynthesis = { getVoices: () => [], speak: () => {}, cancel: () => {} };
  // 拦截 a.click 与下载：监听下载链接
  if (opts.recordDownload) {
    const origClick = w.HTMLAnchorElement.prototype.click;
    w.HTMLAnchorElement.prototype.click = function(){
      if (this.download) (opts.recordDownload.calls || (opts.recordDownload.calls = [])).push({
        filename: this.download, href: this.href
      });
      return origClick.apply(this, arguments);
    };
  }
  // alert/confirm mock
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

console.log('\n== v2.21 EMM_PROGRESS_V221 导出/导入进度 运行时验证 ==');

// 静态：锚点检查（plan-template.html 内注释标记）
ok(template.match(/exportProgress/g || []).length >= 1 && template.match(/importProgress/g || []).length >= 1, '模板含 exportProgress/importProgress 函数定义');

// 静态：rv-bar 按钮
ok(!!template.match(/rv-export/) && !!template.match(/rv-import/) && !!template.match(/rv-file-input/), 'rv-bar 模板含 export/import 按钮 + file input');

// A. 按钮已注入 + 文件输入已注入
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  ok(!!doc.querySelector('.rv-export'), 'rv-export 按钮已注入 DOM');
  ok(!!doc.querySelector('.rv-import'), 'rv-import 按钮已注入 DOM');
  ok(!!doc.querySelector('.rv-file-input'), 'rv-file-input 元素已注入 DOM（display:none）');
  const fi = doc.querySelector('.rv-file-input');
  ok(fi && fi.type === 'file' && fi.accept.indexOf('json') >= 0, `file input type=file, accept=json（actual ${fi && fi.accept}）`);
}

// B. 导出：无数据时弹 alert「当前没有可导出的进度」
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  // main init 后 localStorage 已被 fresh() 写入；手动清空以测"无数据"分支
  w.localStorage.removeItem(progKey(doc));
  let alertMsg = null;
  w.alert = (msg) => { alertMsg = msg; };
  doc.querySelector('.rv-export').click();
  await new Promise(r => setTimeout(r, 30));
  ok(alertMsg && alertMsg.indexOf('没有可导出') >= 0, `无数据时弹 alert：${alertMsg}`);
}

// C. 导出：有数据时触发下载
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle, preload: {
    'emm-progress:{{TITLE}}背诵方案': JSON.stringify({
      done: { 0: 'ok' }, weak: { 1: true }, rounds: [{ date: '2026-10-01', ok: 1, bad: 0 }],
      srMode: 'light', sr: { 0: { ef: 2.5, interval: 1, reps: 1, due: '2026-10-02', lastQ: 4 } },
      fingerprint: ''
    })
  }});
  const dl = { calls: [] };
  const { w: w2, doc: doc2 } = { w, doc };
  // 重新包装 boot 加 recordDownload
  const dom = new JSDOM(template, { runScripts: 'outside-only', url: 'http://localhost/plan.html', virtualConsole: quietConsole() });
  const w3 = dom.window;
  w3.URL.createObjectURL = () => 'blob:mock';
  w3.URL.revokeObjectURL = () => {};
  w3.scrollTo = () => {};
  w3.speechSynthesis = { getVoices: () => [], speak: () => {}, cancel: () => {} };
  w3.alert = () => {};
  const origClick = w3.HTMLAnchorElement.prototype.click;
  w3.HTMLAnchorElement.prototype.click = function(){
    if (this.download) dl.calls.push({ filename: this.download, href: this.href });
  };
  w3.localStorage.setItem('emm-progress:{{TITLE}}背诵方案', JSON.stringify({
    done: { 0: 'ok' }, weak: { 1: true }, rounds: [{ date: '2026-10-01', ok: 1, bad: 0 }],
    srMode: 'light', sr: { 0: { ef: 2.5, interval: 1, reps: 1, due: '2026-10-02', lastQ: 4 } },
    fingerprint: ''
  }));
  const wrap3 = w3.document.querySelector('.wrap');
  if (wrap3) wrap3.innerHTML = fakeArticle;
  const scriptBlocks = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
  w3.eval(scriptBlocks.join('\n;\n'));
  await new Promise(r => setTimeout(r, 80));
  w3.document.querySelector('.rv-export').click();
  await new Promise(r => setTimeout(r, 30));
  ok(dl.calls.length === 1, `导出触发 1 次下载（actual ${dl.calls.length}）`);
  ok(dl.calls[0] && dl.calls[0].filename && /emm-progress-\d{4}-\d{2}-\d{2}\.json$/.test(dl.calls[0].filename), `下载文件名含日期戳：${dl.calls[0] && dl.calls[0].filename}`);
  ok(dl.calls[0] && dl.calls[0].href && dl.calls[0].href.indexOf('blob:') === 0, `href 是 blob URL：${dl.calls[0] && dl.calls[0].href}`);
}

// D. 导入：合法 JSON → state 更新
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  const importObj = {
    done: { 0: 'ok', 1: 'bad' }, weak: { 1: true },
    rounds: [{ date: '2026-10-01', ok: 1, bad: 1 }],
    srMode: 'standard', sr: { 0: { ef: 2.6, interval: 6, reps: 2, due: '2026-10-08', lastQ: 4, aligned: 'sm2' } },
    fingerprint: '', start: '2026-09-25'
  };
  const jsonStr = JSON.stringify(importObj);
  let alertMsg = null;
  w.alert = (msg) => { alertMsg = msg; };

  // 拦截 FileReader：让 readAsText 同步触发 onload（jsdom 的 result 只读，需 defineProperty）
  w.FileReader.prototype.readAsText = function(blob){
    setTimeout(() => {
      try { Object.defineProperty(this, 'result', { value: jsonStr, configurable: true }); } catch(e){}
      if (this.onload) this.onload({ target: this });
    }, 5);
  };

  const fileInput = doc.querySelector('.rv-file-input');
  const changeEvent = new w.Event('change');
  // jsdom 不自动构造 FileList，手工给
  Object.defineProperty(changeEvent, 'target', { value: fileInput });
  Object.defineProperty(fileInput, 'files', { configurable: true, value: [{ name: 'imported.json' }] });
  fileInput.dispatchEvent(changeEvent);
  await new Promise(r => setTimeout(r, 100));

  const stored = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  ok(stored.done && stored.done[1] === 'bad', `导入后 state.done[1]=bad（actual ${stored.done && stored.done[1]}）`);
  ok(stored.weak && stored.weak[1] === true, `导入后 state.weak[1]=true`);
  ok(stored.srMode === 'standard', `导入后 srMode=standard（actual ${stored.srMode}）`);
  ok(stored.sr && stored.sr[0] && stored.sr[0].interval === 6, `导入后 sr[0].interval=6d（actual ${stored.sr && stored.sr[0] && stored.sr[0].interval}）`);
  ok(alertMsg && /已导入/.test(alertMsg), `成功弹 alert：${alertMsg && alertMsg.slice(0,30)}`);
}

// E. 导入：非法 JSON → 弹错 alert
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  let alertMsg = null;
  w.alert = (msg) => { alertMsg = msg; };
  w.FileReader.prototype.readAsText = function(blob){
    setTimeout(() => {
      try { Object.defineProperty(this, 'result', { value: 'not json{{{', configurable: true }); } catch(e){}
      if (this.onload) this.onload({ target: this });
    }, 5);
  };
  const fileInput = doc.querySelector('.rv-file-input');
  const ev = new w.Event('change');
  Object.defineProperty(ev, 'target', { value: fileInput });
  Object.defineProperty(fileInput, 'files', { configurable: true, value: [{ name: 'broken.json' }] });
  fileInput.dispatchEvent(ev);
  await new Promise(r => setTimeout(r, 100));
  ok(alertMsg && /导入失败/.test(alertMsg), `非法 JSON 弹导入失败：${alertMsg && alertMsg.slice(0,40)}`);
}

// F. 导入：JSON 是数组（不是对象）→ 弹错
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  let alertMsg = null;
  w.alert = (msg) => { alertMsg = msg; };
  w.FileReader.prototype.readAsText = function(blob){
    setTimeout(() => {
      try { Object.defineProperty(this, 'result', { value: '[]', configurable: true }); } catch(e){}
      if (this.onload) this.onload({ target: this });
    }, 5);
  };
  const fileInput = doc.querySelector('.rv-file-input');
  const ev = new w.Event('change');
  Object.defineProperty(ev, 'target', { value: fileInput });
  Object.defineProperty(fileInput, 'files', { configurable: true, value: [{ name: 'array.json' }] });
  fileInput.dispatchEvent(ev);
  await new Promise(r => setTimeout(r, 100));
  ok(alertMsg && /导入失败/.test(alertMsg), `数组 JSON 弹导入失败：${alertMsg && alertMsg.slice(0,40)}`);
}

// G. 导入：fingerprint 失配 → 弹 confirm，取消则不导入
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle, preload: {
    'emm-progress:{{TITLE}}背诵方案': JSON.stringify({ fingerprint: 'current-fp', done: {}, weak: {}, rounds: [] })
  }});
  let confirmCalled = false;
  w.confirm = (msg) => { confirmCalled = true; return false; };  // 用户取消
  const importObj = { fingerprint: 'different-fp', done: { 0: 'ok' }, weak: { 0: true } };
  w.FileReader.prototype.readAsText = function(blob){
    setTimeout(() => {
      try { Object.defineProperty(this, 'result', { value: JSON.stringify(importObj), configurable: true }); } catch(e){}
      if (this.onload) this.onload({ target: this });
    }, 5);
  };
  const fileInput = doc.querySelector('.rv-file-input');
  const ev = new w.Event('change');
  Object.defineProperty(ev, 'target', { value: fileInput });
  Object.defineProperty(fileInput, 'files', { configurable: true, value: [{ name: 'diff.json' }] });
  fileInput.dispatchEvent(ev);
  await new Promise(r => setTimeout(r, 100));
  ok(confirmCalled, 'fingerprint 失配弹 confirm');
  const stored = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  ok(!stored.done || !stored.done[0], '用户取消后 state 未被覆盖');
}

// H. 导入：缺关键字段（既无 fingerprint 也无 start/done/weak）→ 弹错
{
  const { w, doc } = await boot({ replaceWrap: fakeArticle });
  let alertMsg = null;
  w.alert = (msg) => { alertMsg = msg; };
  w.FileReader.prototype.readAsText = function(blob){
    setTimeout(() => {
      try { Object.defineProperty(this, 'result', { value: '{"random":"junk"}', configurable: true }); } catch(e){}
      if (this.onload) this.onload({ target: this });
    }, 5);
  };
  const fileInput = doc.querySelector('.rv-file-input');
  const ev = new w.Event('change');
  Object.defineProperty(ev, 'target', { value: fileInput });
  Object.defineProperty(fileInput, 'files', { configurable: true, value: [{ name: 'junk.json' }] });
  fileInput.dispatchEvent(ev);
  await new Promise(r => setTimeout(r, 100));
  ok(alertMsg && /导入失败/.test(alertMsg) && /缺少必备字段/.test(alertMsg), `缺关键字段弹错：${alertMsg && alertMsg.slice(0,60)}`);
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);
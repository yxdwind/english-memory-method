/**
 * tests/helpers/boot.mjs · 共享测试 harness（v2.30.3 起）
 *
 * 深模块目标：JSDOM 装配、浏览器 API mock、localStorage 预置、脚本 eval、
 * 等待节拍——这些基础设施只实现一次；各测试文件保留自己的 fakeArticle /
 * fixture / 断言，boot() 退化为几行的本地组装。
 *
 * 注意：
 *  - PLAN_TEMPLATE / LIB_TEMPLATE 读 assets/ 主副本（version-check 保证与 skills/ 副本逐字节一致）。
 *  - bootCore 默认 eval 全部 <script> 块（词法作用域必须一次性拼接，见 shadow-runtime 注释）；
 *    需要单块 eval 的测试（如 fold）传 evalScripts: 'none' 后自行 eval。
 *  - smoke.test.js 为 CJS 旧套件，保留自带 harness，不迁移（见 CHANGELOG v2.30.3）。
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

// 二级窗口（跨刷新/跨页面检查）直接用：export let 的活绑定在动态导入完成后已就绪
export { JSDOM, VirtualConsole };

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

export const PLAN_TEMPLATE = fs.readFileSync(path.join(ROOT, 'assets', 'plan-template.html'), 'utf8');
export const LIB_TEMPLATE = fs.readFileSync(path.join(ROOT, 'assets', 'library-template.html'), 'utf8');

export function quietConsole({ forward } = {}) {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/^Not implemented/.test(e.message || '')) console.error('jsdomError:', e.message); });
  if (forward) {
    vc.on('error', (...args) => console.error('[js]', ...args));
    vc.on('warn', (...args) => console.warn('[js]', ...args));
    vc.on('log', (...args) => console.log('[js]', ...args));
  }
  return vc;
}

export function scriptBlocks(tpl) {
  return [...tpl.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]);
}

export function evalAllScripts(w, tpl) {
  try {
    w.eval(scriptBlocks(tpl).join('\n;\n'));
  } catch (e) {
    console.error('eval error:', e.message);
    process.exit(1);
  }
}

export const tick = (ms = 80) => new Promise(r => setTimeout(r, ms));

export function dstr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}

export function progKeyOfDoc(doc) {
  const h = doc.querySelector('h1');
  return 'emm-progress:' + (h ? h.textContent.trim().slice(0, 40) : (doc.title || '').slice(0, 40) || 'plan');
}

// ── 可控 SpeechRecognition mock（qa-v229 全能力 / qa-v230 自动评分共用）──
export class FakeSR {
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
export function resetSR() { FakeSR.instances = []; FakeSR.started = 0; FakeSR.stopped = 0; }

// ── 方案页 boot 基础设施（不 eval 也可以：evalScripts:'none'）──────────────
// opts:
//   query           URL 追加串
//   noTTS           删除 speechSynthesis（能力横幅分支）
//   recordSpeak     {calls:[]} → speak 捕获朗读文本（shadow）
//   fullCaps        MediaRecorder + getUserMedia + SpeechRecognition 全配齐
//   withSR          仅配 SpeechRecognition（自动评分）
//   preload         { key: value } → localStorage 预置（对象自动 JSON.stringify）
//   replaceWrap     string → 替换 .wrap 内容；null → 明确跳过；undefined → 不动
//   prefix          前置注入 .wrap 内容
//   alert           fn → 直接接管 w.alert；否则捕获进 alerts
//   confirm         fn → 接管 w.confirm；默认 () => true
//   captureDownloads / recordDownload  下载捕获
//   createObjectURL 自定义 blob mock
//   evalScripts     'all'（默认）| 'none'
//   forwardConsole  转发页面内 console（shadow/sr 原行为）
//   wait            eval 后等待毫秒（默认 80；shadow 用 100）
export async function bootCore(opts = {}) {
  const dom = new JSDOM(PLAN_TEMPLATE, {
    runScripts: 'outside-only',
    url: 'http://localhost/plan.html' + (opts.query || ''),
    virtualConsole: quietConsole({ forward: opts.forwardConsole }),
  });
  const w = dom.window;
  w.URL.createObjectURL = opts.createObjectURL || (() => 'blob:mock');
  w.URL.revokeObjectURL = () => {};
  w.scrollTo = () => {};
  w.scrollBy = () => {};
  if (opts.noTTS) { try { delete w.speechSynthesis; } catch (e) {} }
  else if (opts.recordSpeak) {
    w.speechSynthesis = {
      getVoices: () => [],
      speak: (u) => { (opts.recordSpeak.calls || (opts.recordSpeak.calls = [])).push(u.text); },
      cancel: () => {},
    };
  } else {
    w.speechSynthesis = { getVoices: () => [], speak: () => {}, cancel: () => {} };
  }
  if (opts.fullCaps) {
    w.MediaRecorder = function MediaRecorder() {};
    try {
      Object.defineProperty(w.navigator, 'mediaDevices', { value: { getUserMedia: () => Promise.resolve({}) }, configurable: true });
    } catch (e) {}
  }
  if (opts.withSR || opts.fullCaps) w.SpeechRecognition = FakeSR;
  const alerts = [], downloads = [];
  w.alert = (typeof opts.alert === 'function') ? opts.alert : (m) => alerts.push(String(m));
  w.confirm = opts.confirm || (() => true);
  if (opts.captureDownloads || opts.recordDownload) {
    const origClick = w.HTMLAnchorElement.prototype.click;
    w.HTMLAnchorElement.prototype.click = function () {
      if (this.download) {
        const rec = { name: this.download, href: this.href, filename: this.download };
        downloads.push(rec);
        if (opts.recordDownload) (opts.recordDownload.calls || (opts.recordDownload.calls = [])).push(rec);
      } else {
        return origClick.apply(this, arguments);
      }
    };
  }
  if (opts.preload) {
    Object.entries(opts.preload).forEach(([k, v]) => {
      try { w.localStorage.setItem(k, String(v)); } catch (e) {}
    });
  }
  const wrap = w.document.querySelector('.wrap');
  if (wrap && typeof opts.replaceWrap === 'string') wrap.innerHTML = opts.replaceWrap;
  else if (wrap && opts.prefix) wrap.innerHTML = opts.prefix + wrap.innerHTML;
  if (opts.evalScripts !== 'none') evalAllScripts(w, PLAN_TEMPLATE);
  await tick(opts.wait || 80);
  return { w, dom, doc: w.document, alerts, downloads };
}

// ── 记忆库 boot + 填充 ──────────────────────────────────────────────
export function fillLib(articles, date) {
  return LIB_TEMPLATE
    .replace('{{DATE}}', date || '2026-10-16')
    .replace('{{ARTICLES}}', articles.map(a => JSON.stringify(a)).join(',\n'));
}

export async function bootLib(articles, opts = {}) {
  const html = fillLib(articles, opts.date);
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'http://localhost/memory-library.html' + (opts.query || ''),
    virtualConsole: quietConsole({ forward: opts.forwardConsole }),
  });
  const w = dom.window;
  w.Element.prototype.scrollIntoView = () => {};
  w.scrollTo = () => {};
  if (opts.seed) {
    Object.entries(opts.seed).forEach(([k, v]) => {
      w.localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v));
    });
  }
  evalAllScripts(w, html);
  await tick(opts.wait || 80);
  return { w, doc: w.document };
}

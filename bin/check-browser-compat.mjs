#!/usr/bin/env node
/**
 * bin/check-browser-compat.mjs · v2.27
 *
 * 静态扫描 plan-template.html + library-template.html 中用到的 Web API，
 * 对照 Chrome/Firefox/Safari/Edge 兼容性矩阵，给出 ⚠ / ✅ 报告。
 *
 * 用法：
 *   node bin/check-browser-compat.mjs          # 报告（退出码 0）
 *   node bin/check-browser-compat.mjs --strict # 有 ⚠ 时退出码 1（CI 友好）
 *
 * 零依赖（node:fs + node:path）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const args = process.argv.slice(2);
const strict = args.includes('--strict');

// ── 兼容性矩阵 ──────────────────────────────────────────
// 来源：MDN / caniuse.com / 实际生产环境验证（2026-10 截至）
// 注释：✅ 全版本支持；⚠ 部分版本支持/有限制；✗ 不支持
const MATRIX = {
  'speechSynthesis':            { ch: { v: 33, s: '✅' }, ff: { v: 49, s: '⚠ voices 列表可能为空/不全' }, sf: { v: 7, s: '✅' }, ie: { v: 79, s: '✅' }, notes: 'Firefox voices 数组可能为空，UI 需要 try/catch' },
  'SpeechSynthesisUtterance':  { ch: { v: 33, s: '✅' }, ff: { v: 49, s: '⚠' }, sf: { v: 7, s: '✅' }, ie: { v: 79, s: '✅' }, notes: '同 speechSynthesis' },
  'MediaRecorder':              { ch: { v: 47, s: '✅' }, ff: { v: 25, s: '✅' }, sf: { v: 14.1, s: '⚠ iOS 14.1+ 才支持；老 iOS 无' }, ie: { v: 79, s: '✅' }, notes: 'Safari 旧版本不支持 → 优雅降级到手动自评（v2.19 已实现）' },
  'getUserMedia':               { ch: { v: 53, s: '✅' }, ff: { v: 36, s: '✅' }, sf: { v: 11, s: '✅ HTTPS only' }, ie: { v: 12, s: '✅' }, notes: '必须 HTTPS 或 localhost（除 Chrome 允许 file://）' },
  'navigator.mediaDevices':     { ch: { v: 53, s: '✅' }, ff: { v: 36, s: '✅' }, sf: { v: 11, s: '✅' }, ie: { v: 12, s: '✅' }, notes: 'getUserMedia 同步检查' },
  'Blob':                       { ch: { v: 20, s: '✅' }, ff: { v: 13, s: '✅' }, sf: { v: 6, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '全部支持' },
  'FileReader':                 { ch: { v: 6, s: '✅' }, ff: { v: 3.6, s: '✅' }, sf: { v: 6, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '全部支持' },
  'URL.createObjectURL':        { ch: { v: 19, s: '✅' }, ff: { v: 19, s: '✅' }, sf: { v: 6, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '注意 revoke 避免内存泄漏' },
  'URL.revokeObjectURL':        { ch: { v: 19, s: '✅' }, ff: { v: 19, s: '✅' }, sf: { v: 6, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'Intl.DateTimeFormat':        { ch: { v: 24, s: '✅' }, ff: { v: 29, s: '✅' }, sf: { v: 10, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '全部支持' },
  'localStorage':               { ch: { v: 4, s: '✅' }, ff: { v: 3.5, s: '✅' }, sf: { v: 4, s: '✅' }, ie: { v: 12, s: '✅' }, notes: 'file:// 协议配额：Chrome 5MB / Firefox 10MB / Edge 10MB；Safari ≤5MB；超量需 try/catch（已实现）' },
  'Promise':                     { ch: { v: 33, s: '✅' }, ff: { v: 29, s: '✅' }, sf: { v: 8, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'scrollIntoView':              { ch: { v: 61, s: '✅ smooth' }, ff: { v: 36, s: '✅ smooth' }, sf: { v: 14, s: '✅ smooth' }, ie: { v: 79, s: '✅ smooth' }, notes: 'Safari < 14 接受 options 但 silent fallback' },
  'MutationObserver':           { ch: { v: 26, s: '✅' }, ff: { v: 14, s: '✅' }, sf: { v: 9.1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'IntersectionObserver':       { ch: { v: 51, s: '✅' }, ff: { v: 55, s: '✅' }, sf: { v: 12.1, s: '⚠' }, ie: { v: 15, s: '✅' }, notes: '未在当前模板中使用' },
  'addEventListener':           { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'confirm':                    { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '⚠ popup 禁用时被 block' }, ie: { v: 12, s: '✅' }, notes: 'iOS Safari popup blocking；用户首次交互后才能 confirm' },
  'alert':                      { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '⚠ popup 禁用时被 block' }, ie: { v: 12, s: '✅' }, notes: '同 confirm' },
  'setTimeout':                 { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'setInterval':                { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'Object.assign':              { ch: { v: 45, s: '✅' }, ff: { v: 34, s: '✅' }, sf: { v: 9, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'Object.keys':                { ch: { v: 5, s: '✅' }, ff: { v: 4, s: '✅' }, sf: { v: 5, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'Object.values':              { ch: { v: 54, s: '✅' }, ff: { v: 47, s: '✅' }, sf: { v: 10.1, s: '✅' }, ie: { v: 14, s: '✅' }, notes: '' },
  'JSON.parse':                 { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '必须 try/catch（已实现）' },
  'JSON.stringify':             { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'encodeURIComponent':         { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'decodeURIComponent':         { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'Date.now':                   { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'Math.max':                   { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'Math.min':                   { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'Math.round':                 { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'padStart':                   { ch: { v: 57, s: '✅' }, ff: { v: 48, s: '✅' }, sf: { v: 10, s: '✅' }, ie: { v: 79, s: '✅' }, notes: 'Safari 10.0+ 含，9.x 无' },
  'Array.prototype.includes':    { ch: { v: 47, s: '✅' }, ff: { v: 43, s: '✅' }, sf: { v: 9, s: '✅' }, ie: { v: 14, s: '✅' }, notes: '' },
  'Array.prototype.find':       { ch: { v: 45, s: '✅' }, ff: { v: 25, s: '✅' }, sf: { v: 8, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'querySelector':              { ch: { v: 1, s: '✅' }, ff: { v: 3.5, s: '✅' }, sf: { v: 3.1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'querySelectorAll':           { ch: { v: 1, s: '✅' }, ff: { v: 3.5, s: '✅' }, sf: { v: 3.1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'getElementById':             { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'createElement':              { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'appendChild':                { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'removeChild':                { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'insertBefore':              { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'setAttribute':               { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'getAttribute':               { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'getUTCFullYear':             { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'getUTCMonth':                { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'getUTCDate':                 { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'getUTCHours':                { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'getUTCMinutes':              { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' },
  'getUTCSeconds':              { ch: { v: 1, s: '✅' }, ff: { v: 1, s: '✅' }, sf: { v: 1, s: '✅' }, ie: { v: 12, s: '✅' }, notes: '' }
};

// ── 扫描 ────────────────────────────────────────────
const planTpl = fs.readFileSync(path.join(ROOT, 'skills', 'english-memory-method', 'assets', 'plan-template.html'), 'utf8');
const libTpl = fs.readFileSync(path.join(ROOT, 'skills', 'english-memory-method', 'assets', 'library-template.html'), 'utf8');

function escapeRegex(s){ return s.replace(/[.+*?^${}()|[\]\\]/g, '\\$&'); }
function matchesApi(haystack, name){
  // 同时匹配 "name(" 和 "name." 和 "name =" 等调用形式
  return new RegExp('\\b' + escapeRegex(name) + '\\b').test(haystack);
}

const apis = Object.keys(MATRIX);
const inPlan = apis.filter(api => matchesApi(planTpl, api));
const inLib = apis.filter(api => matchesApi(libTpl, api));
const bothUsed = apis.filter(api => matchesApi(planTpl, api) || matchesApi(libTpl, api));

// ── 报告 ────────────────────────────────────────────
let warnCount = 0;
console.log('english-memory-method · 跨浏览器 API 兼容性报告');
console.log('='.repeat(70));
console.log('模板涵盖 ' + planTpl.length + ' / ' + libTpl.length + ' 字节');
console.log('扫描到 ' + bothUsed.length + ' 个 API（plan=' + inPlan.length + ', lib=' + inLib.length + '）\n');

console.log('API'.padEnd(38) + 'Chrome   Firefox  Safari   Edge     备注');
console.log('-'.repeat(70));
bothUsed.forEach(api => {
  const m = MATRIX[api];
  var row = api.padEnd(38) + ' ' + m.ch.s.padEnd(7) + ' ' + m.ff.s.padEnd(8) + ' ' + m.sf.s.padEnd(8) + ' ' + m.ie.s.padEnd(8);
  console.log(row);
  if(m.notes){
    console.log('  └─ ' + m.notes);
  }
  // 任何 ⚠ 标记 → 累计警告
  if(/⚠/.test(m.ch.s + m.ff.s + m.sf.s + m.ie.s)){
    warnCount++;
  }
});

console.log('\n' + '='.repeat(70));
if(warnCount === 0){
  console.log('✅ 全部 API 跨 4 大浏览器均支持');
} else {
  console.log('⚠ 有 ' + warnCount + ' 个 API 跨浏览器有限制/兼容性差 — 见上方备注');
  console.log('   缓解策略：');
  console.log('   - speechSynthesis / getVoices：用 try/catch 包裹（v2.19 已实现）');
  console.log('   - MediaRecorder / getUserMedia：失败时弹 alert 降级到手动（v2.19 已实现）');
  console.log('   - alert / confirm：iOS popup blocking 时静默降级到 UI 提示');
  console.log('   - localStorage 超量：try/catch + 提示导出（v2.21 已实现）');
}

console.log('\n参考：');
console.log('  docs/CROSS-BROWSER.md  — 完整兼容性矩阵 + 已知 bug 原因 + 缓解');
console.log('  npm run preview         — 浏览器手动打开看真实页面');
console.log('  Playwright 跨浏览器集成见 docs/CROSS-BROWSER.md §3\n');

if (strict && warnCount > 0){
  process.exit(1);
}
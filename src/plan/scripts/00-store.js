/* ===== v2.32.0 EMM_STORE_V232: 进度存储契约（唯一实现）=====
   keyOf = 进度键前缀 + (h1 文本前 40 字 | title 前 40 字 | 'plan')。
   main IIFE（keyOf/save/loadState 首行）、SR IIFE（getH1/keyOf/loadProgress/
   patchSr/patchSrMode）、shadow IIFE（getH1/keyOf/loadProgress/saveProgress）
   均为同签名薄委托——契约改动只改本块。本块必须是第 1 个脚本块（先于 main）。
   library-template 的 article-key 版本在 library 拆分批次接入。 */
window.EMMProgressStore = (function(){
  "use strict";
  function title40(doc) {
    var d = doc || document;
    var h = d.querySelector ? d.querySelector('h1') : null;
    if (h) return h.textContent.trim().slice(0, 40);
    var t = d.title || '';
    return t.slice(0, 40) || 'plan';
  }
  function keyOf(doc) { return 'emm-progress:' + title40(doc); }
  // 参数双形态：传 doc → 按 h1/title 派生键；传字符串 → 视为完整键（library 批接入用）
  function keyArg(x) { return (typeof x === 'string') ? x : keyOf(x); }
  function load(x) {
    try { return JSON.parse(localStorage.getItem(keyArg(x)) || '{}'); } catch(e) { return {}; }
  }
  function loadRaw(x) {
    try { return JSON.parse(localStorage.getItem(keyArg(x)) || 'null'); } catch(e) { return null; }
  }
  function save(prog, x) {
    try { localStorage.setItem(keyArg(x), JSON.stringify(prog)); } catch(e){}
  }
  function patch(fn, x) {
    try {
      var k = keyArg(x);
      var p = JSON.parse(localStorage.getItem(k) || '{}');
      fn(p);
      localStorage.setItem(k, JSON.stringify(p));
    } catch(e){}
  }
  return { title40: title40, keyOf: keyOf, load: load, loadRaw: loadRaw, save: save, patch: patch };
})();


/* ===== v2.29.0 EMM_QUICK3_V229 + EMM_CAP_V229 + EMM_PALACE_V229：入门减负——3 步快背入口 + 能力探测横幅 + 记忆宫殿路线引导 ===== */
(function(){
  "use strict";
  // 页脚版本戳唯一来源；与模板顶部注释保持一致（RELEASE-CHECKLIST：每份生成方案打开即见"我跑的是哪版"）
  var EMM_VERSION = 'v2.42.2';

  // 1. 页脚版本戳
  try {
    var ft = document.querySelector('footer');
    if(ft && !/v\d+\.\d+\.\d+/.test(ft.textContent)){
      var vs = document.createElement('span');
      vs.className = 'emm-ver-stamp';
      vs.textContent = ' · ' + EMM_VERSION;
      ft.appendChild(vs);
    }
  } catch(e){}

  // 2. 3 步快背入口卡（插在 header 之后、第 1 节之前；折叠态下同样首屏可见）
  try {
    var header = document.querySelector('header');
    var wrap = document.querySelector('.wrap');
    if(header && wrap && header.parentNode === wrap && !document.getElementById('emm-quick3')){
      var q3 = document.createElement('div');
      q3.className = 'emm-quick3';
      q3.id = 'emm-quick3';
      q3.innerHTML = '<h3>🚀 3 步快背（只想背完一篇？跟着走）</h3>'
        + '<ol>'
        + '<li><b>听读 3 遍</b>——到原文逐句区，看着 .sent-en 逐句跟读，听不懂的回第 13 节查词 <button type="button" class="q3-jump" data-q3="sent">跳到原文</button></li>'
        + '<li><b>钩子链过 2 轮</b>——看第 15 节三层钩子链：盖住原文，一钩一句往外说，卡壳看 [锚词] <button type="button" class="q3-jump" data-q3="hook">跳到钩子链</button></li>'
        + '<li><b>复述打卡毕业</b>——点复习条「▶ 开始本轮」评顺/卡，薄弱句连顺 3 轮即毕业 <button type="button" class="q3-jump" data-q3="round">跳到复习条</button></li>'
        + '</ol>'
        + '<div class="q3-more">只用这 3 步就能背完一篇；其余章节已折叠，点右上角「≡ 进阶内容」按需展开。卡壳急救技巧见第 16 节复述技巧包。</div>';
      header.parentNode.insertBefore(q3, header.nextSibling);
      function jumpTo(sel, fallbackText){
        var el = document.querySelector(sel);
        if(!el && fallbackText){
          var h2s = document.querySelectorAll('h2');
          for(var i = 0; i < h2s.length; i++){
            if(h2s[i].textContent.indexOf(fallbackText) >= 0){ el = h2s[i]; break; }
          }
        }
        if(el && typeof el.scrollIntoView === 'function') el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
      q3.querySelectorAll('.q3-jump').forEach(function(btn){
        btn.addEventListener('click', function(){
          var t = btn.getAttribute('data-q3');
          if(t === 'sent') jumpTo('.sent', '逐句');
          else if(t === 'hook') jumpTo('.hook-chain', '记忆钩子');
          else jumpTo('.rv-bar', '');
        });
      });
    }
  } catch(e){}

  // 3. 能力探测横幅：TTS / 录音 / 存储不可用时显式告知 + 替代做法（替代静默 try/catch 降级）
  try {
    var dismissed = false;
    try { dismissed = localStorage.getItem('emm-cap-dismissed') === '1'; } catch(e){}
    if(!dismissed){
      var caps = [];
      var hasTTS = ('speechSynthesis' in window) && typeof window.speechSynthesis !== 'undefined';
      var hasRec = typeof window.MediaRecorder !== 'undefined';
      var hasGum = !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia);
      var secure = (window.isSecureContext !== false); // file:// 在 Safari 下 getUserMedia 失败
      var hasStore = (function(){ try { localStorage.setItem('emm-cap-probe', '1'); localStorage.removeItem('emm-cap-probe'); return true; } catch(e){ return false; } })();
      var hasSR = !!(window.SpeechRecognition || window.webkitSpeechRecognition);
      if(!hasTTS) caps.push(['🎧 听写 / 朗读', '当前浏览器不支持语音合成（speechSynthesis），听写模式不发声', '替代：自己朗读 + 对照原文；用第 11 节挖空自测验证记效果。']);
      if(!hasRec || !hasGum) caps.push(['🎙️ 影子跟读', '当前浏览器不支持录音（MediaRecorder / getUserMedia）', '替代：第 16 节「⑨ 录音自查法」——用手机录音机录背诵回放，对照原文挑 3 个卡壳点专练。']);
      else if(!secure) caps.push(['🎙️ 影子跟读', '当前页面非安全上下文（本地 file:// 在 Safari 下禁用麦克风）', '替代：用 Chrome/Edge 打开，或起本地服务（如 npm run preview）再开；也可用手机录音机。']);
      if(!hasSR) caps.push(['🤖 影子跟读自动评分', '当前浏览器不支持语音识别（SpeechRecognition，Chrome / Edge 支持）', '替代：影子跟读手动自评（▶ 听原句 + 逐词点 ✓/✗），或用听写模式验证辨音。']);
      if(!hasStore) caps.push(['💾 进度保存', '当前浏览器不给本页存储（localStorage 被禁或无 file:// 存储权限）', '打卡 / 薄弱清单 / SM-2 进度无法保存：用完点「💾 导出」手动备份 JSON，换环境后「📥 导入」恢复。']);
      if(caps.length){
        var wrap2 = document.querySelector('.wrap');
        if(wrap2){
          var cap = document.createElement('div');
          cap.className = 'emm-cap';
          cap.id = 'emm-cap';
          var html = '<h3>⚠️ 当前环境能力提示（' + caps.length + ' 项互动不可用）</h3><ul>';
          caps.forEach(function(c){ html += '<li><b>' + c[0] + '</b>不可用：' + c[1] + '。<b>替代做法</b>：' + c[2] + '</li>'; });
          html += '</ul><button type="button" class="cap-dismiss">知道了（本设备不再提示）</button>';
          cap.innerHTML = html;
          var q3El = document.getElementById('emm-quick3');
          if(q3El && q3El.parentNode) q3El.parentNode.insertBefore(cap, q3El.nextSibling);
          else wrap2.insertBefore(cap, wrap2.firstChild);
          cap.querySelector('.cap-dismiss').addEventListener('click', function(){
            try { localStorage.setItem('emm-cap-dismissed', '1'); } catch(e){}
            cap.remove();
          });
        }
      }
    }
  } catch(e){}

  // 4. 记忆宫殿路线引导：首次使用引导定义个人 25 站动线并持久化；
  //    之后每篇方案自动套用（换篇不用重记路线），可随时重新定义
  try {
    var stops = document.querySelectorAll('.palace-stop');
    if(stops.length){
      var ROUTE_KEY = 'emm-palace-route';
      function readRoute(){
        try {
          var raw = localStorage.getItem(ROUTE_KEY);
          if(!raw) return null;
          var arr = JSON.parse(raw);
          return Array.isArray(arr) ? arr : null;
        } catch(e){ return null; }
      }
      function applyRoute(route){
        if(!route) return;
        for(var i = 0; i < stops.length && i < route.length; i++){
          var name = String(route[i] || '').trim();
          if(!name) continue;
          var el = stops[i].querySelector('.st-name');
          if(el) el.textContent = name;
        }
      }
      // 4a. 已保存的路线：静默套用
      applyRoute(readRoute());
      // 4b. 宫殿区常驻管理入口（§17 卡片内）
      var palaceCard = stops[0].closest('.card');
      if(palaceCard && !palaceCard.querySelector('.emm-palace-manage')){
        var manage = document.createElement('p');
        manage.className = 'emm-palace-manage';
        manage.style.cssText = 'font-size:12.5px;color:#6b7280;margin:8px 0 0;';
        manage.innerHTML = '🏛 站点名用的是<b>你本机的个人路线</b>（换电脑/换浏览器不跟着走）。<button type="button" class="emm-palace-edit" style="background:#fff;border:1px solid #8b5cf6;border-radius:8px;padding:1px 10px;cursor:pointer;font-size:12px;font-weight:600;color:#6d28d9;margin-left:6px;font-family:inherit;">✏️ 重新定义我的路线</button>';
        palaceCard.appendChild(manage);
      }
      function openEditor(){
        var old = document.getElementById('emm-palace-editor');
        if(old){ old.remove(); }
        // 打开编辑器时确保 §17 可见（新用户默认折叠进阶章节）
        document.body.classList.remove('emm-folded');
        try { localStorage.setItem('emm-fold-state', '0'); } catch(e){}
        var cur = readRoute() || Array.prototype.map.call(stops, function(s){ var n = s.querySelector('.st-name'); return n ? n.textContent.trim() : ''; });
        var ed = document.createElement('div');
        ed.className = 'emm-palace-editor';
        ed.id = 'emm-palace-editor';
        ed.innerHTML = '<h3>🏛 我的记忆宫殿路线（' + stops.length + ' 站）</h3>'
          + '<p style="font-size:13px;color:#6b7280;margin-bottom:8px;">每行一个站点名，按你每天真实的动线排（如：家门 → 鞋柜 → 客厅沙发 → 茶几 → 电视柜 → 书桌 ……）。保存后所有方案的宫殿都会套用这条路线。</p>'
          + '<textarea class="emm-palace-ta" rows="8" style="width:100%;box-sizing:border-box;font-size:13px;line-height:1.7;padding:8px;border:1px solid #c4b5fd;border-radius:8px;font-family:inherit;">' + cur.map(function(s){ return String(s).replace(/</g, '&lt;'); }).join('\n') + '</textarea>'
          + '<div style="margin-top:8px;">'
          + '<button type="button" class="emm-palace-save" style="background:#7c3aed;border:none;border-radius:8px;padding:5px 16px;cursor:pointer;font-size:13px;font-weight:600;color:#fff;font-family:inherit;">💾 保存路线</button> '
          + '<button type="button" class="emm-palace-reset" style="background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:5px 12px;cursor:pointer;font-size:12.5px;color:#374151;margin-left:6px;font-family:inherit;">恢复模板默认</button> '
          + '<button type="button" class="emm-palace-cancel" style="background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:5px 12px;cursor:pointer;font-size:12.5px;color:#374151;margin-left:6px;font-family:inherit;">取消</button>'
          + '</div>';
        var host = palaceCard || document.querySelector('.wrap');
        if(host) host.appendChild(ed);
        ed.querySelector('.emm-palace-cancel').addEventListener('click', function(){ ed.remove(); });
        ed.querySelector('.emm-palace-reset').addEventListener('click', function(){
          try { localStorage.removeItem(ROUTE_KEY); } catch(e){}
          location.reload();
        });
        ed.querySelector('.emm-palace-save').addEventListener('click', function(){
          var lines = ed.querySelector('.emm-palace-ta').value.split('\n').map(function(s){ return s.trim(); }).filter(Boolean);
          if(!lines.length){ alert('至少填写 1 个站点名。'); return; }
          try { localStorage.setItem(ROUTE_KEY, JSON.stringify(lines)); } catch(e){}
          applyRoute(lines);
          ed.remove();
          var tipEl = document.getElementById('emm-palace-onboard');
          if(tipEl) tipEl.remove();
          alert('✅ 路线已保存（' + lines.length + ' 站），本篇及以后的方案都会套用。');
        });
      }
      document.querySelectorAll('.emm-palace-edit').forEach(function(b){
        b.addEventListener('click', openEditor);
      });
      // 4c. 首次访问引导条（无路线且未关闭过时）——插在首屏快背卡之后，避免被进阶折叠藏掉
      var dismissed = false;
      try { dismissed = localStorage.getItem('emm-palace-onboard-dismissed') === '1'; } catch(e){}
      if(!readRoute() && !dismissed){
        var wrap3 = document.querySelector('.wrap');
        var q3El2 = document.getElementById('emm-quick3');
        if(wrap3){
          var tip = document.createElement('div');
          tip.className = 'emm-palace-onboard';
          tip.id = 'emm-palace-onboard';
          tip.innerHTML = '🏛 <b>第一次见记忆宫殿？</b>25 站动线不必死记模板示例——换成你每天走的真实路线（家门→沙发→书桌→床），记忆强度更高，且一次定义、所有方案通用。'
            + '<div style="margin-top:6px;">'
            + '<button type="button" class="emm-palace-go" style="background:#7c3aed;border:none;border-radius:8px;padding:4px 14px;cursor:pointer;font-size:12.5px;font-weight:600;color:#fff;font-family:inherit;">✏️ 花 1 分钟定义我的路线</button>'
            + '<button type="button" class="emm-palace-skip" style="background:#fff;border:1px solid #d1d5db;border-radius:8px;padding:4px 12px;cursor:pointer;font-size:12.5px;color:#374151;margin-left:6px;font-family:inherit;">先用模板默认路线</button>'
            + '</div>';
          if(q3El2 && q3El2.parentNode) q3El2.parentNode.insertBefore(tip, q3El2.nextSibling);
          else wrap3.insertBefore(tip, wrap3.firstChild);
          tip.querySelector('.emm-palace-go').addEventListener('click', openEditor);
          tip.querySelector('.emm-palace-skip').addEventListener('click', function(){
            try { localStorage.setItem('emm-palace-onboard-dismissed', '1'); } catch(e){}
            tip.remove();
          });
        }
      }
    }
  } catch(e){}
})();

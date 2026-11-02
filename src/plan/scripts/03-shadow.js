
/* ===== v2.19 EMM_SHADOW_V219 + v2.30 EMM_SPEECH_V230: 影子跟读（MediaRecorder 逐词自评 + SpeechRecognition 自动评分）===== */
(function(){
  "use strict";

  // v2.19 设计：自给自足——不从 main IIFE 借 state/sentences（strict mode + var 不泄漏）
  // 直接从 DOM 抽 .sent-en，从 localStorage 抽 state
  function getSentences(){
    var nodes = document.querySelectorAll('.sent-en');
    var out = [];
    for(var i = 0; i < nodes.length; i++){
      out.push({ text: nodes[i].textContent.replace(/\s+/g, ' ').trim() });
    }
    return out;
  }
  function getH1(){ var h = document.querySelector('h1'); return h ? h.textContent.trim().slice(0, 40) : ((document.title || '').slice(0, 40) || 'plan'); }
  function keyOf(){ return 'emm-progress:' + getH1(); }
  function loadProgress(){
    try { return JSON.parse(localStorage.getItem(keyOf()) || '{}'); } catch(e) { return {}; }
  }
  function saveProgress(prog){
    try { localStorage.setItem(keyOf(), JSON.stringify(prog)); } catch(e){}
  }

  var sents = getSentences();
  if(!sents.length) return;

  var SH = { active: false, idx: 0, marks: [], blob: null, audioUrl: null, recorder: null, recordedTime: -1 };

  function shadowHtml(){
    return '<b>🎙️ 影子跟读</b>'
      + '<button type="button" class="sv-btn sv-toggle">开始</button>'
      + '<span class="sv-stat"></span>'
      + '<span class="sv-meta">· 对接光明日报"50 遍传统"，录音后逐词自评</span>'
      + '<div class="sv-panel" style="display:none;margin-top:10px;">'
      + '<div class="sv-sent"></div>'
      + '<div class="sv-row">'
      + '<button type="button" class="sv-btn sv-play">▶ 听原句</button>'
      + '<button type="button" class="sv-btn sv-record">🎤 录音</button>'
      + '<button type="button" class="sv-btn sv-stop" disabled>⏹ 停止</button>'
      + '<button type="button" class="sv-btn sv-replay" disabled>🔁 回放</button>'
      + '<button type="button" class="sv-btn sv-auto">🤖 自动评分</button>'
      + '<span class="sv-status"></span>'
      + '</div>'
      + '<div class="sv-words"></div>'
      + '<div class="sv-row">'
      + '<button type="button" class="sv-btn sv-clear">清空标注</button>'
      + '<button type="button" class="sv-btn sv-skip">⏭ 跳过此句</button>'
      + '<button type="button" class="sv-btn sv-save" disabled>💾 保存并下一句</button>'
      + '</div>'
      + '<div class="sv-hint">点击每个词：✓ 正确 / ✗ 读错或漏；至少标 1 个才解锁保存。错词 ≥ 25% 自动入薄弱清单。也可点「🤖 自动评分」：浏览器听你朗读、自动逐词标注（Chrome / Edge 支持，识别走云端服务）。</div>'
      + '</div>';
  }

  function wordTokens(sentText){
    // 拆词：保留撇号/连字符/数字；按非 word 字符拆
    return (sentText || '').split(/(\s+|[^\w']+)/).filter(function(t){ return t && /\S/.test(t) && /\w/.test(t); });
  }

  function renderShadowWords(){
    var bar = document.querySelector('.rv-shadow');
    if(!bar) return;
    var sent = sents[SH.idx];
    var tokens = wordTokens(sent.text);
    var html = '';
    for(var i = 0; i < tokens.length; i++){
      var cls = 'sv-w';
      if(SH.marks[i] === 1) cls += ' sv-ok';
      else if(SH.marks[i] === -1) cls += ' sv-bad';
      else cls += ' sv-pending';
      html += '<button type="button" class="' + cls + '" data-wi="' + i + '" title="点 1 次=✓ / 2 次=✗ / 3 次=重置">' + tokens[i] + '</button>';
    }
    bar.querySelector('.sv-words').innerHTML = html;
    // 单词评级：🪓 词事件
    bar.querySelectorAll('.sv-w').forEach(function(b){
      b.addEventListener('click', function(){
        var i = +b.getAttribute('data-wi');
        // 0=未评 / 1=✓ / -1=✗ 循环
        var cur = SH.marks[i] || 0;
        SH.marks[i] = cur === 1 ? -1 : (cur === -1 ? 0 : 1);
        renderShadowWords();
        updateSaveBtn();
      });
    });
    updateSaveBtn();
  }

  function updateSaveBtn(){
    var bar = document.querySelector('.rv-shadow');
    if(!bar) return;
    var any = SH.marks.some(function(m){ return m === 1 || m === -1; });
    bar.querySelector('.sv-save').disabled = !any;
    var ok = SH.marks.filter(function(m){ return m === 1; }).length;
    var bad = SH.marks.filter(function(m){ return m === -1; }).length;
    var tot = SH.marks.filter(function(m){ return m; }).length;
    bar.querySelector('.sv-status').textContent = tot ? ('✓' + ok + ' / ✗' + bad + ' / 共标 ' + tot + ' 个词') : '点击每个词标注';
  }

  function renderShadow(){
    var bar = document.querySelector('.rv-shadow');
    if(!bar) return;
    var tog = bar.querySelector('.sv-toggle');
    var prog = loadProgress();
    var doneCount = Object.keys(prog.shadow || {}).length;
    tog.textContent = SH.active ? '结束影子跟读' : (doneCount ? '继续（' + doneCount + '/' + sents.length + '）' : '开始影子跟读');
    bar.querySelector('.sv-stat').textContent = SH.active ? ('进度 ' + (SH.idx + 1) + '/' + sents.length) : '';
    var panel = bar.querySelector('.sv-panel');
    panel.style.display = SH.active ? 'block' : 'none';
    if(SH.active){
      var sent = sents[SH.idx];
      bar.querySelector('.sv-sent').textContent = '第 ' + (SH.idx + 1) + ' 句 / 共 ' + sents.length + ' 句：' + sent.text;
      // 加载该句的旧 marks
      var prev = (prog.shadow || {})[SH.idx];
      SH.marks = prev && prev.marks ? prev.marks.slice() : [];
      SH.blob = null;
      if(SH.audioUrl){ URL.revokeObjectURL(SH.audioUrl); SH.audioUrl = null; }
      var oldAudio = bar.querySelector('audio'); if(oldAudio) oldAudio.remove();
      bar.querySelector('.sv-record').disabled = false;
      bar.querySelector('.sv-record').classList.remove('recording');
      bar.querySelector('.sv-stop').disabled = true;
      bar.querySelector('.sv-replay').disabled = true;
      renderShadowWords();
      // 自动播放原句
      setTimeout(function(){
          if(typeof speak === 'function') speak(sent.text);
        }, 100);
    }
  }

  function buildShadow(){
    if(document.querySelector('.rv-shadow')) return;
    var div = document.createElement('div');
    div.className = 'rv-shadow';
    div.id = 'emm-shadow';
    div.innerHTML = shadowHtml();
    // 初始隐藏面板（SH.active = false）
    div.querySelector('.sv-panel').style.display = 'none';
    var anchor = document.querySelector('.rv-bar');
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(div, anchor.nextSibling);

    // 接入 rv-bar 按钮
    var barBtn = document.querySelector('.rv-shadow-btn');
    if(barBtn) barBtn.addEventListener('click', function(){ SH.active = !SH.active; SH.idx = 0; renderShadow(); });

    div.querySelector('.sv-toggle').addEventListener('click', function(){
      SH.active = !SH.active;
      if(SH.active && SH.idx >= sents.length) SH.idx = 0;
      renderShadow();
    });

    div.querySelector('.sv-play').addEventListener('click', function(){
      // 简易 TTS：直接用浏览器原生 speechSynthesis
      try {
        var u = new SpeechSynthesisUtterance(sents[SH.idx].text);
        u.lang = 'en-US';
        if(speechSynthesis.getVoices().length){
          var vs = speechSynthesis.getVoices();
          for(var i=0;i<vs.length;i++) if(/en[-_]US/i.test(vs[i].lang)){ u.voice = vs[i]; break; }
        }
        speechSynthesis.cancel();
        speechSynthesis.speak(u);
      } catch(e){}
    });

    var recBtn = div.querySelector('.sv-record');
    var stopBtn = div.querySelector('.sv-stop');
    var replayBtn = div.querySelector('.sv-replay');
    recBtn.addEventListener('click', function(){
      if(!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia){
        alert('当前浏览器不支持麦克风录制。请用 Chrome / Edge / Firefox 桌面版。');
        return;
      }
      navigator.mediaDevices.getUserMedia({ audio: true }).then(function(stream){
        var rec;
        try { rec = new MediaRecorder(stream); }
        catch(e){
          alert('MediaRecorder 不可用：' + e.message + '\n可降级为手动播放 + 自评。');
          stream.getTracks().forEach(function(t){ t.stop(); });
          return;
        }
        var chunks = [];
        rec.ondataavailable = function(e){ if(e.data.size > 0) chunks.push(e.data); };
        rec.onstop = function(){
          SH.blob = new Blob(chunks, { type: chunks[0] && chunks[0].type || 'audio/webm' });
          if(SH.audioUrl) URL.revokeObjectURL(SH.audioUrl);
          SH.audioUrl = URL.createObjectURL(SH.blob);
          // 插入 <audio> 元素
          var bar = document.querySelector('.rv-shadow');
          var oldA = bar.querySelector('audio'); if(oldA) oldA.remove();
          var au = document.createElement('audio');
          au.src = SH.audioUrl; au.controls = true;
          bar.querySelector('.sv-status').after(au);
          stopBtn.disabled = true;
          recBtn.classList.remove('recording');
          replayBtn.disabled = false;
          stream.getTracks().forEach(function(t){ t.stop(); });
          bar.querySelector('.sv-status').textContent = '录音完成，回放比对后逐词标注';
        };
        rec.start();
        SH.recorder = rec;
        recBtn.classList.add('recording');
        recBtn.disabled = true;
        stopBtn.disabled = false;
        bar.querySelector('.sv-status').textContent = '正在录音…大声朗读';
      }).catch(function(err){
        alert('麦克风权限被拒：' + err.message + '\n可继续手动自评每词。');
      });
    });
    stopBtn.addEventListener('click', function(){
      if(SH.recorder && SH.recorder.state !== 'inactive') SH.recorder.stop();
    });
    replayBtn.addEventListener('click', function(){
      if(SH.audioUrl) {
        var au = div.querySelector('audio'); if(au) au.play();
      }
    });
    // v2.30 语音识别自动评分：浏览器听朗读 → 转写 → LCS 对齐 → 自动填 marks（可手动修正后保存）
    var autoBtn = div.querySelector('.sv-auto');
    var recog = null;
    autoBtn.addEventListener('click', function(){
      var SRClass = window.SpeechRecognition || window.webkitSpeechRecognition;
      if(!SRClass){
        alert('当前浏览器不支持语音识别（Chrome / Edge 桌面版支持）。\n可继续手动播放 + 自评。');
        return;
      }
      if(recog){ try { recog.stop(); } catch(e){} return; }
      var r;
      try { r = new SRClass(); } catch(e){ alert('语音识别初始化失败：' + e.message); return; }
      r.lang = 'en-US'; r.interimResults = false; r.maxAlternatives = 1;
      recog = r;
      var bar = document.querySelector('.rv-shadow');
      autoBtn.classList.add('listening');
      autoBtn.textContent = '👂 正在听…点此结束';
      bar.querySelector('.sv-status').textContent = '正在聆听，请大声朗读当前句…';
      r.onresult = function(ev){
        var said = (ev.results && ev.results[0] && ev.results[0][0] && ev.results[0][0].transcript) || '';
        var origTokens = wordTokens(sents[SH.idx].text);
        var saidTokens = String(said).toLowerCase().replace(/[^a-z0-9'\s]/gi, ' ').split(/\s+/).filter(Boolean);
        if(!saidTokens.length){
          bar.querySelector('.sv-status').textContent = '没听清，请靠近麦克风重试，或手动标注。';
          return;
        }
        var norm = function(t){ return String(t).toLowerCase(); };
        var m = saidTokens.length, n = origTokens.length;
        var dp = [];
        for(var i = 0; i <= m; i++){ dp.push(new Array(n + 1).fill(0)); }
        for(var i = 1; i <= m; i++){
          for(var j = 1; j <= n; j++){
            dp[i][j] = (saidTokens[i-1] === norm(origTokens[j-1])) ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
          }
        }
        var marks = []; for(var j = 0; j < n; j++) marks.push(0);
        var i2 = m, j2 = n;
        while(i2 > 0 || j2 > 0){
          if(i2 > 0 && j2 > 0 && saidTokens[i2-1] === norm(origTokens[j2-1])){ marks[j2-1] = 1; i2--; j2--; }
          else if(j2 > 0 && (i2 === 0 || dp[i2][j2-1] >= dp[i2-1][j2])){ j2--; }
          else if(i2 > 0){ i2--; }
        }
        var matched = 0; for(var k2 = 0; k2 < n; k2++){ if(marks[k2] === 1) matched++; }
        if(!matched){
          bar.querySelector('.sv-status').textContent = '识别结果与原句无匹配词（识别：「' + said + '」），请重试或手动标注。';
          return;
        }
        for(var k = 0; k < n; k++){ if(marks[k] === 0) marks[k] = -1; }
        SH.marks = marks;
        renderShadowWords();
        bar.querySelector('.sv-status').textContent = '识别：「' + said + '」——已自动标注 ✓' + matched + ' / ✗' + (n - matched) + '，可手动修正后 💾 保存';
      };
      r.onerror = function(ev){
        bar.querySelector('.sv-status').textContent = '识别失败：' + ((ev && ev.error) || '未知错误') + '（可手动自评）';
      };
      r.onend = function(){
        recog = null;
        autoBtn.classList.remove('listening');
        autoBtn.textContent = '🤖 自动评分';
      };
      try { r.start(); } catch(e){ recog = null; autoBtn.classList.remove('listening'); autoBtn.textContent = '🤖 自动评分'; alert('语音识别启动失败：' + e.message); }
    });
    div.querySelector('.sv-clear').addEventListener('click', function(){
      SH.marks = [];
      renderShadowWords();
      div.querySelector('.sv-status').textContent = '已清空标注';
    });
    div.querySelector('.sv-skip').addEventListener('click', function(){
      SH.idx = Math.min(SH.idx + 1, sents.length - 1);
      renderShadow();
    });
    div.querySelector('.sv-save').addEventListener('click', function(){
      var ok = SH.marks.filter(function(m){ return m === 1; }).length;
      var bad = SH.marks.filter(function(m){ return m === -1; }).length;
      var total = ok + bad;
      // 错误率 ≥ 25% → 加入薄弱清单（直接更新 localStorage，与 main IIFE 的 weak 同源）
      var prog = loadProgress();
      prog.shadow = prog.shadow || {};
      prog.weak = prog.weak || {};
      prog.streak = prog.streak || {};
      if(bad / Math.max(total, 1) >= 0.25 && !prog.weak[SH.idx]){
        prog.weak[SH.idx] = true;
        prog.streak[SH.idx] = 0;
      }
      prog.shadow[SH.idx] = {
        ok: ok, bad: bad, total: total,
        marks: SH.marks.slice(),
        date: (new Date()).toISOString().slice(0, 10)
      };
      saveProgress(prog);
      // 下一句
      SH.idx++;
      if(SH.idx >= sents.length){
        SH.active = false;
        div.querySelector('.sv-status').textContent = '🎉 全篇影子跟读完成！薄弱句已自动入清单。';
        renderShadow();
      } else {
        renderShadow();
      }
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', buildShadow);
  else buildShadow();
})();

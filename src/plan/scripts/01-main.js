
/* ===== v2.7.0 Review Loop (self-contained; no deps) ===== */
(function(){
  "use strict";
  var CSS = ''
  + '.rv-bar{display:flex;flex-wrap:wrap;gap:10px;align-items:center;background:#ecfdf5;border:1px solid #6ee7b7;border-left:4px solid #10b981;border-radius:10px;padding:10px 14px;margin:12px 0;font-size:14px;}'
  + '.rv-btn{cursor:pointer;border:1px solid #10b981;background:#fff;color:#047857;border-radius:8px;padding:3px 12px;font-size:13px;font-weight:600;}'
  + '.rv-btn:hover{background:#d1fae5;}'
  + '.rv-btn.rv-danger{border-color:#f87171;color:#b91c1c;}'
  + '.rv-btn.rv-danger:hover{background:#fee2e2;}'
  + '.rv-stat{font-size:13px;color:#065f46;}'
  + '.rv-dash{background:#f0fdf4;border:1px solid #bbf7d0;border-radius:10px;padding:10px 14px;margin:10px 0;font-size:13.5px;color:#065f46;line-height:1.9;}'
  + '.rv-dash b{color:#065f46;}'
  + '.rv-progress{height:8px;background:#d1fae5;border-radius:4px;overflow:hidden;margin:6px 0;}'
  + '.rv-progress i{display:block;height:100%;background:#10b981;width:0;}'
  + '.rv-judge{display:none;gap:4px;margin-left:8px;vertical-align:middle;}'
  + '.sent{position:relative;}'
  + '.rv-mode .rv-judge{display:inline-flex;}'
  + '.rv-judge button{cursor:pointer;border:1px solid #cbd5e1;background:#fff;border-radius:6px;font-size:11px;padding:1px 7px;color:#475569;}'
  + '.rv-judge button.rv-ok-on{background:#10b981;border-color:#10b981;color:#fff;}'
  + '.rv-judge button.rv-bad-on{background:#ef4444;border-color:#ef4444;color:#fff;}'
  + '.rv-weakline{border-left:3px solid #ef4444;}'
  + '.rv-dict{background:#eff6ff;border:1px solid #93c5fd;border-left:4px solid #3b82f6;border-radius:10px;padding:10px 14px;margin:12px 0;font-size:14px;}'
  + '.rv-dict .d-btn{cursor:pointer;border:1px solid #3b82f6;background:#fff;color:#1d4ed8;border-radius:8px;padding:3px 12px;font-size:13px;font-weight:600;margin-right:6px;}'
  + '.rv-dict .d-btn:hover{background:#dbeafe;}'
  + '.rv-dict input.d-input{border:1px solid #93c5fd;border-radius:8px;padding:5px 10px;font-size:14px;width:70%;margin:6px 0;}'
  + '.rv-dict .d-sent{font-size:15px;margin:8px 0 4px;color:#1e3a8a;font-weight:600;}'
  + '.rv-dict .w-ok{color:#059669;}'
  + '.rv-dict .w-bad{background:#fef08a;color:#92400e;border-radius:4px;padding:0 3px;}'
  + '.rv-dict .w-miss{background:#fee2e2;color:#b91c1c;border-radius:4px;padding:0 3px;text-decoration:line-through;}'
  + '.rv-dict .w-extra{color:#9ca3af;text-decoration:line-through;}'
  + '.rv-dict .d-hint{font-size:12.5px;color:#6b7280;margin-top:4px;}'
  + '@media print{.rv-dict{display:none !important;}}'
  /* v2.19: 影子跟读（CSS 部分；锚点见下行 IIFE 注释） */
  + '.rv-shadow{background:#fffbeb;border:1px solid #fcd34d;border-left:4px solid #f59e0b;border-radius:10px;padding:12px 16px;margin:12px 0;font-size:14px;}'
  + '.rv-shadow .sv-hint{font-size:12.5px;color:#92400e;margin-top:6px;line-height:1.7;}'
  + '.rv-shadow .sv-row{display:flex;flex-wrap:wrap;gap:8px;align-items:center;margin:8px 0;}'
  + '.rv-shadow .sv-btn{cursor:pointer;border:1px solid #f59e0b;background:#fff;color:#92400e;border-radius:8px;padding:5px 12px;font-size:13px;font-weight:600;font-family:inherit;}'
  + '.rv-shadow .sv-btn:hover{background:#fef3c7;}'
  + '.rv-shadow .sv-btn:disabled{opacity:.4;cursor:not-allowed;}'
  + '.rv-shadow .sv-btn.sv-record.recording{background:#ef4444;color:#fff;border-color:#ef4444;}'
  + '.rv-shadow .sv-btn.sv-auto.listening{background:#3b82f6;color:#fff;border-color:#3b82f6;}'
  + '.rv-shadow .sv-sent{font-size:15px;margin:8px 0 4px;color:#7c2d12;font-weight:600;font-family:Georgia,"Times New Roman",serif;line-height:1.85;}'
  + '.rv-shadow .sv-words{display:flex;flex-wrap:wrap;gap:6px;margin:10px 0;line-height:2;}'
  + '.rv-shadow .sv-w{padding:5px 10px;border:1px solid #fcd34d;border-radius:6px;cursor:pointer;user-select:none;background:#fff;font-family:inherit;font-size:13.5px;transition:all .15s;}'
  + '.rv-shadow .sv-w.sv-ok{background:#d1fae5;color:#047857;border-color:#10b981;font-weight:600;}'
  + '.rv-shadow .sv-w.sv-bad{background:#fee2e2;color:#b91c1c;border-color:#ef4444;text-decoration:line-through;}'
  + '.rv-shadow .sv-w.sv-pending{background:#fffbeb;}'
  + '.rv-shadow .sv-w:hover{transform:translateY(-1px);box-shadow:0 1px 3px rgba(0,0,0,.08);}'
  + '.rv-shadow .sv-status{font-size:13px;color:#92400e;font-weight:600;}'
  + '.rv-shadow .sv-meta{font-size:12px;color:#9ca3af;}'
  + '.rv-shadow audio{width:100%;margin-top:6px;height:36px;}'
  + '@media print{.rv-shadow{display:none !important;}}'

  + '@media print{.rv-bar,.rv-dash,.rv-judge,.rv-dict,.rv-shadow{display:none !important;}}'
  + '';

  function keyOf(){ return EMMProgressStore.keyOf(); }

  function loadState(){
    var s = EMMProgressStore.loadRaw(keyOf());
    var f = fresh();
    if(!s) return f;
    for(var k in s){ f[k] = s[k]; }
    f.ladder = f.ladder || {}; f.log = f.log || {};
    if(!f.wb) f.wb = { main: {}, pal: {} };
    if(!f.wb.main) f.wb.main = {};
    if(!f.wb.pal) f.wb.pal = {};
    f.quiz = f.quiz || 0; f.perDay = f.perDay || 1;
    return f;
  }
  function fresh(){
    return { done:{}, streak:{}, weak:{}, rounds:[], mode:false, current:null,
             quiz:0, start:'', perDay:1, ladder:{}, log:{}, wb:{ main:{}, pal:{} },
             shadow:{},  // v2.19：影子跟读——{sentIdx: {ok, bad, total, marks:[], date}}
             sr:{},      // v2.20：SM-2 间隔——{sentIdx: {ef, interval, reps, due, lastQ}}
             srMode:'light',  // v2.20：'light' 默认（连顺 2 轮毕业）；'standard' 走 SM-2
             srAlgo:'sm2',  // v2.39.0：调度算法 'sm2'（默认）| 'fsrs'——必须常驻 state，否则 save(state) 会抹掉 store 里的该字段
             fingerprint:'' };
  }
  function save(s){ EMMProgressStore.save(s); }

  var state, sentences = [];

  function init(){
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    state = loadState();

    // v2.22：备份提醒——上次打开距今 > 30 天 → 提示导出（避免 localStorage 数据丢失）
    (function backupPrompt(){
      try {
        var lastKey = 'emm-last-open:' + (document.querySelector('h1') ? document.querySelector('h1').textContent.trim().slice(0, 40) : ((document.title || '').slice(0, 40) || 'plan'));
        var last = localStorage.getItem(lastKey);
        var today = todayKey();
        localStorage.setItem(lastKey, today);  // 更新"最近打开"为今天
        if(last && last !== today){
          var diff = Math.round((parseDate(today) - parseDate(last)) / 86400000);
          if(diff >= 30){
            var hasProgress = Object.keys(state.done || {}).length || Object.keys(state.weak || {}).length;
            if(hasProgress && typeof __emmBackupPromptShown === 'undefined'){
              // 一个 session 只弹一次
              window.__emmBackupPromptShown = true;
              if(confirm('⏰ 你已经 ' + diff + ' 天没打开这个方案了。\n\nlocalStorage 数据可能因为浏览器清理而丢失。建议立即导出 JSON 备份。\n\n现在导出吗？')){
                exportProgress();
              }
            }
          }
        }
      } catch(e){}
    })();

    // collect sentence nodes
    document.querySelectorAll('.sent').forEach(function(node){
      var en = node.querySelector('.sent-en');
      if(!en) return;
      var idx = sentences.length;
      node.__emmIdx = idx;
      sentences.push({ node: node, en: en, text: en.textContent.trim() });
      var jspan = document.createElement('span');
      jspan.className = 'rv-judge';
      jspan.innerHTML = '<button type="button" data-v="ok" title="顺">顺</button><button type="button" data-v="bad" title="卡">卡</button>';
      node.appendChild(jspan);
      jspan.querySelector('[data-v=ok]').addEventListener('click', function(){ judge(idx, 'ok'); });
      jspan.querySelector('[data-v=bad]').addEventListener('click', function(){ judge(idx, 'bad'); });
    });
    if(!sentences.length) return;

    checkFingerprint();
    // v2.38.0：标准模式打开页面即把 SM-2 到期句回炉 weak（跨天不需要先打一轮卡）
    syncDueIntoWeak();
    detectSegments();
    buildRoundBar();
    buildDashboard();
    collectStops();
    buildDict();
    applyJudgeState();
    renderDash();
    buildTodayCard();
    buildWorkbook();
    wireReveal();
    selfCheck();
    buildCloze();
    wrapTables();
    // v2.24：?jump=0,2,5 — 自动滚动到指定句并高亮（供记忆库轻刷结算页"一键回原方案"用）
    (function jumpTo(){
      try {
        var m = location.search.match(/[?&]jump=([^&]+)/);
        if(!m) return;
        var sidxs = decodeURIComponent(m[1]).split(',').map(Number).filter(function(n){ return n >= 0 && n < sentences.length; });
        if(!sidxs.length) return;
        // 滚动到第一个句
        var first = sentences[sidxs[0]];
        if(first){
          first.node.scrollIntoView({ behavior: 'smooth', block: 'center' });
          first.node.style.transition = 'background-color .3s';
          first.node.style.backgroundColor = '#fef3c7';
          setTimeout(function(){ first.node.style.backgroundColor = ''; }, 2500);
        }
      } catch(e){}
    })();
  }

  var stops = [];
  function collectStops(){
    stops = Array.prototype.slice.call(document.querySelectorAll('.palace-stop'));
  }

  function applyWeakStops(){
    stops.forEach(function(st, i){
      var idxs = parseSents(st) || [i];
      var weak = idxs.some(function(ix){ return !!state.weak[ix]; });
      st.classList.toggle('palace-weak', weak);
      var no = st.querySelector('.st-no');
      if(no && weak && !no.getAttribute('title')){
        no.setAttribute('title', '薄弱站：点击跳到原句');
      }
    });
  }

  function buildRoundBar(){
    var bar = document.createElement('div');
    bar.className = 'rv-bar';
    bar.innerHTML = '<b>🔁 复习打卡</b>'
      + '<button type="button" class="rv-btn rv-today-go" title="智能跳转：根据你的当前进度，告诉你今天该先做哪个">★ 今天先做这个</button>'
      + '<button type="button" class="rv-btn rv-round"></button>'
      + '<button type="button" class="rv-btn rv-quiz"></button>'
      + '<button type="button" class="rv-btn rv-drill"></button>'
      + '<button type="button" class="rv-btn rv-segtest" title="60 秒挖空挑战：限时填空，时间到自动批改给 0-100 分">📝 段落测试</button>'
      + '<button type="button" class="rv-btn rv-shadow-btn">🎙️ 影子跟读</button>'
      + '<button type="button" class="rv-btn rv-srmode" title="轻量：连顺 2 轮毕业；标准：SM-2 间隔">📚 轻量</button>'
      + '<button type="button" class="rv-btn rv-goal" title="薄弱句毕业所需的连顺轮次（点切换 2/3/4/5）">🎯 连顺 3 轮</button>'
      + '<button type="button" class="rv-btn rv-algo" title="复习调度算法：SM-2（默认）↔ FSRS-5。切换会按启发式转换现有排期状态">🧮 SM-2</button>'
      + '<button type="button" class="rv-btn rv-feynman" title="段级费曼追问：三连深挖 → 自评 → 卡句点名入薄弱（需该段阶梯打到 L4 解锁 L5）">🎤 Feynman</button>'
      + '<span class="rv-stat rv-count"></span>'
      + '<button type="button" class="rv-btn rv-export" title="导出当前进度为 JSON 文件（换浏览器 / 换电脑迁移用）">💾 导出</button>'
      + '<button type="button" class="rv-btn rv-anki" title="导出挖空卡 + 复述卡为 CSV（Anki / Excel 可直接导入）">🗂 Anki</button>'
      + '<button type="button" class="rv-btn rv-import" title="从 JSON 文件恢复进度">📥 导入</button>'
      + '<input type="file" class="rv-file-input" accept="application/json,.json" style="display:none;">'
      + '<button type="button" class="rv-btn rv-danger rv-reset">重置进度</button>';
    var host = document.querySelector('.sent');
    if(host && host.parentNode) host.parentNode.insertBefore(bar, host);
    bar.querySelector('.rv-drill').addEventListener('click', toggleDrill);
    bar.querySelector('.rv-today-go').addEventListener('click', smartJumpToday);
    bar.querySelector('.rv-segtest').addEventListener('click', startSegTest);
    bar.querySelector('.rv-goal').addEventListener('click', function(){
      var cur = state.streakToGoal || 3;
      var next = cur === 2 ? 3 : (cur === 3 ? 4 : (cur === 4 ? 5 : 2));
      state.streakToGoal = next;
      save(state);
      renderGoal();
    });
    bar.querySelector('.rv-srmode').addEventListener('click', function(){
      state.srMode = (state.srMode === 'standard') ? 'light' : 'standard';
      save(state);
      renderSrMode();
      renderDash();
      // v2.20 SR hook：通知 SR IIFE 重新对齐 Ebbinghaus
      if(typeof __emmDispatch === 'function') __emmDispatch('modeChange');
      // v2.38.0：切到标准模式时立刻把到期句回炉（不必等下一轮或刷新）
      state = loadState();
      syncDueIntoWeak();
      renderGoal(); renderDash(); applyJudgeState(); renderRound();
    });
    // v2.39.0：调度算法切换（SM-2 ↔ FSRS-5），状态转换在 02-sr 的 switchAlgo
    bar.querySelector('.rv-algo').addEventListener('click', function(){
      var next = (EMMSR.currentAlgo() === 'fsrs') ? 'sm2' : 'fsrs';
      var msg = next === 'fsrs'
        ? '切换到 FSRS-5 调度？\n· 现有 SM-2 排期将按启发式转换为 FSRS 状态（难度 D / 稳定度 S）\n· 之后「下次复习」由 FSRS 决定，轻量/标准档的连顺规则不再驱动排期\n· 随时可切回 SM-2'
        : '切回 SM-2 调度？\n· 现有 FSRS 状态将按启发式转回 ef/interval';
      if(!confirm(msg)) return;
      EMMSR.switchAlgo(next);
      renderAlgo();
      renderDash();
    });
    // v2.40.0：段级费曼追问模式（三连深挖 → 自评 → 卡句点名入薄弱）
    bar.querySelector('.rv-feynman').addEventListener('click', startFeynman);
    bar.querySelector('.rv-export').addEventListener('click', exportProgress);
    // v2.29.0：Anki 导出按钮接线
    if(bar.querySelector('.rv-anki')) bar.querySelector('.rv-anki').addEventListener('click', exportAnki);
    bar.querySelector('.rv-import').addEventListener('click', function(){
      bar.querySelector('.rv-file-input').click();
    });
    bar.querySelector('.rv-file-input').addEventListener('change', importProgress);
    bar.querySelector('.rv-reset').addEventListener('click', function(){
      if(confirm('确定清空本篇全部复习进度？此操作不可恢复。')){
        state = fresh(); save(state); applyJudgeState(); renderDash(); renderRound(); applyQuiz(); renderToday(); renderDrill();
      }
    });
    wireQuiz();
    renderSrMode();
    renderAlgo();
    renderGoal();
    renderRound();
    return bar;
  }
  /* ===== v2.40.0 段级费曼追问模式（对标 /learn teach-back；纯前端引导，无 AI 依赖）=====
     资格：段阶梯 lv ≥ 4（L5 解锁）；流程：三连追问 → 自评 → 卡段揭示原文、点名卡句入薄弱。
     记录：state.feynman[segIdx] = { tries, passes, last }；对话版追问见 SKILL.md 陪练协议。 */
  var feynmanState = null;
  function startFeynman(){
    detectSegments();
    state.feynman = state.feynman || {};
    var eligible = [];
    segments.forEach(function(s, i){
      if(((state.ladder[i] || {}).lv || 0) >= 4) eligible.push(i);
    });
    if(!eligible.length){ alert('还没有可 Feynman 的段落：先把某段的阶梯打到 L4（解锁 L5）再回来。'); return; }
    var old = document.querySelector('.feynman-panel'); if(old) old.remove();
    feynmanState = { list: eligible, pos: 0, pass: 0, stuck: 0, enrolled: 0 };
    var panel = document.createElement('div');
    panel.className = 'feynman-panel';
    panel.style.cssText = 'position:fixed;right:12px;bottom:12px;z-index:9999;width:320px;max-width:92vw;background:#fff;border:2px solid #7c3aed;border-radius:12px;padding:12px;font-size:13px;box-shadow:0 8px 24px rgba(0,0,0,.2);';
    document.body.appendChild(panel);
    renderFeynmanStep();
  }
  function feynmanPrompts(segIdx){
    var n = segments[segIdx].idxs.length;
    return '<b>🎤 Feynman · 段 ' + segIdx + '：' + segments[segIdx].name + '（' + n + ' 句）</b>'
      + '<ol style="margin:6px 0 6px 18px;padding:0;">'
      + '<li>不看原文，用大白话说这段在讲什么；</li>'
      + '<li>钩子链的逻辑桥是怎么衔接的？</li>'
      + '<li>换个场景还成立吗？举一个反例。</li>'
      + '</ol>'
      + '<div style="color:#6b7280;font-size:12px;">对着空气说出来，然后自评。</div>';
  }
  function renderFeynmanStep(){
    var panel = document.querySelector('.feynman-panel'); if(!panel) return;
    if(feynmanState.pos >= feynmanState.list.length){
      panel.innerHTML = '<b>🎤 Feynman 小结</b><br>过了 <b>' + feynmanState.pass + '</b> 段 · 卡住 <b>' + feynmanState.stuck + '</b> 段 · 新入薄弱 <b>' + feynmanState.enrolled + '</b> 句'
        + '<br><button type="button" class="feynman-close" style="margin-top:8px;padding:4px 12px;border:1px solid currentColor;background:transparent;border-radius:6px;cursor:pointer;">关闭</button>';
      panel.querySelector('.feynman-close').addEventListener('click', closeFeynman);
      save(state); applyJudgeState(); renderDash();
      return;
    }
    var segIdx = feynmanState.list[feynmanState.pos];
    panel.innerHTML = feynmanPrompts(segIdx)
      + '<div style="margin-top:8px;display:flex;gap:6px;flex-wrap:wrap;">'
      + '<button type="button" class="feynman-pass" style="padding:4px 10px;border:1px solid #16a34a;background:#dcfce7;border-radius:6px;cursor:pointer;">✅ 过了</button>'
      + '<button type="button" class="feynman-stuck" style="padding:4px 10px;border:1px solid #dc2626;background:#fee2e2;border-radius:6px;cursor:pointer;">❌ 卡住了</button>'
      + '<button type="button" class="feynman-skip" style="padding:4px 10px;border:1px solid #9ca3af;background:transparent;border-radius:6px;cursor:pointer;">⏭ 跳过</button>'
      + '</div><div class="feynman-chips" style="margin-top:8px;"></div><div style="margin-top:6px;color:#6b7280;font-size:12px;">第 ' + (feynmanState.pos + 1) + ' / ' + feynmanState.list.length + ' 段</div>';
    panel.querySelector('.feynman-pass').addEventListener('click', function(){
      var rec = state.feynman[segIdx] || { tries: 0, passes: 0, last: '' };
      rec.tries++; rec.passes++; rec.last = todayKey();
      state.feynman[segIdx] = rec; save(state);
      feynmanState.pos++; feynmanState.pass++; renderFeynmanStep();
    });
    panel.querySelector('.feynman-skip').addEventListener('click', function(){
      feynmanState.pos++; renderFeynmanStep();
    });
    panel.querySelector('.feynman-stuck').addEventListener('click', function(){
      var chips = panel.querySelector('.feynman-chips');
      chips.innerHTML = '点选卡住的句子：' + segments[segIdx].idxs.map(function(idx){
        var t = sentences[idx] && sentences[idx].node ? sentences[idx].node.textContent.trim().slice(0, 26) : ('句' + idx);
        return '<button type="button" class="feynman-chip" data-idx="' + idx + '" style="margin:2px;padding:3px 8px;border:1px solid #9ca3af;background:#fff;border-radius:6px;cursor:pointer;font-size:12px;">' + idx + '. ' + t + '…</button>';
      }).join('')
        + '<br><button type="button" class="feynman-enroll" style="margin-top:6px;padding:4px 10px;border:1px solid #dc2626;background:#fee2e2;border-radius:6px;cursor:pointer;">确认入薄弱</button>';
      chips.querySelectorAll('.feynman-chip').forEach(function(ch){
        ch.addEventListener('click', function(){
          ch.classList.toggle('feynman-chip-on');
          ch.style.background = ch.classList.contains('feynman-chip-on') ? '#fecaca' : '#fff';
        });
      });
      chips.querySelector('.feynman-enroll').addEventListener('click', function(){
        var picked = chips.querySelectorAll('.feynman-chip-on');
        if(!picked.length){ alert('先点选至少一句卡住的句子（或返回点「✅ 过了」）。'); return; }
        picked.forEach(function(ch){
          var idx = +ch.getAttribute('data-idx');
          state.weak[idx] = true; state.streak[idx] = 0; feynmanState.enrolled++;
        });
        var rec = state.feynman[segIdx] || { tries: 0, passes: 0, last: '' };
        rec.tries++; rec.last = todayKey();
        state.feynman[segIdx] = rec; save(state);
        feynmanState.pos++; feynmanState.stuck++; renderFeynmanStep();
      });
    });
  }
  function closeFeynman(){
    var panel = document.querySelector('.feynman-panel'); if(panel) panel.remove();
    feynmanState = null;
  }

  // v2.24：智能跳转 — 根据用户当前状态决定先做哪件事
  function smartJumpToday(){
    // 优先级：薄弱 > 待复习轮 > 待升级阶梯 > 首次打卡 > 听写 > 挖空
    var weakCount = Object.keys(state.weak || {}).length;
    if(weakCount > 0 && !state.mode){
      // 有薄弱 + 不在打卡中 → 提示进入快刷
      toggleDrill();
      document.querySelector('.rv-drill').scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if(!state.mode && state.rounds.length === 0){
      // 首次：开第一轮
      startRound();
      return;
    }
    if(!state.mode && state.rounds.length > 0){
      // 已开过轮次但不在轮中 → 再开一轮复习
      startRound();
      return;
    }
    // 在轮中（state.mode = true）→ 滚到第一条未评卡的句
    var firstUnjudged = -1;
    for(var i = 0; i < sentences.length; i++){
      if(!state.done[i]){ firstUnjudged = i; break; }
    }
    if(firstUnjudged >= 0){
      var t = sentences[firstUnjudged].node;
      t.scrollIntoView({ behavior: 'smooth', block: 'center' });
      t.style.transition = 'background-color .3s';
      t.style.backgroundColor = '#fef3c7';
      setTimeout(function(){ t.style.backgroundColor = ''; }, 1800);
      return;
    }
    // 都评完了：跳挖空
    var cloze = document.querySelector('.emm-cloze');
    if(cloze){
      cloze.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
  }

  function renderSrMode(){
    var b = document.querySelector('.rv-srmode'); if(!b) return;
    var m = state.srMode || 'light';
    b.textContent = m === 'standard' ? '🧠 标准' : '📚 轻量';
    b.title = m === 'standard'
      ? 'SM-2 调度（Wozniak 1990）：到期句自动回炉薄弱清单，评「顺」按 ef/interval 排期毕业'
      : '连顺 ' + (state.streakToGoal || 3) + ' 轮毕业规则';
  }
  function renderAlgo(){
    var b = document.querySelector('.rv-algo'); if(!b) return;
    var algo = state.srAlgo || 'sm2';
    b.textContent = algo === 'fsrs' ? '🧮 FSRS' : '🧮 SM-2';
    b.title = algo === 'fsrs'
      ? 'FSRS-5 调度（DSR 三变量，请求保持率 90%）——点切回 SM-2'
      : 'SM-2 调度（Wozniak 1990，默认）——点切换到 FSRS-5';
  }
  // v2.39.0：02-sr.switchAlgo 经此钩子同步主内存（state.srAlgo + 转换后的 state.sr），
  // 否则 main 的 save(state) 全量覆写会把 store 里的 srAlgo/转换态抹掉（真机演示抓到的 bug）
  window.__emmAlgoSync = function(algo, srObj){
    state.srAlgo = algo;
    if (srObj) state.sr = srObj;
    save(state);
    renderAlgo();
    renderDash();
  };
  function renderGoal(){
    var b = document.querySelector('.rv-goal'); if(!b) return;
    var g = state.streakToGoal || 3;
    var isStd = state.srMode === 'standard';
    b.textContent = '🎯 连顺 ' + g + ' 轮';
    // v2.38.0：标准模式由 SR 驱动，连顺阈值不生效——禁用并说明，避免误导
    b.disabled = isStd;
    b.title = isStd ? '标准模式由 SM-2 到期驱动，连顺阈值不生效（切回轻量档可配置）' : '薄弱句需连顺 ' + g + ' 轮才自动毕业（点切换 2/3/4/5）';
    var sb = document.querySelector('.rv-srmode');
    if(sb && state.srMode !== 'standard'){
      sb.title = '连顺 ' + g + ' 轮毕业规则';
    }
  }

  // v2.25：段落测试（60 秒挖空挑战 + 自动批改给 0-100 分）
  var segTestTimer = null;
  function startSegTest(){
    var clozeEl = document.querySelector('.emm-cloze') || document.querySelector('#emm-cloze');
    if(!clozeEl){
      alert('本文没有可挖空的段落（缺 §11 挖空自测）。');
      return;
    }
    // inputs 是 live HTML 元素的list，不依赖 clozeEl 容器（h2 内没有 input）
    var inputs = document.querySelectorAll('input.emm-clz');
    if(!inputs.length){
      alert('本篇挖空区为空或失配（?check=1 查看详情）。');
      return;
    }
    // 清空旧结果条 + 移除旧定时器
    if(segTestTimer){ clearInterval(segTestTimer); segTestTimer = null; }
    var oldBar = document.querySelector('.seg-test-bar');
    if(oldBar) oldBar.remove();
    // 滚动到挖空区
    clozeEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
    // 计时条
    var bar = document.createElement('div');
    bar.className = 'seg-test-bar';
    bar.style.cssText = 'position:fixed;top:12px;right:12px;z-index:9999;background:#fef3c7;border:2px solid #f59e0b;border-radius:10px;padding:8px 16px;font-size:14px;font-weight:700;color:#b45309;box-shadow:0 4px 12px rgba(0,0,0,.15);';
    bar.innerHTML = '📝 段落测试 <span class="seg-test-clock">60</span>s · 按提示填词，时间到自动批改';
    document.body.appendChild(bar);
    var clockEl = bar.querySelector('.seg-test-clock');
    var remaining = 60;
    var startTime = Date.now();
    segTestTimer = setInterval(function(){
      remaining--;
      if(clockEl) clockEl.textContent = remaining;
      if(remaining <= 10 && bar) bar.style.background = '#fee2e2';
      if(remaining <= 0){
        clearInterval(segTestTimer); segTestTimer = null;
        finishSegTest(inputs, bar, startTime);
      }
    }, 1000);
  }
  function finishSegTest(inputs, bar, startTime){
    var total = inputs.length;
    var okCount = 0;
    inputs.forEach(function(inp){
      // 调用 wireClz 已绑定的批改逻辑：通过触发 input 事件
      // 但 input 事件已被 wireClz 在 'change'/'input' 上处理过；直接读 className
      if(inp.classList.contains('emm-clz-ok')) okCount++;
    });
    var pct = total ? Math.round(okCount / total * 100) : 0;
    var durationSec = Math.round((Date.now() - startTime) / 1000);
    if(bar){
      bar.style.background = pct >= 80 ? '#dcfce7' : (pct >= 60 ? '#fef3c7' : '#fee2e2');
      bar.style.borderColor = pct >= 80 ? '#16a34a' : (pct >= 60 ? '#f59e0b' : '#b91c1c');
      bar.innerHTML = '🎯 段落测试结果：<b>' + okCount + ' / ' + total + ' 空正确</b> · 得分 <b>' + pct + '</b> 分 · 用时 ' + durationSec + ' 秒'
        + '<br><button type="button" onclick="this.parentNode.remove()" style="margin-top:6px;padding:4px 12px;border:1px solid currentColor;background:transparent;border-radius:6px;cursor:pointer;">关闭</button>';
      setTimeout(function(){ if(bar && bar.parentNode) bar.parentNode.removeChild(bar); }, 8000);
    }
    // 写入 state
    state.segTest = state.segTest || {};
    state.segTest.last = { score: pct, ok: okCount, total: total, date: todayKey(), durationSec: durationSec };
    save(state);
    renderDash();
  }

  // v2.21：导出/导入进度（换浏览器 / 换电脑 / 备份用）
  function exportProgress(){
    var s = null;
    try { s = JSON.parse(localStorage.getItem(keyOf()) || 'null'); } catch(e){}
    if(!s){ alert('当前没有可导出的进度。'); return; }
    var stamp = new Date().toISOString().slice(0,10);
    var h1 = (document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : (document.title || 'plan')).slice(0, 40);
    var blob = new Blob([JSON.stringify(s, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = h1.replace(/[^\w\u4e00-\u9fa5-]/g, '_') + '-emm-progress-' + stamp + '.json';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    var weakN = s.weak ? Object.keys(s.weak).length : 0;
    var roundsN = (s.rounds || []).length;
    var srN = s.sr ? Object.keys(s.sr).length : 0;
    alert('已导出：' + a.download + '\n薄弱 ' + weakN + ' 句 / 已完成 ' + roundsN + ' 轮 / SM-2 记录 ' + srN + ' 句');
  }
  // v2.29.0 EMM_ANKI_V229：导出 Anki/CSV（挖空卡 + 复述卡）
  // 卡片来源：① .sent 块（Front=中文翻译 .sent-zh，Back=英文原句 .sent-en 纯文本）
  //          ② 挖空输入框 .emm-clz（Front=挖空句上下文，Back=答案词）；静态 ______ 形态一并覆盖
  function csvCell(s){
    s = String(s == null ? '' : s);
    if(/[\t"\n\r]/.test(s)) s = '"' + s.replace(/"/g, '""') + '"';
    return s;
  }
  function exportAnki(){
    var cards = [];
    // ① 复述卡：中文提示 → 英文原句
    document.querySelectorAll('.sent').forEach(function(node){
      var en = node.querySelector('.sent-en'), zh = node.querySelector('.sent-zh');
      if(!en || !zh) return;
      var back = en.textContent.replace(/\s+/g, ' ').trim();
      var front = zh.textContent.replace(/\s+/g, ' ').trim();
      if(back && front) cards.push([front, back]);
    });
    // ② 挖空卡：带空句子 → 答案
    document.querySelectorAll('.emm-clz').forEach(function(inp){
      var ans = inp.getAttribute('data-ans') || '';
      var host = inp.closest('p, div, li');
      var ctx = host ? host.textContent.replace(/\s+/g, ' ').trim() : '';
      if(ans && ctx) cards.push([ctx, ans]);
    });
    // 静态挖空（______ 未被组件转换时）：从 .answer-toggle 段提取
    document.querySelectorAll('details.answer-toggle').forEach(function(dt){
      var ansDiv = dt.querySelector('.answer'); if(!ansDiv) return;
      var p = dt.previousElementSibling, hops = 0;
      while(p && hops < 3 && !/_{3,}/.test(p.textContent || '')){ p = p.previousElementSibling; hops++; }
      if(!p) return;
      var ctx = p.textContent.replace(/\s+/g, ' ').trim();
      var ans = ansDiv.textContent.replace(/^答案：?/, '').trim();
      if(ctx && ans) cards.push([ctx, ans]);
    });
    if(!cards.length){ alert('没有可导出的卡片（本篇似乎还没有逐句区或挖空内容）。'); return; }
    var lines = ['#separator:Tab', '#html:false', '#notetype:Basic', '#columns:Front\tBack', '#deck:英语背诵::' + ((document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : (document.title || 'plan')).slice(0, 30))];
    cards.forEach(function(c){ lines.push(csvCell(c[0]) + '\t' + csvCell(c[1])); });
    var blob = new Blob(['\ufeff' + lines.join('\r\n')], { type: 'text/csv;charset=utf-8' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    var stamp = new Date().toISOString().slice(0, 10);
    var h1 = (document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : (document.title || 'plan')).slice(0, 40);
    a.href = url;
    a.download = h1.replace(/[^\w\u4e00-\u9fa5-]/g, '_') + '-emm-anki-' + stamp + '.csv';
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(url); }, 1000);
    alert('已导出 ' + cards.length + ' 张卡片：' + a.download + '\n\nAnki 导入：文件 → 导入 → 选择此 CSV（分隔符已设为 Tab，映射第 1 列=Front、第 2 列=Back）。');
  }
  function importProgress(ev){
    var file = ev.target.files && ev.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      try {
        var obj = JSON.parse(String(reader.result || '{}'));
        if(typeof obj !== 'object' || !obj || Array.isArray(obj)) throw new Error('不是合法的进度 JSON（期望对象）');
        if(!obj.fingerprint && !obj.start && !obj.done && !obj.weak) throw new Error('JSON 缺少必备字段（fingerprint/start/done/weak）');
        if(obj.fingerprint && state.fingerprint && obj.fingerprint !== state.fingerprint){
          if(!confirm('⚠️ 导入的进度与当前方案指纹不一致。\n\n继续导入可能造成句号错位。\n\n确定要覆盖当前进度吗？')){
            ev.target.value = ''; return;
          }
        }
        var merged = Object.assign({}, state, obj);
        save(merged);
        state = loadState();
        applyJudgeState(); renderDash(); renderRound(); renderSrMode(); renderGoal(); renderDrill(); applyQuiz(); renderToday();
        alert('✅ 已导入 ' + file.name + '\n当前进度已替换为导入内容。');
      } catch(e){
        alert('❌ 导入失败：' + (e.message || 'JSON 解析错误'));
      }
      ev.target.value = '';
    };
    reader.readAsText(file);
  }

  function roundBtn(){ return document.querySelector('.rv-btn.rv-round'); }

  function renderRound(){
    var b = roundBtn(); if(!b) return;
    if(state.mode){
      b.textContent = '✅ 结束本轮（第 ' + (state.rounds.length + 1) + ' 轮）';
      b.onclick = endRound;
    } else {
      var wk = Object.keys(state.weak).length;
      b.textContent = wk ? ('▶ 开始本轮（第 ' + (state.rounds.length + 1) + ' 轮 · 薄弱 ' + wk + ' 句）') : ('▶ 开始本轮（第 ' + (state.rounds.length + 1) + ' 轮）');
      b.onclick = startRound;
    }
    var c = document.querySelector('.rv-count');
    if(c){
      var judged = Object.keys(state.done).length;
      c.textContent = state.mode ? ('已评 ' + judged + ' / ' + sentences.length + ' 句') : '';
    }
  }

  function startRound(){
    state.mode = true;
    save(state);
    document.body.classList.add('rv-mode');
    renderRound();
    window.scrollTo({ top: document.querySelector('.rv-bar').getBoundingClientRect().top + window.scrollY - 12, behavior: 'smooth' });
  }

  function endRound(){
    // v2.28 修复：把本轮 mutations（mode/rounds/weak/streak）放在 loadState 之后，
    // 避免 `state = loadState()` 覆盖本轮新写入的字段
    var d = new Date();
    var round = { date: d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'), ok: 0, bad: 0 };
    var goal = state.streakToGoal || 3;
    // 1. 先算 round 元数据（纯计算，不动 state）
    Object.keys(state.done).forEach(function(k){
      if(state.done[k] === 'ok'){ round.ok++; }
      else { round.bad++; }
    });
    // 2. 让 SR IIFE 通过 patchSr 写完 state.sr（先 dispatch → 后 reload）
    var doneSnapshot = Object.assign({}, state.done);
    if(typeof __emmDispatch === 'function') __emmDispatch('endRound', round, doneSnapshot);
    // 3. reload 拿到 SR 的 sr；再 apply 本轮的 mode/rounds/weak/streak mutations
    state = loadState();
    state.mode = false;
    var isStd = state.srMode === 'standard';
    Object.keys(doneSnapshot).forEach(function(k){
      if(isStd){
        // v2.38.0：标准模式由 SM-2 驱动——「顺」已由 srNext 排期到未来，直接毕业；
        // 「卡」留在 weak；到期句随后由 syncDueIntoWeak 统一回炉。streakToGoal 不参与。
        if(doneSnapshot[k] === 'ok'){
          delete state.weak[k]; delete state.streak[k]; delete state.done[k];
        } else {
          state.weak[k] = true; state.streak[k] = 0;
        }
      } else if(doneSnapshot[k] === 'ok'){
        if(state.weak[k]){ state.streak[k] = (state.streak[k] || 0) + 1; if(state.streak[k] >= goal){ delete state.weak[k]; delete state.streak[k]; delete state.done[k]; } }
      } else {
        state.weak[k] = true; state.streak[k] = 0;
      }
    });
    if(isStd) syncDueIntoWeak();
    state.rounds.push(round);
    state.done = {};
    save(state);
    document.body.classList.remove('rv-mode');
    applyJudgeState(); renderDash(); renderRound();
    // 再次 loadState 确保渲染时 state.sr 是最新的
    state = loadState();
    renderDash();
  }

  function judge(idx, v){
    state.done[idx] = v;
    save(state);
    var chips = sentences[idx].node.querySelectorAll('.rv-judge button');
    chips.forEach(function(b){
      var on = b.getAttribute('data-v') === v ? (v === 'ok' ? 'rv-ok-on' : 'rv-bad-on') : '';
      b.classList.remove('rv-ok-on', 'rv-bad-on');
      if(on) b.classList.add(on);
    });
    // v2.20 SR hook：仅通知，不立即计算（endRound 时批量算）
    if(typeof __emmDispatch === 'function') __emmDispatch('judge', idx, v);
    // 重新加载以拿到 SR IIFE 写入的 state.sr[idx].lastQ
    state = loadState();
    renderRound();
  }

  function applyJudgeState(){
    sentences.forEach(function(s, idx){
      var v = state.done[idx];
      s.node.querySelectorAll('.rv-judge button').forEach(function(b){
        b.classList.remove('rv-ok-on', 'rv-bad-on');
        var vv = b.getAttribute('data-v');
        if(v && vv === v) b.classList.add(v === 'ok' ? 'rv-ok-on' : 'rv-bad-on');
      });
      s.node.classList.toggle('rv-weakline', !!state.weak[idx]);
    });
    applyWeakStops();
    renderDrill();
  }

  function buildDashboard(){
    var dash = document.createElement('div');
    dash.className = 'rv-dash';
    dash.id = 'emm-dash';
    var bar = document.querySelector('.rv-bar');
    if(bar && bar.parentNode) bar.parentNode.insertBefore(dash, bar.nextSibling);
  }

  function renderDash(){
    var dash = document.querySelector('.rv-dash'); if(!dash) return;
    var total = sentences.length;
    var weakList = Object.keys(state.weak).map(Number).sort(function(a,b){ return a-b; });
    var judged = Object.keys(state.done).length;
    var pct = total ? Math.round(weakList.length ? ((total - weakList.length) / total * 100) : 100) : 0;
    var isStd = state.srMode === 'standard';
    var today = (function(){ var d = new Date(); return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0'); })();
    var srDueCount = isStd ? Object.keys(state.sr).filter(function(k){
      return state.sr[k] && state.sr[k].due && state.sr[k].due <= today;
    }).length : 0;
    var html = '<b>📊 复习仪表</b> · 本篇 ' + total + ' 句'
      + ' · 薄弱句 <b>' + weakList.length + '</b>'
      + (isStd ? ' · SM-2 待复习 <b>' + srDueCount + '</b>' : '')
      + ' · 已完成 ' + state.rounds.length + ' 轮'
      + '<div class="rv-progress"><i style="width:' + pct + '%"></i></div>';
    if(state.rounds.length){
      html += '<div>🗓 轮次记录：' + state.rounds.map(function(r, i){
        return '第' + (i+1) + '轮 ' + r.date + '（顺' + r.ok + '/卡' + r.bad + '）';
      }).join(' · ') + '</div>';
    }
    if(weakList.length){
      html += '<div style="margin-top:6px;"><b>🎯 薄弱句清单</b>'
        + (isStd ? '（标准模式：SM-2 到期自动回炉，评「顺」按 ef/interval 排期毕业）' : '（连顺 2 轮自动毕业）') + '：<br>'
        + weakList.map(function(idx){
          var txt = sentences[idx].text.slice(0, 60);
          return '<a href="#" data-jump="' + idx + '" style="color:#b91c1c;text-decoration:none;display:block;padding:2px 0;">#' + (idx+1) + ' ' + txt + (sentences[idx].text.length > 60 ? '…' : '') + '</a>';
        }).join('') + '</div>';
    } else {
      html += '<div style="margin-top:6px;">✅ 暂无薄弱句——开一轮打卡，卡壳句会自动进清单。</div>';
    }
    // v2.23：按段统计（多段才显示）
    if(segments.length > 1){
      var segRows = segments.map(function(s, i){
        var kids = parseSents(s.el) || [i];
        var sentTotal = kids.length;
        var sentWeak = kids.filter(function(k){ return state.weak[k]; }).length;
        var weakRate = sentTotal ? Math.round(sentWeak / sentTotal * 100) : 0;
        var st = (state.segTimes || {})[i];
        var minutes = (st && st.startTs && st.lastTs) ? Math.max(1, Math.round((st.lastTs - st.startTs) / 60000)) : null;
        var rateColor = weakRate > 60 ? '#b91c1c' : (weakRate > 30 ? '#d97706' : '#16a34a');
        return '<tr><td data-l="段">' + s.name + '</td><td data-l="句数">' + sentTotal + '</td><td data-l="薄弱"><span style="color:' + rateColor + '">' + weakRate + '%</span></td><td data-l="耗时">' + (minutes !== null ? minutes + ' 分钟' : '—') + '</td></tr>';
      }).join('');
      html += '<div style="margin-top:10px;"><b>📊 按段统计</b>（段名 / 句数 / 薄弱率 / 耗时）：<br>'
        + '<div class="emm-tblwrap"><table style="font-size:13px;border-collapse:collapse;margin-top:4px;"><thead><tr><th style="text-align:left;padding:2px 8px;">段</th><th style="padding:2px 8px;">句</th><th style="padding:2px 8px;">薄弱</th><th style="padding:2px 8px;">耗时</th></tr></thead>'
        + '<tbody>' + segRows + '</tbody></table></div></div>';
    }
    // v2.20：标准模式下显示 SM-2 间隔详情
    if(isStd && Object.keys(state.sr).length){
      var srKeys = Object.keys(state.sr).map(Number).sort(function(a,b){ return a-b; });
      html += '<div style="margin-top:10px;"><b>🧠 SM-2 间隔</b>（标准模式 · Wozniak 1990）：<br>'
        + srKeys.map(function(idx){
          var sr = state.sr[idx];
          if(!sr) return '';
          var txt = sentences[idx].text.slice(0, 50);
          var overdue = sr.due && sr.due <= today;
          return '<a href="#" data-jump="' + idx + '" style="display:inline-block;margin:2px 6px 2px 0;padding:3px 8px;border-radius:6px;'
            + 'background:' + (overdue ? '#fee2e2' : '#f3f4f6') + ';color:' + (overdue ? '#b91c1c' : '#374151') + ';text-decoration:none;">'
            + '#' + (idx+1) + ' ' + txt + (sentences[idx].text.length > 50 ? '…' : '')
            + ' · ef=' + sr.ef.toFixed(2)
            + ' · 间=' + sr.interval + 'd'
            + ' · ' + (sr.due || '?')
            + '</a>';
        }).join('')
        + '</div>';
    }
    dash.innerHTML = html;
    dash.querySelectorAll('[data-jump]').forEach(function(a){
      a.addEventListener('click', function(ev){
        ev.preventDefault();
        var idx = Number(a.getAttribute('data-jump'));
        var target = sentences[idx].node;
        target.scrollIntoView({ behavior: 'smooth', block: 'center' });
        target.style.transition = 'background-color .3s';
        target.style.backgroundColor = '#fef3c7';
        setTimeout(function(){ target.style.backgroundColor = ''; }, 1600);
      });
    });
  }


  /* ===== v2.9.0 dictation ===== */
  var dict = { active:false, idx:0, wrong:0, done:0 };
  var DK = null;

  function norm(s){
    s = (s || '').toLowerCase().replace(/['’]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
    var exp = { "it's":'it is', "don't":'do not', "can't":'cannot', "won't":'will not', "isn't":'is not', "aren't":'are not', "doesn't":'does not', "didn't":'did not', "i'm":'i am', "you're":'you are', "they're":'they are', "we're":'we are', "there's":'there is', "that's":'that is', "let's":'let us', "i'd":'i would', "i'll":'i will', "we'd":'we would', "he's":'he is', "she's":'she is' };
    var parts = s.split(' ').map(function(w){ return exp[w] || w; });
    // split contractions with spaces like "it s"
    var out = [];
    parts.forEach(function(w){
      if(w === 's' || w === 't' || w === 're' || w === 've' || w === 'll' || w === 'd' || w === 'm'){
        if(out.length){ out[out.length-1] = out[out.length-1]; }
      }
      out.push(w);
    });
    return out;
  }

  function align(user, orig){
    // LCS-based word alignment; returns array of {w, st} for orig words + extras
    var m = user.length, n = orig.length;
    var dp = [];
    for(var i = 0; i <= m; i++){ dp.push(new Array(n + 1).fill(0)); }
    for(var i = 1; i <= m; i++){
      for(var j = 1; j <= n; j++){
        dp[i][j] = (user[i-1] === orig[j-1]) ? dp[i-1][j-1] + 1 : Math.max(dp[i-1][j], dp[i][j-1]);
      }
    }
    var res = [];
    var i2 = m, j2 = n;
    while(i2 > 0 || j2 > 0){
      if(i2 > 0 && j2 > 0 && user[i2-1] === orig[j2-1]){
        res.push({ w: orig[j2-1], st: 'ok' }); i2--; j2--;
      } else if(j2 > 0 && (i2 === 0 || dp[i2][j2-1] >= dp[i2-1][j2])){
        res.push({ w: orig[j2-1], st: 'miss' }); j2--;
      } else if(i2 > 0){
        res.push({ w: user[i2-1], st: 'extra' }); i2--;
      }
    }
    return res.reverse();
  }

  function speak(text, cb){
    try {
      if(!('speechSynthesis' in window)){ if(cb) cb(false); return; }
      speechSynthesis.cancel();
      var u = new SpeechSynthesisUtterance(text);
      var vs = speechSynthesis.getVoices();
      var v = null;
      for(var i = 0; i < vs.length; i++){
        if(/en[-_]US/i.test(vs[i].lang)){ v = vs[i]; if(/(natural|google|microsoft)/i.test(vs[i].name)) break; }
      }
      if(v) u.voice = v;
      u.lang = 'en-US';
      u.rate = 1;
      if(cb){ u.onend = function(){ cb(true); }; u.onerror = function(){ cb(false); }; }
      speechSynthesis.speak(u);
    } catch(e){ if(cb) cb(false); }
  }

  function dictBarHtml(){
    return '<b>🎧 听写模式</b>'
      + '<button type="button" class="d-btn d-toggle">开始听写</button>'
      + '<span class="d-stat"></span>'
      + '<div class="d-panel" style="display:none;margin-top:8px;">'
      + '<div class="d-sent"></div>'
      + '<div><button type="button" class="d-btn d-play">▶ 播放</button>'
      + '<button type="button" class="d-btn d-again">🔁 重听</button></div>'
      + '<input type="text" class="d-input" placeholder="输入你听到的句子…" />'
      + '<div><button type="button" class="d-btn d-check">✔ 比对</button>'
      + '<button type="button" class="d-btn d-skip">跳过</button></div>'
      + '<div class="d-result"></div>'
      + '<div class="d-hint">全对自动下一句；有错的句子自动进入薄弱清单（与打卡共用），重听不限次。</div>'
      + '</div>';
  }

  function curText(){ return sentences[dict.idx].text; }

  function renderDict(){
    var bar = document.querySelector('.rv-dict'); if(!bar) return;
    var tog = bar.querySelector('.d-toggle');
    tog.textContent = dict.active ? '结束听写' : (dict.done ? '继续听写（' + dict.done + '/' + sentences.length + '）' : '开始听写');
    bar.querySelector('.d-stat').textContent = dict.active ? ('进度 ' + dict.done + '/' + sentences.length + ' · 错 ' + dict.wrong + ' 句') : '';
    var panel = bar.querySelector('.d-panel');
    panel.style.display = dict.active ? 'block' : 'none';
    if(dict.active){
      if(dict.idx >= sentences.length){ finishDict(); return; }
      bar.querySelector('.d-sent').textContent = '第 ' + (dict.idx + 1) + ' 句 / 共 ' + sentences.length + ' 句';
      bar.querySelector('.d-result').innerHTML = '';
      bar.querySelector('.d-input').value = '';
      speak(curText());
    }
    try { localStorage.setItem(DK, JSON.stringify(dict)); } catch(e){}
  }

  function finishDict(){
    dict.active = false;
    var bar = document.querySelector('.rv-dict');
    bar.querySelector('.d-result').innerHTML = '<b>🎉 本篇听写完成：错 ' + dict.wrong + ' 句已入薄弱清单，背诵打卡里连顺 2 轮即可毕业。</b>';
    dict.idx = 0; dict.done = 0;
    try { localStorage.setItem(DK, JSON.stringify(dict)); } catch(e){}
    renderDash();
  }

  function buildDict(){
    if(!('speechSynthesis' in window)) return; // no TTS, no bar
    DK = keyOf() + ':dict';
    try { var saved = JSON.parse(localStorage.getItem(DK) || 'null'); if(saved){ dict = saved; } } catch(e){}
    var bar = document.createElement('div');
    bar.className = 'rv-dict';
    bar.innerHTML = dictBarHtml();
    var anchor = document.querySelector('.rv-bar');
    if(anchor && anchor.parentNode) anchor.parentNode.insertBefore(bar, anchor.nextSibling);
    var tog = bar.querySelector('.d-toggle');
    tog.addEventListener('click', function(){
      dict.active = !dict.active;
      if(dict.active && dict.idx >= sentences.length){ dict.idx = 0; dict.done = 0; }
      renderDict();
    });
    bar.querySelector('.d-play').addEventListener('click', function(){ speak(curText()); });
    bar.querySelector('.d-again').addEventListener('click', function(){ speak(curText()); });
    bar.querySelector('.d-skip').addEventListener('click', function(){
      dict.idx++; renderDict();
    });
    bar.querySelector('.d-check').addEventListener('click', function(){
      var val = bar.querySelector('.d-input').value;
      var user = norm(val), orig = norm(curText());
      var res = align(user, orig);
      var html = res.map(function(r){
        var cls = r.st === 'ok' ? 'w-ok' : (r.st === 'miss' ? 'w-miss' : 'w-extra');
        return '<span class="' + cls + '">' + r.w.replace(/</g, '&lt;') + '</span>';
      }).join(' ');
      var misses = res.filter(function(r){ return r.st === 'miss'; }).length;
      var extras = res.filter(function(r){ return r.st === 'extra'; }).length;
      bar.querySelector('.d-result').innerHTML = html;
      if(!user.length){ return; }
      if(!misses && !extras && user.length === orig.length){
        dict.done++; dict.idx++;
        setTimeout(renderDict, 500);
      } else {
        if(!state.weak[dict.idx]){ state.weak[dict.idx] = true; save(state); applyJudgeState(); renderDash(); }
        dict.wrong++;
        bar.querySelector('.d-stat').textContent = '进度 ' + dict.done + '/' + sentences.length + ' · 错 ' + dict.wrong + ' 句';
      }
    });
    renderDict();
  }

  /* ===== v2.13.0 EMM_TODAY_V213: today view / quiz mode / ladder / workbook / self-check ===== */
  var segments = [];

  function todayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function parseDate(s){
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(s || '');
    return m ? new Date(+m[1], +m[2]-1, +m[3]) : new Date();
  }
  function diffDays(a, b){ return Math.round((b - a) / 86400000); }
  function addDays(d, n){ return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n); }

  /* ===== v2.38.0 EMM_SR_SCHED_V238: SM-2 真正驱动调度 =====
     标准模式下 state.weak 语义 = 「刚评卡的句」∪「SM-2 到期句」；
     评「顺」由 SR 排期到未来即从 weak 毕业（不再靠连顺 N 轮），到期自动回炉。
     复用 weak 作为下游总线，快刷 / 宫殿红站 / 仪表盘 / 听写 / 影子跟读零改动。
     轻量模式完全不走这一层，行为与 v2.37 逐字一致。 */
  function srDueKeys(){
    if(!window.EMMSR || !window.EMMSR.dueKeys) return [];
    return window.EMMSR.dueKeys(state.sr || {}, todayKey());
  }
  function validDueCount(){
    return srDueKeys().filter(function(k){ var n = +k; return n >= 0 && n < sentences.length; }).length;
  }
  // 把到期句回炉进 weak；返回到期句数。只在标准模式生效。
  function syncDueIntoWeak(){
    if(state.srMode !== 'standard') return 0;
    var changed = 0;
    srDueKeys().forEach(function(k){
      var n = +k;
      if(n < 0 || n >= sentences.length) return;
      if(!state.weak[n]){ state.weak[n] = true; state.streak[n] = 0; changed++; }
    });
    if(changed) save(state);
    return validDueCount();
  }
  function icsDate(d){
    return '' + d.getFullYear() + String(d.getMonth()+1).padStart(2,'0') + String(d.getDate()).padStart(2,'0');
  }
  function detectSegments(){
    segments = [];
    var cur = null;
    var nodes = document.querySelectorAll('h2, h3, .sent');
    Array.prototype.forEach.call(nodes, function(el){
      if(el.matches('h2, h3')){
        var t = (el.textContent || '').trim();
        if(el.tagName === 'H2' && /^4\.\d+/.test(t)){
          var name = t.replace(/^4\.\d+\s*/, '').replace(/（[^）]*）/g, '').replace(/[·:：\s]+$/g, '').slice(0, 16);
          cur = { name: name || ('段' + (segments.length + 1)), el: el, idxs: [] };
          segments.push(cur);
        }
      } else {
        if(!cur){ cur = { name: '全文', el: null, idxs: [] }; segments.push(cur); }
        cur.idxs.push(el.__emmIdx);
      }
    });
    if(segments.length === 1 && !segments[0].el){
      var hs = document.querySelectorAll('h2');
      for(var i = 0; i < hs.length; i++){
        if(/精读/.test(hs[i].textContent)){ segments[0].el = hs[i]; break; }
      }
    }
  }
  function dayNumberOf(){ return diffDays(parseDate(state.start || todayKey()), parseDate(todayKey())) + 1; }
  function learnDayOf(i){ return Math.floor(i / (state.perDay || 1)) + 1; }
  function planDaysTotal(){
    if(!segments.length) return 1;
    return learnDayOf(segments.length - 1) + 15;
  }
  var REVIEW_OFF = [[1, '次日自测'], [3, '第3天只背错句'], [7, '第7天快背'], [15, '第15天快背']];

  /* —— 自测模式（P0：盖住复述，防假流利） —— */
  function wireQuiz(){
    var b = document.querySelector('.rv-quiz');
    if(!b) return;
    b.addEventListener('click', function(){
      state.quiz = ((state.quiz || 0) + 1) % 3;
      save(state); applyQuiz();
    });
    applyQuiz();
  }
  function applyQuiz(){
    document.body.classList.toggle('emm-quiz1', state.quiz >= 1);
    document.body.classList.toggle('emm-quiz2', state.quiz >= 2);
    var b = document.querySelector('.rv-quiz');
    if(b){
      b.textContent = '🙈 自测：' + ['关', '遮译文', '全遮'][state.quiz || 0];
      b.title = '遮住译文与注解复述（防假流利），点句子临时揭开核对；全遮同时隐藏行内标注样式';
    }
  }
  function wireReveal(){
    sentences.forEach(function(s){
      s.node.addEventListener('click', function(e){
        if(!state.quiz) return;
        if(e.target.closest('button, input, a, .rv-judge, .rv-dict')) return;
        s.node.classList.toggle('revealed');
      });
    });
  }

  /* —— 今日排期 + 复述阶梯（P0：让艾宾浩斯到期可见，让升级留痕） —— */
  var todayCard = null;
  function segHasToday(si){
    var ld = learnDayOf(si), dayN = dayNumberOf();
    if(ld === dayN) return true;
    for(var i = 0; i < REVIEW_OFF.length; i++){ if(ld + REVIEW_OFF[i][0] === dayN) return true; }
    return false;
  }
  function segTodayHtml(si){
    var ld = learnDayOf(si), dayN = dayNumberOf();
    if(ld === dayN) return '<b style="color:#b45309">📖 今天新学</b>（当晚睡前再完整背一遍）<a href="#emm-seg' + si + '">去背诵→</a>';
    for(var i = 0; i < REVIEW_OFF.length; i++){
      if(ld + REVIEW_OFF[i][0] === dayN){
        if(REVIEW_OFF[i][0] === 1) return '🔁 今天复习 · 次日自测 <a href="#emm-cloze">去自测→</a>';
        if(REVIEW_OFF[i][0] === 3) return '🔁 今天复习 · ' + REVIEW_OFF[i][1] + ' <a href="#emm-dash">看薄弱→</a>';
        return '🔁 今天复习 · ' + REVIEW_OFF[i][1];
      }
    }
    if(ld > dayN) return '🔒 Day ' + ld;
    return '<span style="color:#9ca3af">已学</span>';
  }
  // v2.21：把第 si 段设为「今天新学」——倒推 start 日期
  function setAsToday(si){
    if(!segments[si]) return;
    var today = parseDate(todayKey());
    var newStart = addDays(today, -(learnDayOf(si) - 1));
    var newKey = newStart.getFullYear() + '-' + String(newStart.getMonth()+1).padStart(2,'0') + '-' + String(newStart.getDate()).padStart(2,'0');
    state.start = newKey;
    save(state);
    renderToday();
    if(typeof __emmDispatch === 'function') __emmDispatch('startChange');
  }
  function buildTodayCard(){
    if(!segments.length) return;
    if(!state.start){ state.start = todayKey(); save(state); }
    segments.forEach(function(s, i){ if(s.el && !s.el.id){ s.el.id = 'emm-seg' + i; } });
    todayCard = document.createElement('div');
    todayCard.className = 'emm-today';
    todayCard.innerHTML = ''
      + '<b>📅 今日任务</b> <span class="emm-meta emm-dayline"></span><br>'
      + '<span class="emm-meta">开始日期 <input type="date" class="emm-start"> '
      + (segments.length > 1 ? ' · 每天新学 <select class="emm-perday"><option value="1">1 段</option><option value="2">2 段</option></select> ' : '')
      + '<button type="button" class="rv-btn emm-ics">📥 导出日历(.ics)</button></span>'
      + '<div class="emm-meta emm-order"></div>'
      + '<table><thead><tr><th style="width:26%">段落</th><th style="width:9%">排期</th><th>今日</th><th style="width:30%">🪜 复述阶梯</th><th style="width:6%">✓</th></tr></thead>'
      + '<tbody class="emm-rows"></tbody></table>'
      + '<div class="emm-meta">🪜 点你当前能稳定复述到的级别（升级前至少隔一轮复习，跳级=假流利）；✓ 勾掉今天完成的任务。与打卡进度同存本机。</div>';
    var bar = document.querySelector('.rv-bar');
    if(bar && bar.parentNode) bar.parentNode.insertBefore(todayCard, bar);
    var inp = todayCard.querySelector('.emm-start');
    inp.value = state.start;
    inp.addEventListener('change', function(){
      state.start = inp.value || todayKey();
      save(state); renderToday();
    });
    var sel = todayCard.querySelector('.emm-perday');
    if(sel){
      sel.value = String(state.perDay || 1);
      sel.addEventListener('change', function(){ state.perDay = +sel.value; save(state); renderToday(); });
    }
    todayCard.querySelector('.emm-ics').addEventListener('click', downloadICS);
    // v2.38.0：今日卡「SM-2 到期」直达快刷（到期句已在 weak，快刷天然可见）
    todayCard.addEventListener('click', function(e){
      if(!e.target.closest || !e.target.closest('.emm-due-drill')) return;
      if(!document.body.classList.contains('emm-drill')) toggleDrill();
      var bar = document.querySelector('.rv-bar');
      if(bar && typeof bar.scrollIntoView === 'function') bar.scrollIntoView({ behavior: 'smooth', block: 'center' });
    });
    var rows = todayCard.querySelector('.emm-rows');
    rows.addEventListener('click', function(e){
      var b = e.target.closest('.emm-lv'); if(b){
        var si = +b.getAttribute('data-seg');
        state.ladder[si] = { lv: +b.getAttribute('data-lv'), date: todayKey() };
        save(state); renderToday();
        return;
      }
      var s = e.target.closest('.emm-set-today'); if(s){
        var si2 = +s.getAttribute('data-seg');
        if(confirm('把第 ' + (si2+1) + ' 段移到今天学？\n\n会修改"开始日期"——其他段也会跟着顺延。')){
          setAsToday(si2);
        }
        return;
      }
    });
    rows.addEventListener('change', function(e){
      var c = e.target.closest('input.emm-donechk'); if(!c) return;
      var si = +c.getAttribute('data-seg');
      var k = todayKey() + '|s' + si;
      if(c.checked){
        state.log[k] = 1;
        // v2.23：记录段耗时（首次勾选=开始，最后一次勾选=结束）
        state.segTimes = state.segTimes || {};
        var st = state.segTimes[si] || {};
        if(!st.startTs){ st.startTs = Date.now(); }
        st.lastTs = Date.now();
        state.segTimes[si] = st;
      } else {
        delete state.log[k];
        if(state.segTimes && state.segTimes[si]){ delete state.segTimes[si].startTs; delete state.segTimes[si].lastTs; }
      }
      save(state);
    });
    renderToday();
  }
  function renderToday(){
    if(!todayCard) return;
    var dayN = dayNumberOf(), dl = todayCard.querySelector('.emm-dayline');
    if(dayN < 1){ dl.textContent = '· ⏳ 开始于 ' + state.start + '，还有 ' + (1 - dayN) + ' 天'; }
    else if(dayN > planDaysTotal()){ dl.textContent = '· 🎉 排期（' + planDaysTotal() + ' 天）已完成，建议每周全文快背一遍保持'; }
    else { dl.textContent = '· 第 ' + dayN + ' 天 / 计划约 ' + planDaysTotal() + ' 天'; }
    var html = '';
    segments.forEach(function(s, i){
      var lv = (state.ladder[i] || {}).lv || 0;
      var btns = '';
      // v2.22 渐进引导：未完成 L1 时锁住 L2-L5（必须先 L1 走通）
      var guided = lv === 0;
      for(var k = 1; k <= 5; k++){
        var disabled = guided && k > 1;
        btns += '<button type="button" class="emm-lv' + (lv >= k ? ' emm-lv-on' : '') + (disabled ? ' emm-lv-locked' : '') + '" data-seg="' + i + '" data-lv="' + k + '"' + (disabled ? ' disabled' : '') + ' title="' + (disabled ? '先完成 L' + (k-1) + ' 再解锁' : (lv ? '当前 L' + lv + ' · ' + state.ladder[i].date : '未定级')) + '">L' + k + '</button>';
      }
      var chk = segHasToday(i)
        ? '<input type="checkbox" class="emm-donechk" data-seg="' + i + '"' + (state.log[todayKey() + '|s' + i] ? ' checked' : '') + '>'
        : '';
      var ld = learnDayOf(i), dayN = dayNumberOf();
      // v2.21：每段加"设为今天新学"按钮（仅当该段不是今天时显示）
      var setToday = (ld !== dayN)
        ? '<button type="button" class="rv-btn emm-set-today" data-seg="' + i + '" title="把这一段移到今天学（会修改开始日期）">📌 设为今天</button>'
        : '<span style="color:#16a34a;font-size:12px;">✓ 当前</span>';
      html += '<tr><td data-l="段落">' + s.name + '</td><td data-l="排期">Day ' + learnDayOf(i) + '</td><td data-l="今日">' + segTodayHtml(i) + ' ' + setToday + '</td><td data-l="🪜 阶梯">' + btns + '</td><td data-l="✓">' + chk + '</td></tr>';
    });
    todayCard.querySelector('.emm-rows').innerHTML = html;
    renderTodayOrder(dayN);
  }
  // v2.37 复习优先：显式给出今日执行顺序（借鉴 m98/fluent 的 review-before-new + interleaving）。
  // 只加提示、不重排 tr——段号与 data-seg 的映射被多处测试与打卡逻辑依赖，重排会错位。
  function renderTodayOrder(dayN){
    var ord = todayCard && todayCard.querySelector('.emm-order');
    if(!ord) return;
    var reviews = [], learns = [];
    segments.forEach(function(s, i){
      var ld = learnDayOf(i);
      if(ld === dayN) learns.push(i);
      else if(REVIEW_OFF.some(function(r){ return ld + r[0] === dayN; })) reviews.push(i);
    });
    // v2.38.0：标准模式把 SR 到期句也并入今日任务（句级调度，与段级排期并存）
    var srDue = (state.srMode === 'standard') ? validDueCount() : 0;
    if(!reviews.length && !learns.length && !srDue){ ord.textContent = ''; return; }
    var html = '';
    if(reviews.length || learns.length){
      html += '<b>⏱ 今日顺序</b>：先复习到期段（' + reviews.length + '）→ 再新学（' + learns.length + '）'
        + (reviews.length + learns.length > 2 ? ' · 多段到期按 A→B→C→A 交错，别一段刷完再下一段' : '')
        + ' · 复习会话短于初学会话；忘掉 20~40% 是正常甜区';
    }
    if(srDue){
      html += (html ? '<br>' : '')
        + '🧠 SM-2 今日到期 <b>' + srDue + '</b> 句（已自动进薄弱清单，评「顺」按 ef/interval 排期毕业）'
        + ' <button type="button" class="rv-btn emm-due-drill">⚡ 开始快刷</button>';
    }
    ord.innerHTML = html;
  }
  function escICS(s){ return String(s).replace(/\\/g, '\\\\').replace(/([,;])/g, '\\$1'); }
  // v2.22：UTC 时间戳（spec 要求带 T 和 Z 后缀）
  function icsStampUTC(d){
    var pad = function(n){ return String(n).padStart(2,'0'); };
    return d.getUTCFullYear() + pad(d.getUTCMonth()+1) + pad(d.getUTCDate()) + 'T' +
      pad(d.getUTCHours()) + pad(d.getUTCMinutes()) + pad(d.getUTCSeconds()) + 'Z';
  }
  function downloadICS(){
    var title = (document.querySelector('h1') || { textContent: '背诵' }).textContent.replace(/背诵方案.*$/, '').trim() || '背诵';
    var start = parseDate(state.start || todayKey());
    // v2.22：X-WR-TIMEZONE 帮助日历 app 正确显示全天事件（避免跨时区/DST 偏移）
    var tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || 'UTC';
    var lines = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//english-memory-method//v2.22//CN',
      'CALSCALE:GREGORIAN',
      'X-WR-TIMEZONE:' + tz,
      'X-WR-CALNAME:' + escICS(title) + ' 背诵方案'
    ];
    var k = 0;
    segments.forEach(function(s, i){
      var ld = learnDayOf(i);
      var evts = [[ld - 1, '📖 背诵《' + title + '》· ' + s.name + '（当晚睡前再背一遍）']];
      REVIEW_OFF.forEach(function(r){ evts.push([ld - 1 + r[0], '🔁 复习《' + title + '》· ' + s.name + ' · ' + r[1]]); });
      evts.forEach(function(e){
        var dtStart = icsDate(addDays(start, e[0]));
        var dtEnd   = icsDate(addDays(start, e[0] + 1));  // v2.22：DTEND=下一天（iCal 规范，全天事件 exclusive）
        lines.push('BEGIN:VEVENT',
          'UID:emm-' + (k++) + '-' + dtStart + '-' + i + '@local',
          'DTSTAMP:' + icsStampUTC(new Date()),
          'DTSTART;VALUE=DATE:' + dtStart,
          'DTEND;VALUE=DATE:' + dtEnd,
          'SUMMARY:' + escICS(e[1]),
          'TRANSP:TRANSPARENT',
          'END:VEVENT');
      });
    });
    lines.push('END:VCALENDAR');
    var blob = new Blob([lines.join('\r\n')], { type: 'text/calendar;charset=utf-8' });
    var a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'emm-schedule.ics';
    document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
  }

  /* —— 亲手改造留白（P0：生成效应落地） —— */
  function buildWorkbook(){
    if(!state.wb) state.wb = { main: {}, pal: {} };
    segments.forEach(function(s, i){
      if(!s.el) return;
      var div = document.createElement('div');
      div.className = 'wb-line';
      div.innerHTML = '✍️ 我的一句话主线（亲手写，记忆翻倍）：<span class="wb-input" contenteditable="true" data-k="m' + i + '"></span>';
      s.el.parentNode.insertBefore(div, s.el.nextSibling);
    });
    var stops = document.querySelectorAll('.palace-stop');
    Array.prototype.forEach.call(stops, function(st, i){
      var div = document.createElement('div');
      div.className = 'wb-line';
      div.innerHTML = '🎨 我的画面：<span class="wb-input" contenteditable="true" data-k="p' + i + '"></span>';
      st.appendChild(div);
    });
    var timer = null;
    document.querySelectorAll('.wb-input').forEach(function(ed){
      var k = ed.getAttribute('data-k');
      var store = k.charAt(0) === 'p' ? state.wb.pal : state.wb.main;
      var idx = k.slice(1);
      if(store[idx]) ed.textContent = store[idx];
      ed.addEventListener('input', function(){
        store[idx] = ed.textContent.trim();
        clearTimeout(timer);
        timer = setTimeout(function(){ save(state); }, 400);
      });
    });
  }

  /* —— ?check=1 自检报告（P0：结构对齐可查；原文比对在生成端执行） —— */
  function selfCheck(){
    if(!/[?&]check/.test(location.search)) return;
    var L = ['EMM 自检报告（v2.13.0 · ?check=1）', '─ 分段识别', '句数：' + sentences.length];
    segments.forEach(function(s, i){
      L.push('段' + (i + 1) + ' [' + s.name + '] ' + s.idxs.length + ' 句' + (s.idxs.length ? '（第 ' + (s.idxs[0] + 1) + '~' + (s.idxs[s.idxs.length - 1] + 1) + ' 句）' : ''));
    });
    L.push('─ 结构对齐');
    var stops = document.querySelectorAll('.palace-stop');
    if(!stops.length){ L.push('— 宫殿：本篇未启用'); }
    else {
      var withData = Array.prototype.filter.call(stops, function(st){ return st.getAttribute('data-sents'); });
      var bad = [];
      Array.prototype.forEach.call(stops, function(st, i){
        var m = (st.querySelector('.st-no') || { textContent: '' }).textContent.match(/\d+/);
        if(!m || +m[0] !== i + 1) bad.push('第' + (i + 1) + '站标为' + (m ? m[0] : '?'));
      });
      if(withData.length === stops.length){
        var seen = {}, dups = [], missing = [];
        Array.prototype.forEach.call(stops, function(st){
          parseSents(st).forEach(function(ix){
            if(seen[ix]) dups.push('句' + (ix + 1)); else seen[ix] = true;
          });
        });
        for(var si = 0; si < sentences.length; si++){ if(!seen[si]) missing.push(si + 1); }
        var cover = (!dups.length && !missing.length) ? '✅' : '⚠';
        L.push(cover + ' 宫殿 data-sents 覆盖 ' + Object.keys(seen).length + ' / 句数 ' + sentences.length
          + (dups.length ? '；重复: ' + dups.join(',') : '')
          + (missing.length ? '；缺句: ' + missing.join(',') : ''));
      } else {
        L.push((stops.length === sentences.length ? '✅' : '⚠') + ' 宫殿站数 ' + stops.length + ' / 句数 ' + sentences.length
          + (stops.length !== sentences.length ? '（同站多物需为每站标注 data-sents）' : ''));
      }
      L.push(bad.length ? '⚠ 站号不连续：' + bad.join('、') : '✅ 站号 1..' + stops.length + ' 连续');
    }
    var nChain = document.querySelectorAll('.hook-chain').length;
    if(!nChain){ L.push('— 钩子链：未找到'); }
    else {
      var nSeg = document.querySelectorAll('.hook-chain .seg').length;
      var nBr = document.querySelectorAll('.hook-chain .bridge').length;
      var nAn = document.querySelectorAll('.hook-chain .anchor').length;
      L.push((nSeg === sentences.length ? '✅' : '⚠') + ' 句钩总数 ' + nSeg + ' / 句数 ' + sentences.length);
      L.push((nBr === nSeg - nChain ? '✅' : '⚠') + ' 逻辑桥 ' + nBr + '（期望 ' + (nSeg - nChain) + ' = 句钩数−段钩数）');
      L.push((nAn >= nSeg ? '✅' : '⚠') + ' 英文锚点 ' + nAn + ' / 句钩 ' + nSeg);
    }
    var dts = document.querySelectorAll('details.answer-toggle');
    if(!dts.length){ L.push('— 挖空：未找到'); }
    else {
      dts.forEach(function(dt){
        var p = dt.previousElementSibling, hops = 0;
        while(p && hops < 3 && !/_{3,}/.test(p.textContent || '')){ p = p.previousElementSibling; hops++; }
        var blanks = p ? ((p.textContent || '').match(/_{3,}/g) || []).length : 0;
        var ans = dt.querySelector('.answer');
        var words = ans ? (ans.textContent.replace(/^答案：?/, '').split(/[\/、，,]/).filter(function(w){ return w.trim(); })).length : 0;
        L.push(blanks && blanks === words ? '✅ 挖空：空数 ' + blanks + ' == 答案数 ' + words : '⚠ 挖空：空数 ' + blanks + ' ≠ 答案数 ' + words + '（' + (p ? p.textContent.trim().slice(0, 12) : '?') + '…）');
      });
    }
    // v2.23：内容可疑项（翻译长度比 / 答案词溯源 / 连读覆盖率 / IPA 音标校验）
    L.push('─ 内容可疑项');
    var transShort = 0, transLong = 0, pronCov = 0, ipaBad = 0;
    sentences.forEach(function(s, idx){
      var en = s.text.replace(/\s+/g, ' ').trim();
      var zh = (s.node.querySelector('.sent-zh') || { textContent: '' }).textContent.replace(/\s+/g, '').trim();
      var enLen = en.length, zhLen = zh.length;
      if(enLen > 0){
        var ratio = zhLen / enLen;
        if(ratio < 0.4){ transShort++; L.push('⚠ 句' + (idx+1) + ' 译文偏短（长度比 ' + ratio.toFixed(2) + '，疑似内容缺失）：' + en.slice(0, 30) + '…'); }
        else if(ratio > 1.8){ transLong++; L.push('⚠ 句' + (idx+1) + ' 译文偏长（长度比 ' + ratio.toFixed(2) + '，疑似翻译走样）：' + en.slice(0, 30) + '…'); }
      }
      // 连读覆盖
      var pron = s.node.querySelector('.pron');
      if(pron){ pronCov++; }
      // IPA 校验：所有 /.../ 包裹的字符串内不应含中文字符
      var pronText = pron ? pron.textContent : '';
      var ipaMatches = pronText.match(/\/[^\/\n]+\//g) || [];
      ipaMatches.forEach(function(ipa){
        if(/[\u4e00-\u9fff]/.test(ipa)){
          ipaBad++;
          L.push('⚠ 句' + (idx+1) + ' IPA 含中文（疑似音标写错或位置错乱）：' + ipa);
        }
      });
    });
    var pronPct = sentences.length ? Math.round(pronCov / sentences.length * 100) : 0;
    L.push((pronPct >= 50 ? '✅' : '⚠') + ' 连读注解覆盖 ' + pronCov + ' / ' + sentences.length + '（' + pronPct + '%，< 50% 时建议补标）');
    L.push((transShort + transLong === 0 ? '✅' : '⚠') + ' 译文长度比合理（' + (transShort + transLong) + ' 句可疑，需复核）');
    L.push((ipaBad === 0 ? '✅' : '⚠') + ' IPA 音标无中文字符（' + ipaBad + ' 处异常）');
    L.push('');
    L.push('— 逐句文本==原文、词汇/金句溯源需在生成端执行，见 SKILL.md「内容校验」清单');
    var rpt = document.createElement('div');
    rpt.className = 'emm-check-rpt';
    rpt.textContent = L.join('\n');
    var w = document.querySelector('.wrap') || document.body;
    w.insertBefore(rpt, w.firstChild);
  }

  /* ===== v2.14.0 EMM_DRILL_CLOZE_V214: weak-only drill / interactive cloze ===== */
  function renderDrill(){
    var b = document.querySelector('.rv-drill'); if(!b) return;
    var on = document.body.classList.contains('emm-drill');
    var n = Object.keys(state.weak).length;
    b.textContent = on ? '⚡ 快刷中（薄弱 ' + n + '）·退出' : '⚡ 只刷薄弱(' + n + ')';
    b.title = '只显示薄弱句，配合「开始本轮」5 分钟过完卡壳句；再点退出恢复全文';
  }
  function toggleDrill(){
    if(!document.body.classList.contains('emm-drill')){
      if(!Object.keys(state.weak).length){
        var d = document.querySelector('.rv-dash');
        if(d && typeof d.scrollIntoView === 'function'){
          d.scrollIntoView({ behavior: 'smooth', block: 'center' });
          d.style.transition = 'background-color .3s';
          d.style.backgroundColor = '#fef3c7';
          setTimeout(function(){ d.style.backgroundColor = ''; }, 1200);
        }
        renderDrill(); return;
      }
      document.body.classList.add('emm-drill');
    } else {
      document.body.classList.remove('emm-drill');
    }
    renderDrill();
  }

  function normJoin(s){ return norm(s).join(' '); }
  function markWeakByAnswer(ans){
    var a = normJoin(ans);
    for(var i = 0; i < sentences.length; i++){
      if(normJoin(sentences[i].text).indexOf(a) >= 0){
        if(!state.weak[i]){
          state.weak[i] = true; state.streak[i] = 0;
          save(state); applyJudgeState(); renderDash();
        }
        return;
      }
    }
  }
  function buildCloze(){
    var h2s = document.querySelectorAll('h2');
    for(var i = 0; i < h2s.length; i++){
      if(/挖空自测/.test(h2s[i].textContent)){ h2s[i].id = 'emm-cloze'; break; }
    }
    document.querySelectorAll('details.answer-toggle').forEach(function(dt){
      var p = dt.previousElementSibling, hops = 0;
      while(p && hops < 3 && !/_{3,}/.test(p.textContent || '')){ p = p.previousElementSibling; hops++; }
      if(!p) return;
      var ansDiv = dt.querySelector('.answer'); if(!ansDiv) return;
      var answers = ansDiv.textContent.replace(/^答案：?/, '').split(/[\/、，,]/).map(function(w){ return w.trim(); }).filter(Boolean);
      if(!answers.length) return;
      var totalBlanks = (p.textContent.match(/_{3,}/g) || []).length;
      var textBlanks = 0;
      Array.prototype.forEach.call(p.childNodes, function(node){
        if(node.nodeType === 3) textBlanks += (node.textContent.match(/_{3,}/g) || []).length;
      });
      if(totalBlanks !== answers.length || textBlanks !== totalBlanks) return; // 失配保护：保持静态
      var bi = 0;
      var frag = document.createDocumentFragment();
      Array.prototype.slice.call(p.childNodes).forEach(function(node){
        if(node.nodeType === 3){
          node.textContent.split(/(_{3,})/).forEach(function(pt){
            if(!pt) return;
            if(/^_{3,}$/.test(pt)){
              var ans = answers[bi] || '';
              var inp = document.createElement('input');
              inp.type = 'text'; inp.className = 'emm-clz';
              inp.setAttribute('autocomplete', 'off'); inp.setAttribute('spellcheck', 'false');
              inp.style.width = Math.max(6, ans.length + 2) + 'ch';
              inp.setAttribute('aria-label', '第' + (bi + 1) + '空');
              // 答案落 DOM 属性，供 Anki 导出读取（批改逻辑仍走闭包 ans，不受影响）
              inp.setAttribute('data-ans', ans);
              var mk = document.createElement('span'); mk.className = 'emm-clz-mark';
              wireClz(inp, mk, ans);
              frag.appendChild(inp); frag.appendChild(mk);
              bi++;
            } else {
              frag.appendChild(document.createTextNode(pt));
            }
          });
        } else {
          frag.appendChild(node);
        }
      });
      p.innerHTML = ''; p.appendChild(frag);
    });
  }
  function wireClz(inp, mk, ans){
    function grade(){
      var v = normJoin(inp.value), a = normJoin(ans);
      if(!v){
        inp.classList.remove('emm-clz-ok', 'emm-clz-bad');
        mk.textContent = ''; mk.className = 'emm-clz-mark';
        return;
      }
      if(v === a){
        inp.classList.add('emm-clz-ok'); inp.classList.remove('emm-clz-bad');
        mk.textContent = '✓'; mk.className = 'emm-clz-mark ok';
      } else {
        inp.classList.add('emm-clz-bad'); inp.classList.remove('emm-clz-ok');
        mk.textContent = '✗'; mk.className = 'emm-clz-mark bad';
        markWeakByAnswer(ans);
      }
    }
    inp.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); grade(); } });
    inp.addEventListener('blur', grade);
    inp.addEventListener('input', function(){
      inp.classList.remove('emm-clz-ok', 'emm-clz-bad');
      mk.textContent = ''; mk.className = 'emm-clz-mark';
    });
  }

  /* ===== v2.15.0 EMM_V215_STABLE: content fingerprint / palace data-sents ===== */
  function parseSents(st){
    var d = st.getAttribute('data-sents');
    if(!d) return null;
    return d.split(',').map(function(x){ return parseInt(x, 10) - 1; }).filter(function(x){ return !isNaN(x) && x >= 0; });
  }
  function contentFingerprint(){
    return sentences.map(function(s){ return s.text.length + ':' + s.text.slice(0, 32); }).join('|').slice(0, 4000);
  }
  function checkFingerprint(){
    var fp = contentFingerprint();
    if(!state.fingerprint){
      state.fingerprint = fp; save(state);
      return;
    }
    if(state.fingerprint === fp) return;
    var reset = true;
    try {
      reset = confirm('检测到方案内容已更新，旧的背诵进度（打卡/薄弱/阶梯）可能与新方案错位。\n\n确定＝重置进度（保留留白与开始日期）\n取消＝暂不处理（保留旧进度）');
    } catch(e){}
    if(reset){
      state.done = {}; state.streak = {}; state.weak = {}; state.rounds = [];
      state.mode = false; state.ladder = {}; state.log = {}; state.quiz = 0;
      state.sr = {};  // v2.20：清空 SM-2 间隔
    }
    state.fingerprint = fp;
    save(state);
  }

  /* ===== v2.16.0 EMM_MOBILE_V216: wrap tables for mobile horizontal scroll ===== */
  function wrapTables(){
    document.querySelectorAll('table').forEach(function(t){
      if(!t.parentNode || !t.parentNode.classList || t.parentNode.classList.contains('emm-tblwrap')) return;
      var d = document.createElement('div');
      d.className = 'emm-tblwrap';
      t.parentNode.insertBefore(d, t);
      d.appendChild(t);
    });
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();


/* ===== EMM_LIBRARY_V217: personal memory library (self-contained; no deps) ===== */
(function(){
  "use strict";

  /* ① 文章数据：由 AI 生成记忆库时填充。schema 见文末注释。 */
  var LIB = {
    generated: '{{DATE}}',
    articles: [
{{ARTICLES}}
    ]
  };

  /* —— 工具 —— */
  function esc(s){
    return String(s == null ? '' : s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
  }
  function norm(s){
    s = (s || '').toLowerCase().replace(/['’]/g, "'").replace(/[^a-z0-9' ]/g, ' ').replace(/\s+/g, ' ').trim();
    var exp = { "it's":'it is', "don't":'do not', "can't":'cannot', "won't":'will not', "isn't":'is not', "aren't":'are not', "doesn't":'does not', "didn't":'did not', "i'm":'i am', "you're":'you are', "they're":'they are', "we're":'we are', "there's":'there is', "that's":'that is', "let's":'let us', "i'd":'i would', "i'll":'i will', "we'd":'we would', "he's":'he is', "she's":'she is' };
    return s.split(' ').map(function(w){ return exp[w] || w; });
  }
  function normJoin(s){ return norm(s).join(' '); }
  function todayKey(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function diffDateDays(dstr){
    var m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(dstr || '');
    if(!m) return null;
    return Math.round((new Date() - new Date(+m[1], +m[2]-1, +m[3])) / 86400000);
  }
  /* v2.34.0：进度读取委托 EMMProgressStore（builder 注入本页第 1 个脚本块）。
     键约定与方案组件一致：emm-progress:<标识前 40 字>（本页用 article.key），
     以字符串键形态（keyArg）调用；缺失/损坏返回 null 的语义由 loadRaw 保证 */
  function progKey(article){ return 'emm-progress:' + (article.key || '').slice(0, 40); }
  function readProgress(article){ return EMMProgressStore.loadRaw(progKey(article)); }
  function progStats(article){
    var s = readProgress(article);
    if(!s) return null;
    var total = article.sents || 0;
    var weak = Object.keys(s.weak || {}).length;
    var rounds = (s.rounds || []).length;
    var pct = total ? Math.round(weak ? ((total - weak) / total * 100) : 100) : 0;
    var last = '';
    (s.rounds || []).forEach(function(r){ if(r && r.date && r.date > last) last = r.date; });
    Object.keys(s.ladder || {}).forEach(function(k){
      var d = (s.ladder[k] || {}).date; if(d && d > last) last = d;
    });
    Object.keys(s.log || {}).forEach(function(k){
      var d = k.split('|')[0]; if(d && d > last) last = d;
    });
    return { pct: pct, weak: weak, rounds: rounds, last: last };
  }
  function badgeClass(type){
    if(/演讲/.test(type)) return 'lib-badge lt-speech';
    if(/长文/.test(type)) return 'lib-badge lt-long';
    return 'lib-badge';
  }

  /* —— 书架 —— */
  var shelf, emptyBox, sessionBox, searchBox;

  function cardHtml(a, st){
    var meta = [];
    if(a.date) meta.push(a.date);
    if(a.sents) meta.push(a.sents + ' 句');
    if(a.words) meta.push('~' + a.words + ' 词');
    if(a.days) meta.push(a.days + ' 天计划');
    var html = '<div class="lc-top"><span class="lc-title">' + esc(a.title) + '</span>'
      + '<span class="' + badgeClass(a.type) + '">' + esc(a.type || '普通') + '</span></div>';
    html += '<div class="lc-meta">' + meta.join(' · ') + '</div>';
    if(st){
      html += '<div class="lc-prog">' + (st.rounds ? '已打卡 ' + st.rounds + ' 轮' : '已开始') + ' · 薄弱 ' + st.weak + ' 句 · ' + st.pct + '%</div>'
        + '<div class="lib-bar"><i class="' + (st.weak ? 'hasweak' : '') + '" style="width:' + st.pct + '%"></i></div>';
      if(st.weak) html += '<div class="lc-weak">🎯 ' + st.weak + ' 个薄弱句待连顺 2 轮毕业</div>';
      var ago = diffDateDays(st.last);
      if(st.last && ago != null && ago >= 14) html += '<span class="lib-flag">⏰ ' + ago + ' 天未复习，建议回温</span>';
    } else {
      html += '<div class="lib-start">尚未打开方案打卡——进度从打卡数据实时读取</div>';
    }
    html += '<div class="lc-btns">'
      + '<button type="button" class="lib-btn" data-drill="' + esc(a.key) + '">⚡ 轻刷</button>'
      + '<a class="lib-btn lib-btn-open" href="' + esc(a.file || '') + '">📖 打开原方案</a></div>';
    return html;
  }

  var statusFilter = 'all';  // v2.24：状态筛选 — 'all' | 'started' | 'weakest' | 'stale'
  function todayDateStr(){ var x = new Date(); return x.getFullYear() + '-' + String(x.getMonth()+1).padStart(2,'0') + '-' + String(x.getDate()).padStart(2,'0'); }
  function dayDiff(d){ if(!d) return Infinity; var t = todayDateStr(); var a = new Date(t), b = new Date(d); return Math.round((a - b) / 86400000); }
  function matchesStatus(article){
    if(statusFilter === 'all') return true;
    var st = progStats(article);
    if(statusFilter === 'started') return !!st;
    if(statusFilter === 'weakest'){
      if(!st) return false;
      var total = article.sents || 0;
      var weak = st.weak || 0;
      return total && (weak / total) >= 0.3;  // 薄弱 ≥ 30%
    }
    if(statusFilter === 'stale'){
      if(!st || !st.last) return false;
      return dayDiff(st.last) >= 14;
    }
    return true;
  }

  function renderShelf(){
    var q = normLike(searchBox.value || '');
    var n = LIB.articles.length, totalSents = 0, started = 0, shown = 0;
    var html = '';
    LIB.articles.forEach(function(a, i){
      totalSents += a.sents || 0;
      var st = progStats(a);
      if(st) started++;
      if(!matchesStatus(a)) return;
      if(q){
        var hay = normLike([a.title, a.topic, a.type, a.file].concat(chainText(a)).join(' '));
        if(hay.indexOf(q) < 0) return;
      }
      shown++;
      html += '<div class="lib-card" data-idx="' + i + '">' + cardHtml(a, st) + '</div>';
    });
    // v2.41.0：跨方案交错轻刷入口（≥2 篇有链回忆数据时显示）
    var interIdxs = [];
    LIB.articles.forEach(function(a, i){
      var hasSteps = (a.chain || []).some(function(c){ return (c.steps || []).length; });
      if(hasSteps) interIdxs.push(i);
    });
    var toolbar = '';
    if(interIdxs.length >= 2){
      toolbar = '<div class="lib-inter" style="margin-bottom:12px;"><button type="button" class="lib-btn" id="emm-lib-inter">🔀 交错轻刷（' + interIdxs.length + ' 篇 · 链回忆混排）</button> <span style="color:#6b7280;font-size:12px;">按 A→B→C→A 轮转混排各篇钩子步，对抗块状复习（interleaving）</span></div>';
    }
    shelf.innerHTML = toolbar + html;
    emptyBox.hidden = !(n === 0 || (q && !shown));
    emptyBox.innerHTML = n === 0
      ? '<p><b>记忆库还是空的。</b></p><p>先用背诵法生成第一篇方案（<b>&lt;topic&gt;-memorization-plan.html</b>），</p><p>然后对 AI 说「<b>更新记忆库</b>」，它会把所有方案汇进这里。</p>'
      : '<p>没有匹配「' + esc(searchBox.value) + '」的文章。</p>';
    var sub = headerSub();
    if(sub) sub.textContent = '已收录 ' + n + ' 篇 · 共 ' + totalSents + ' 句 · ' + (started ? started + ' 篇已有打卡进度' : '暂无打卡记录') + ' · 汇总于 ' + (LIB.generated || '?');
    shelf.querySelectorAll('[data-drill]').forEach(function(b){
      b.addEventListener('click', function(){
        var key = b.getAttribute('data-drill');
        for(var i = 0; i < LIB.articles.length; i++){ if(LIB.articles[i].key === key){ openSession(i); return; } }
      });
    });
    var inter = shelf.querySelector('#emm-lib-inter');
    if(inter) inter.addEventListener('click', function(){ openInterleaved(interIdxs); });
  }

  /* —— v2.41.0 跨方案交错轻刷（链回忆混排；结果不落盘）——
     池 = 有 chain 数据的方案；顺序 = 轮转混排（第 r 轮取每篇第 r 个 step）：A1→B1→C1→A2→B2→C2，
     对抗块状复习（Rohrer & Taylor 2007 interleaving）；结算按方案分组 + 各自 ?jump= 回链。 */
  var curI = null; /* { arts, seq:[{ai,a,step}], pos, mi:{'ai:sidx':true} } */
  function openInterleaved(idxs){
    var arts = idxs.map(function(i){ return LIB.articles[i]; });
    var flat = arts.map(function(a){
      var steps = [];
      (a.chain || []).forEach(function(c){ (c.steps || []).forEach(function(s){ steps.push(s); }); });
      return steps;
    });
    var maxLen = 0;
    flat.forEach(function(s){ if(s.length > maxLen) maxLen = s.length; });
    var seq = [];
    for(var r = 0; r < maxLen; r++){
      for(var i = 0; i < arts.length; i++){
        if(flat[i][r]) seq.push({ ai: i, a: arts[i], step: flat[i][r] });
      }
    }
    if(!seq.length){ alert('所选方案没有链回忆数据。'); return; }
    curI = { arts: arts, seq: seq, pos: 0, mi: {} };
    renderInterStep();
    sessionBox.hidden = false;
    shelf.hidden = true;
    emptyBox.hidden = true;
    sessionBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function renderInterStep(){
    if(!curI) return;
    var it = curI.seq[curI.pos];
    var s = it.step;
    var last = curI.pos === curI.seq.length - 1;
    var html = '<div class="ls-head"><button type="button" class="ls-back" id="emm-lib-inter-back">← 返回书架</button>'
      + '<h2>🔀 交错轻刷（' + curI.arts.length + ' 篇）</h2><span class="ls-stage">第 ' + (curI.pos + 1) + ' / ' + curI.seq.length + ' 步</span></div>'
      + '<p class="ls-hint">跨方案混排：刚想完 A 篇，马上切 B 篇——切换语境本身就是在练提取。结果不落盘。</p>'
      + '<div class="ls-step"><div class="ls-hook">'
      + '<span class="ls-no">' + esc(s.sidx || '?') + '</span>'
      + '<span class="ls-hw">' + esc(s.h) + '</span>'
      + (s.b ? '<span class="ls-bridge">' + esc(s.b) + '</span>' : '')
      + (s.a ? '<span class="ls-anchor">[' + esc(s.a) + ']</span>' : '')
      + '<span class="ls-see">点看原句</span>'
      + '<button type="button" class="ls-mark" data-mi="' + it.ai + ':' + esc(s.sidx || '') + '">卡了</button></div>'
      + '<div class="ls-en">' + esc(s.en || ('（缺原句数据：' + esc(s.h) + '）')) + '</div></div>'
      + '<div style="margin:8px 0;color:#6b7280;font-size:12px;">来自《' + esc(it.a.title) + '》</div>'
      + '<div class="ls-actions"><button type="button" class="ls-next" id="emm-lib-inter-next">' + (last ? '查看结算 ▶' : '下一位 ▶') + '</button></div>';
    sessionBox.innerHTML = html;
    sessionBox.querySelector('#emm-lib-inter-back').addEventListener('click', closeSession);
    var hook = sessionBox.querySelector('.ls-hook');
    hook.addEventListener('click', function(e){
      if(e.target.closest('.ls-mark')) return;
      hook.parentNode.classList.toggle('open');
    });
    var mark = sessionBox.querySelector('.ls-mark');
    mark.addEventListener('click', function(){
      mark.classList.toggle('on');
      var sid = mark.getAttribute('data-mi');
      if(mark.classList.contains('on')) curI.mi[sid] = true; else delete curI.mi[sid];
    });
    sessionBox.querySelector('#emm-lib-inter-next').addEventListener('click', function(){
      curI.pos++;
      if(curI.pos >= curI.seq.length) renderInterSummary(); else renderInterStep();
    });
  }
  function renderInterSummary(){
    if(!curI) return;
    var nMi = Object.keys(curI.mi).length;
    var html = '<div class="ls-head"><button type="button" class="ls-back" id="emm-lib-inter-back">← 返回书架</button>'
      + '<h2>🔀 交错轻刷 · 结算</h2><span class="ls-stage">③ 结算</span></div>';
    html += '<div class="ls-sum">🔁 链回忆：自判卡壳 <b>' + nMi + '</b> 步（共 ' + curI.seq.length + ' 步）'
      + (nMi ? '' : ' —— 全部顺畅，记忆保持得很好 🎉') + '</div>';
    if(nMi){
      html += '<div class="ls-miss"><b>建议回原方案补打卡的句子</b>（轻刷不落盘，打卡/薄弱清单以原方案为准）：</br>';
      curI.arts.forEach(function(a, ai){
        var sids = Object.keys(curI.mi).filter(function(k){ return k.indexOf(ai + ':') === 0; }).map(function(k){ return k.split(':')[1]; });
        if(!sids.length) return;
        html += '· 《' + esc(a.title) + '》第 ' + esc(sids.join(', ')) + ' 句';
        if(a.file) html += ' <a class="lib-btn" style="padding:2px 8px;font-size:12px;" href="' + esc(a.file) + '?jump=' + encodeURIComponent(sids.slice(0, 5).join(',')) + '">🎯 补打卡</a>';
        html += '<br>';
      });
      html += '</div>';
    }
    html += '<div class="ls-actions"><button type="button" class="ls-back" id="emm-lib-done">完成</button></div>';
    sessionBox.innerHTML = html;
    sessionBox.querySelector('#emm-lib-inter-back').addEventListener('click', closeSession);
    sessionBox.querySelector('#emm-lib-done').addEventListener('click', closeSession);
  }
  function headerSub(){ return document.querySelector('header .lib-sub'); }

  /* ===== v2.30 EMM_TODAYALL_V230 + EMM_VOCAB_V230: 今日全局排期条 + 跨方案生词本（词级 SM-2）=====
     排期条聚合各篇 emm-progress:* 的到期/进行状态（精确到段的排期仍在各方案页）；
     生词本从薄弱句锚词提取候选，逐词确认入本，每词独立 SM-2（与方案组件 srNext 同参数：
     ef 初始 2.5，✓=q4 / ✗=q2），存 emm-vocab:v1；reps≥2 且 interval≥7 视为毕业。 */
  function srNextWord(q, prev){
    prev = prev || {ef: 2.5, interval: 0, reps: 0, due: '', lastQ: null};
    var ef = prev.ef || 2.5;
    var reps = prev.reps || 0;
    var interval;
    if(q < 3){ reps = 0; interval = 1; }
    else {
      if(reps === 0) interval = 1;
      else if(reps === 1) interval = 6;
      else interval = Math.max(1, Math.round((prev.interval || 1) * ef));
      reps = reps + 1;
    }
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if(ef < 1.3) ef = 1.3;
    var d = new Date(); d.setDate(d.getDate() + interval);
    var due = d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
    return {ef: ef, interval: interval, reps: reps, due: due, lastQ: q};
  }
  function vocabLoad(){
    try { return JSON.parse(localStorage.getItem('emm-vocab:v1') || '{}'); } catch(e){ return {}; }
  }
  function vocabSave(v){ try { localStorage.setItem('emm-vocab:v1', JSON.stringify(v)); } catch(e){} }
  function isGraduated(w){ return (w.reps || 0) >= 2 && (w.interval || 0) >= 7; }

  function buildTodayAll(){
    var box = document.getElementById('emm-lib-todayall');
    if(!box) return;
    if(!LIB.articles.length){ box.hidden = true; return; }
    var today = todayDateStr();
    var rows = [];
    LIB.articles.forEach(function(a){
      var s = readProgress(a);
      if(!s) return;
      var dueN = 0, weakN = 0;
      Object.keys(s.sr || {}).forEach(function(k){ var w = s.sr[k] || {}; if(w.due && w.due <= today) dueN++; });
      weakN = Object.keys(s.weak || {}).length;
      var flags = [], mins = 0;
      var dayN = s.start ? (dayDiff(s.start) + 1) : 0;
      var learning = !!(s.start && a.days && dayN >= 1 && dayN <= a.days);
      if(learning){ flags.push('<span class="ta-flag ta-new">▶ 新学中 Day ' + dayN + '/' + a.days + '</span>'); mins += 15; }
      if(dueN){ flags.push('<span class="ta-flag ta-due">🔁 到期 ' + dueN + ' 句</span>'); mins += Math.min(10, dueN); }
      if(weakN){ flags.push('<span class="ta-flag ta-weak">🎯 薄弱 ' + weakN + '</span>'); }
      if(!flags.length) return;
      rows.push({ title: a.title || a.topic, file: a.file, flags: flags.join(' '), mins: mins, due: dueN, learning: learning });
    });
    rows.sort(function(x, y){ return (y.due - x.due) || ((y.learning ? 1 : 0) - (x.learning ? 1 : 0)) || (y.mins - x.mins); });
    var totalMin = 0; rows.forEach(function(r){ totalMin += r.mins; });
    var html = '<h3>📅 今日全局（跨篇排期一览 · 精确到段的排期在各方案页「📅 今日任务」卡）</h3>';
    if(!rows.length){
      html += '<div class="ta-empty">今天没有到期的复习——背一篇新的，或休息 🌴。</div>';
    } else {
      rows.forEach(function(r){
        html += '<div class="ta-row"><a href="' + esc(r.file || '') + '"><b>《' + esc(r.title) + '》</b></a>' + r.flags
          + '<span class="ta-time">预计 ~' + r.mins + ' 分钟</span></div>';
      });
      var load = rows.length > 3 ? ' · ⚠ 今天有 ' + rows.length + ' 篇待动，建议先清「到期句数」最多的两篇，其余顺延' : '';
      html += '<div style="font-size:12.5px;color:var(--muted);margin-top:6px;">共 ' + rows.length + ' 篇待动 · 预计总时长 ~' + totalMin + ' 分钟' + load + '</div>';
    }
    box.innerHTML = html;
    box.hidden = false;
  }

  function wordNorm(w){ return String(w || '').toLowerCase().replace(/[\[\]()，,。.]/g, '').trim(); }
  function collectCandidates(){
    var seen = {};
    var out = [];
    LIB.articles.forEach(function(a){
      var s = readProgress(a);
      var weak = (s && s.weak) || {};
      (a.chain || []).forEach(function(c){
        (c.steps || []).forEach(function(st){
          if(!weak[String((st.sidx || 1) - 1)]) return;
          String(st.a || '').split(/\s+/).forEach(function(raw){
            var w = wordNorm(raw);
            if(!w || w.length < 2) return;
            if(!seen[w]){
              seen[w] = true;
              out.push({ word: w, h: st.h || '', en: st.en || '', title: a.title || a.topic, file: a.file || '', sidx: st.sidx || 1 });
            }
          });
        });
      });
    });
    return out;
  }
  function renderCands(box){
    var zone = box.querySelector('.vc-cands');
    if(!zone) return;
    var words = vocabLoad().words || {};
    var cands = collectCandidates().filter(function(c){ return !words[c.word]; });
    if(!cands.length){
      zone.innerHTML = '<div class="vc-src" style="padding:6px 0;">没有新的候选（薄弱句锚词都已入册，或还没有薄弱句）。</div>';
      return;
    }
    var h = '<div class="vc-sub">候选 ' + cands.length + ' 词（来自当前薄弱句，点「+ 入本」确认）：</div>';
    cands.forEach(function(c){
      h += '<div class="vc-word"><span class="vc-w">' + esc(c.word) + '</span>'
        + '<span class="vc-src">《' + esc(c.title) + '》· 句钩「' + esc(c.h) + '」· 第 ' + c.sidx + ' 句</span>'
        + '<button type="button" class="vc-mini vc-add" data-w="' + esc(c.word) + '">+ 入本</button>'
        + (c.en ? '<div class="vc-en">' + esc(c.en) + '</div>' : '')
        + '</div>';
    });
    zone.innerHTML = h;
    zone.querySelectorAll('.vc-add').forEach(function(b){
      b.addEventListener('click', function(){
        var w = b.getAttribute('data-w');
        var src = null;
        collectCandidates().forEach(function(x){ if(x.word === w && !src) src = x; });
        var st = vocabLoad(); st.words = st.words || {};
        if(!st.words[w]) st.words[w] = srNextWord(4, null);
        st.words[w].src = [{ t: src ? src.title : w, file: src ? src.file : '', sidx: src ? src.sidx : 1, h: src ? src.h : '', en: src ? src.en : '' }];
        vocabSave(st);
        renderCands(box);
        var cnt = box.querySelector('.vc-counts');
        if(cnt){ var all = vocabLoad().words || {}; cnt.textContent = '在册 ' + Object.keys(all).length + ' 词'; }
      });
    });
  }
  function buildVocab(){
    var box = document.getElementById('emm-lib-vocab');
    if(!box) return;
    if(!LIB.articles.length){ box.hidden = true; return; }
    renderVocab();
    box.hidden = false;
  }
  function renderVocab(){
    var box = document.getElementById('emm-lib-vocab');
    if(!box) return;
    var words = vocabLoad().words || {};
    var today = todayDateStr();
    var dueList = [], upcoming = 0, grad = 0;
    Object.keys(words).forEach(function(w){
      var it = words[w];
      if(isGraduated(it)){ grad++; return; }
      if(it.due && it.due <= today) dueList.push(w);
      else upcoming++;
    });
    var html = '<h3>📖 我的生词本</h3>'
      + '<div class="vc-sub"><span class="vc-counts">在册 ' + Object.keys(words).length + ' 词</span> · 已毕业 ' + grad + ' · 跨方案收集薄弱句锚词，逐词确认入本，SM-2 调度复习。</div>'
      + '<div class="vc-actions"><button type="button" class="vc-btn vc-extract">🔎 从薄弱句提取候选</button>'
      + '<button type="button" class="vc-btn vc-toggle-all">展开/收起在册词</button></div>'
      + '<div class="vc-cands"></div>';
    if(!Object.keys(words).length){
      html += '<div class="vc-src">还没有在册生词——先在方案里打卡，薄弱句的锚词会出现在「提取候选」里。</div>';
    } else if(!dueList.length){
      html += '<div class="vc-src">今天没有到期的生词 🎉（待复习 ' + upcoming + ' 词 · 已毕业 ' + grad + ' 词）。</div>';
    } else {
      html += '<div class="vc-sub" style="margin-top:6px;"><b>今日到期 ' + dueList.length + ' 词</b></div>';
      dueList.forEach(function(w){
        var it = words[w];
        var src = (it.src && it.src[0]) || {};
        html += '<div class="vc-word"><span class="vc-w">' + esc(w) + '</span>'
          + '<span class="vc-src">来自《' + esc(src.t || '') + '》· 句钩「' + esc(src.h || '') + '」</span>'
          + '<button type="button" class="vc-mini vc-ok" data-w="' + esc(w) + '">✓ 认识</button>'
          + '<button type="button" class="vc-mini vc-no" data-w="' + esc(w) + '">✗ 忘了</button>'
          + '<button type="button" class="vc-mini vc-del" data-w="' + esc(w) + '">移除</button>'
          + (src.en ? '<div class="vc-en">' + esc(src.en) + '</div>' : '')
          + '</div>';
      });
    }
    box.innerHTML = html;

    box.querySelector('.vc-extract').addEventListener('click', function(){ renderCands(box); });
    box.querySelector('.vc-toggle-all').addEventListener('click', function(){
      var zone = box.querySelector('.vc-cands');
      if(zone && zone.querySelector('.vc-word')){ zone.innerHTML = ''; return; }
      var all = vocabLoad().words || {};
      var keys = Object.keys(all);
      if(!keys.length){ zone.innerHTML = '<div class="vc-src" style="padding:6px 0;">在册为空。</div>'; return; }
      var h = '<div class="vc-sub">在册 ' + keys.length + ' 词：</div>';
      keys.forEach(function(w){
        var it = all[w];
        h += '<div class="vc-word"><span class="vc-w">' + esc(w) + '</span>'
          + '<span class="vc-src">间隔 ' + (it.interval || 0) + ' 天 · 到期 ' + (it.due || '?') + '</span>'
          + (isGraduated(it) ? '<span class="vc-grad">已毕业</span>' : '')
          + '<button type="button" class="vc-mini vc-del" data-w="' + esc(w) + '">移除</button></div>';
      });
      zone.innerHTML = h;
      zone.querySelectorAll('.vc-del').forEach(function(b){
        b.addEventListener('click', function(){
          var st = vocabLoad(); st.words = st.words || {};
          delete st.words[b.getAttribute('data-w')];
          vocabSave(st);
          renderVocab();
        });
      });
    });
    box.querySelectorAll('.vc-ok,.vc-no,.vc-del').forEach(function(b){
      b.addEventListener('click', function(){
        var w = b.getAttribute('data-w');
        var st = vocabLoad(); st.words = st.words || {};
        if(b.classList.contains('vc-del')){ delete st.words[w]; }
        else { st.words[w] = srNextWord(b.classList.contains('vc-ok') ? 4 : 2, st.words[w]); }
        vocabSave(st);
        renderVocab();
      });
    });
  }
  function chainText(a){
    var out = [];
    (a.chain || []).forEach(function(c){
      if(c.para) out.push(c.para);
      (c.steps || []).forEach(function(s){ out.push(s.h, s.a, s.en); });
    });
    return out;
  }
  function normLike(s){
    return String(s || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /* —— 轻刷会话（结果不落盘） —— */
  var cur = null; /* { a, mi (链回忆卡壳 sidx 集合), ci (挖空错空计数), clzTotal } */

  function openSession(idx){
    var a = LIB.articles[idx];
    cur = { a: a, mi: {}, clzBad: {}, clzTotal: 0 };
    renderChain();
    sessionBox.hidden = false;
    shelf.hidden = true; /* shelf is a div; hide while drilling */
    emptyBox.hidden = true;
    sessionBox.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  function closeSession(){
    cur = null;
    curI = null;
    sessionBox.hidden = true;
    sessionBox.innerHTML = '';
    shelf.hidden = false;
    renderShelf();
  }

  function renderChain(){
    var a = cur.a;
    var nSteps = 0;
    (a.chain || []).forEach(function(c){ nSteps += (c.steps || []).length; });
    var html = '<div class="ls-head"><button type="button" class="ls-back">← 返回书架</button>'
      + '<h2>⚡ 轻刷《' + esc(a.title) + '》</h2><span class="ls-stage">① 链回忆</span></div>'
      + '<p class="ls-hint">盖住答案：看着钩子把那句英文说出来，再点开核对。卡住的句子点「卡了」标记。</p>';
    (a.chain || []).forEach(function(c){
      html += '<div><span class="ls-para">' + esc(c.para || '段') + '</span></div>';
      (c.steps || []).forEach(function(s, k){
        html += '<div class="ls-step"><div class="ls-hook">'
          + '<span class="ls-no">' + (s.sidx || '?') + '</span>'
          + '<span class="ls-hw">' + esc(s.h) + '</span>'
          + (s.b ? '<span class="ls-bridge">' + esc(s.b) + '</span>' : '')
          + (s.a ? '<span class="ls-anchor">[' + esc(s.a) + ']</span>' : '')
          + '<span class="ls-see">点看原句</span>'
          + '<button type="button" class="ls-mark" data-mi="' + esc(s.sidx || '') + '">卡了</button></div>'
          + '<div class="ls-en">' + esc(s.en || ('（缺原句数据：' + esc(s.h) + '）')) + '</div></div>';
      });
    });
    html += '<div class="ls-actions"><button type="button" class="ls-next" id="emm-lib-toclz">下一步：挖空挑战 ▶</button></div>'
      + '<p class="ls-hint">共 ' + nSteps + ' 句。轻刷结果不落盘——要进薄弱清单，回原方案打卡。</p>';
    sessionBox.innerHTML = html;
    sessionBox.querySelector('.ls-back').addEventListener('click', closeSession);
    sessionBox.querySelectorAll('.ls-step').forEach(function(row){
      row.querySelector('.ls-hook').addEventListener('click', function(e){
        if(e.target.closest('.ls-mark')) return;
        row.classList.toggle('open');
      });
    });
    sessionBox.querySelectorAll('.ls-mark').forEach(function(b){
      b.addEventListener('click', function(){
        b.classList.toggle('on');
        var sid = b.getAttribute('data-mi');
        if(b.classList.contains('on')) cur.mi[sid] = true; else delete cur.mi[sid];
      });
    });
    sessionBox.querySelector('#emm-lib-toclz').addEventListener('click', renderCloze);
  }

  function renderCloze(){
    var a = cur.a;
    var html = '<div class="ls-head"><button type="button" class="ls-back">← 返回书架</button>'
      + '<h2>⚡ 轻刷《' + esc(a.title) + '》</h2><span class="ls-stage">② 挖空挑战</span></div>'
      + '<p class="ls-hint">填空后回车自动批改（大小写/标点/缩写不敏感）。卡壳就凭记忆填——错空正是要回炉的地方。</p>';
    var items = a.cloze || [];
    if(!items.length){
      html += '<p class="ls-hint">本篇没有挖空数据（旧方案可能未收录）。</p>';
    }
    items.forEach(function(it, i){
      html += '<div class="ls-clz-item" data-clz="' + i + '">' + clozeHtml(it) + '</div>';
    });
    html += '<div class="ls-actions"><button type="button" class="ls-next" id="emm-lib-tosum">查看结算 ▶</button></div>';
    sessionBox.innerHTML = html;
    sessionBox.querySelector('.ls-back').addEventListener('click', closeSession);
    cur.clzTotal = 0; cur.clzBad = {};
    items.forEach(function(it, i){
      var box = sessionBox.querySelector('[data-clz="' + i + '"]');
      box.querySelectorAll('input.emm-clz').forEach(function(inp){
        cur.clzTotal++;
        wireClz(inp, inp.nextSibling, inp.getAttribute('data-ans'));
      });
    });
    var toSum = sessionBox.querySelector('#emm-lib-tosum');
    if(toSum) toSum.addEventListener('click', renderSummary);
  }
  function clozeHtml(it){
    var bi = 0;
    return esc(it.q).replace(/_{3,}/g, function(){
      var ans = (it.a || [])[bi++] || '';
      return '<input type="text" class="emm-clz" autocomplete="off" spellcheck="false" data-ans="' + esc(ans) + '" style="width:' + Math.max(6, ans.length + 2) + 'ch" aria-label="第' + bi + '空"><span class="emm-clz-mark"></span>';
    });
  }
  function wireClz(inp, mk, ans){
    function grade(){
      var v = normJoin(inp.value), a = normJoin(ans);
      if(!v){
        inp.classList.remove('emm-clz-ok', 'emm-clz-bad');
        mk.textContent = ''; mk.className = 'emm-clz-mark';
        if(cur) delete cur.clzBad[ans];
        return;
      }
      if(v === a){
        inp.classList.add('emm-clz-ok'); inp.classList.remove('emm-clz-bad');
        mk.textContent = '✓'; mk.className = 'emm-clz-mark ok';
        if(cur) delete cur.clzBad[ans];
      } else {
        inp.classList.add('emm-clz-bad'); inp.classList.remove('emm-clz-ok');
        mk.textContent = '✗'; mk.className = 'emm-clz-mark bad';
        if(cur && ans) cur.clzBad[ans] = true;
      }
    }
    inp.addEventListener('keydown', function(e){ if(e.key === 'Enter'){ e.preventDefault(); grade(); } });
    inp.addEventListener('blur', grade);
    inp.addEventListener('input', function(){
      inp.classList.remove('emm-clz-ok', 'emm-clz-bad');
      mk.textContent = ''; mk.className = 'emm-clz-mark';
    });
  }

  function renderSummary(){
    var a = cur.a;
    var nMi = Object.keys(cur.mi).length;
    var badKeys = Object.keys(cur.clzBad || {});
    var html = '<div class="ls-head"><button type="button" class="ls-back">← 返回书架</button>'
      + '<h2>⚡ 轻刷《' + esc(a.title) + '》</h2><span class="ls-stage">③ 结算</span></div>';
    html += '<div class="ls-sum">🔁 链回忆：自判卡壳 <b>' + nMi + '</b> 句 · ✍️ 挖空：错 <b>' + badKeys.length + '</b> / ' + cur.clzTotal + ' 空'
      + ((nMi + badKeys.length) ? '' : ' —— 全部顺畅，记忆保持得很好 🎉') + '</div>';
    if(nMi || badKeys.length){
      html += '<div class="ls-miss"><b>建议回原方案补打卡的句子</b>（轻刷不落盘，打卡/薄弱清单以原方案为准）：<br>';
      var missSidx = Object.keys(cur.mi);
      missSidx.forEach(function(sid){
        html += '· 第 ' + esc(sid || '?') + ' 句<br>';
      });
      badKeys.forEach(function(w){
        html += '· 错空词「' + esc(w) + '」<br>';
      });
      html += '</div>';
      // v2.24：一键回原方案补打卡（带 ?jump= 参数让方案页自动定位）
      if(a.file && missSidx.length){
        var jumpParam = missSidx.slice(0, 5).join(',');  // 最多前 5 句避免 URL 超长
        html += '<div class="ls-actions"><a class="lib-btn" style="flex:0 1 auto;padding:8px 18px;background:#f59e0b;color:#fff;border-color:#f59e0b;" href="' + esc(a.file) + '?jump=' + encodeURIComponent(jumpParam) + '">🎯 一键回原方案补打卡</a></div>';
      }
    }
    html += '<div class="ls-actions">'
      + '<a class="lib-btn lib-btn-open" style="flex:0 1 auto;padding:8px 18px;" href="' + esc(a.file || '') + '">📖 打开原方案（打卡进薄弱清单）</a>'
      + '<button type="button" class="ls-back" id="emm-lib-done">完成</button></div>';
    sessionBox.innerHTML = html;
    sessionBox.querySelector('.ls-back').addEventListener('click', closeSession);
    sessionBox.querySelector('#emm-lib-done').addEventListener('click', closeSession);
  }

  /* —— ?check=1 数据体检 —— */
  function selfCheck(){
    if(!/[?&]check/.test(location.search)) return;
    var L = ['EMM 记忆库自检报告（v2.28.2 · ?check=1）', '─ 文章数据'];
    if(!LIB.articles.length) L.push('⚠ 文章数为 0——记忆库未填充');
    var seenKeys = {};
    LIB.articles.forEach(function(a, i){
      var name = a.title || a.topic || ('#' + (i + 1));
      L.push('《' + name + '》');
      if(!a.key) L.push('  ⚠ 缺 key（进度键=方案 h1 前 40 字，缺失则进度永远读不到）');
      else if(seenKeys[a.key]) L.push('  ⚠ key 与第 ' + seenKeys[a.key] + ' 篇重复：两篇共享进度键，打卡进度会互相串——改方案 h1 以区分（v2.28.2 同名陷阱检测）');
      else seenKeys[a.key] = i + 1;
      if(!a.file) L.push('  ⚠ 缺 file（打开原方案链接不可用）');
      var nSteps = 0;
      (a.chain || []).forEach(function(c){ nSteps += (c.steps || []).length; });
      if(!nSteps) L.push('  ⚠ 链回忆无数据（chain 为空）');
      else if(a.sents && nSteps !== a.sents) L.push('  ⚠ 链回忆句数 ' + nSteps + ' ≠ 方案句数 ' + a.sents);
      else L.push('  ✅ 链回忆 ' + nSteps + ' 句');
      (a.cloze || []).forEach(function(it, k){
        var blanks = (String(it.q || '').match(/_{3,}/g) || []).length;
        var ans = (it.a || []).length;
        L.push(blanks && blanks === ans ? '  ✅ 挖空#' + (k + 1) + '：空数 ' + blanks + ' == 答案数 ' + ans : '  ⚠ 挖空#' + (k + 1) + '：空数 ' + blanks + ' ≠ 答案数 ' + ans);
      });
    });
    var rpt = document.createElement('div');
    rpt.className = 'emm-check-rpt';
    rpt.textContent = L.join('\n');
    var w = document.querySelector('.wrap') || document.body;
    w.insertBefore(rpt, w.firstChild);
  }

  function init(){
    shelf = document.getElementById('emm-lib-shelf');
    emptyBox = document.getElementById('emm-lib-empty');
    sessionBox = document.getElementById('emm-lib-session');
    searchBox = document.querySelector('.lib-search');
    if(!shelf) return;
    // v2.24：状态筛选 chip 行
    var chipBar = document.createElement('div');
    chipBar.className = 'lib-chipbar';
    chipBar.style.cssText = 'margin:8px 0;display:flex;flex-wrap:wrap;gap:6px;align-items:center;';
    var chips = [
      { id: 'all',     label: '全部',       hint: '显示所有文章' },
      { id: 'started', label: '有进度',     hint: '已开始打过卡的文章' },
      { id: 'weakest', label: '薄弱最多',   hint: '薄弱率 ≥ 30%' },
      { id: 'stale',   label: '超 14 天未复习', hint: '超过 14 天没打卡/阶梯/勾选' }
    ];
    chips.forEach(function(c){
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'lib-chip';
      b.setAttribute('data-status', c.id);
      b.title = c.hint;
      b.textContent = c.label;
      b.style.cssText = 'padding:3px 10px;font-size:12.5px;border:1px solid var(--accent-border);background:#fff;color:#7c4a00;border-radius:14px;cursor:pointer;';
      b.addEventListener('click', function(){
        statusFilter = c.id;
        chipBar.querySelectorAll('.lib-chip').forEach(function(x){ x.style.background = '#fff'; x.style.color = '#7c4a00'; x.style.borderColor = 'var(--accent-border)'; });
        b.style.background = '#f59e0b'; b.style.color = '#fff'; b.style.borderColor = '#f59e0b';
        renderShelf();
      });
      chipBar.appendChild(b);
    });
    // 默认激活「全部」
    chipBar.firstChild.style.background = '#f59e0b';
    chipBar.firstChild.style.color = '#fff';
    chipBar.firstChild.style.borderColor = '#f59e0b';
    // 插到搜索框后面（chipBar 作为 searchBox 的下一个 sibling）
    if(searchBox.parentNode) searchBox.parentNode.insertBefore(chipBar, searchBox.nextSibling);
    var timer = null;
    searchBox.addEventListener('input', function(){
      clearTimeout(timer);
      timer = setTimeout(renderShelf, 150);
    });
    renderShelf();
    buildTodayAll();
    buildVocab();
    selfCheck();
  }

  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();

/* ② 文章数据 schema（AI 填充 {{ARTICLES}} 时按此结构,逗号分隔多个对象）：
{
  topic: 'success',                          // 文章主题英文（同方案命名）
  file: 'success-memorization-plan.html',    // 方案文件名（同目录相对路径）
  key: 'Success背诵方案',                     // 进度键：逐字复制方案 <h1> 文本去首尾空白后的前 40 字
  title: 'Success',                          // 展示标题
  type: '议论文',                            // 议论文 / 说明文 / 叙事文 / 演讲稿 / 长文
  sents: 11,                                 // 全文句数（.sent 块数）
  words: 320,                                // 全文词数（约）
  days: 16,                                  // 计划天数（单篇/演讲 16,长文按段另计）
  date: '2026-10-01',                        // 方案生成日期
  chain: [                                   // 与方案第 13/15 节三层钩子链逐字一致,每段一条
    { para: '段钩', steps: [
      { h: '句钩', b: '⇒', a: 'anchor words', sidx: 1, en: '原句英文全文' }
    ] }
  ],
  cloze: [                                   // 1~3 条,优先复用方案第 11 节挖空自测（q 含 ______,a 与空一一对应）
    { q: 'This has ______ blanks.', a: ['words'] }
  ]
}
填充分隔用逗号；字符串内不得出现连续的 <\/（闭合脚本）,如有需写成 <\\\/。
*/

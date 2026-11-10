
/* ===== v2.20 EMM_SR_V220: SM-2 算法升级（Wozniak 1990）=====
   设计：self-contained IIFE，不依赖 main IIFE 内部变量；
   通过 __emmDispatch 钩子接收 'judge'/'endRound' 事件；
   算法为纯函数 srNext(q, prev)，便于测试；
   持久化走 main 同 key 的 localStorage，复用同一份 state。 */
(function(){
  "use strict";

  // Wozniak 1990 SM-2 算法
  // q ∈ [0..5]，q<3 重置 reps=0、interval=1
  // EF：EF' = EF + (0.1 - (5-q) * (0.08 + (5-q) * 0.02))
  // EF < 1.3 → 钳制到 1.3
  // 间隔：reps=0 → 1d；reps=1 → 6d；reps=n>1 → round(prev.interval * EF)
  function srNext(q, prev){
    prev = prev || {ef: 2.5, interval: 0, reps: 0, due: '', lastQ: null};
    var ef = prev.ef || 2.5;
    var reps = prev.reps || 0;
    var interval;
    if(q < 3){
      reps = 0;
      interval = 1;
    } else {
      if(reps === 0) interval = 1;
      else if(reps === 1) interval = 6;
      else interval = Math.max(1, Math.round((prev.interval || 1) * ef));
      reps = reps + 1;
    }
    ef = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
    if(ef < 1.3) ef = 1.3;
    var dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);
    var due = dueDate.getFullYear() + '-' + String(dueDate.getMonth()+1).padStart(2,'0') + '-' + String(dueDate.getDate()).padStart(2,'0');
    return {ef: ef, interval: interval, reps: reps, due: due, lastQ: q};
  }

  /* ===== v2.39.0 FSRS 调度层（数学核心在 01b-fsrs.js 的 EMMFSRS；此处管状态与切换）===== */
  function todayISO(){
    var d = new Date();
    return d.getFullYear() + '-' + String(d.getMonth()+1).padStart(2,'0') + '-' + String(d.getDate()).padStart(2,'0');
  }
  function diffDays(fromStr, toStr){
    var a = new Date(fromStr + 'T00:00:00');
    var b = new Date(toStr + 'T00:00:00');
    return Math.round((b - a) / 86400000);
  }
  // 评分映射：二档 judge（ok/卡）→ FSRS Rating（顺=Good 3，卡=Again 1）
  function fsrsNext(gradeFsrs, prev){
    var now = todayISO();
    var fresh = !prev || (!prev.d && !prev.s);
    var st = fresh ? EMMFSRS.initState(gradeFsrs)
                   : EMMFSRS.next({ d: prev.d, s: prev.s }, gradeFsrs, prev.lastDate ? Math.max(0, diffDays(prev.lastDate, now)) : 0);
    var interval = EMMFSRS.interval(st.s, EMMFSRS.RETENTION);
    var dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + interval);
    return { d: st.d, s: st.s, reps: (prev && prev.reps || 0) + 1,
             due: dueDate.getFullYear() + '-' + String(dueDate.getMonth()+1).padStart(2,'0') + '-' + String(dueDate.getDate()).padStart(2,'0'),
             lastQ: gradeFsrs, lastDate: now };
  }
  // 切换算法时的状态迁移（启发式映射，之后由各自算法自我修正）
  function sm2ToFsrs(prev){
    var d = Math.max(1, Math.min(10, 1 + (2.5 - (prev.ef || 2.5)) * 4));
    var s = Math.max(prev.interval || 0, 0.4);
    return { d: Math.round(d * 100) / 100, s: Math.round(s * 100) / 100,
             reps: prev.reps || 0, due: prev.due || '', lastQ: prev.lastQ };
  }
  function fsrsToSm2(next){
    var ef = Math.max(1.3, Math.min(2.5, 2.5 - ((next.d || 5) - 1) * 0.25));
    var interval = Math.max(1, Math.round(next.s || 1));
    return { ef: ef, interval: interval, reps: next.reps || 0, due: next.due || '', lastQ: next.lastQ };
  }
  function currentAlgo(p){
    var pp = p || loadProgress();
    return pp.srAlgo === 'fsrs' ? 'fsrs' : 'sm2';
  }
  function switchAlgo(algo){
    if(algo !== 'fsrs' && algo !== 'sm2') return;
    var p = loadProgress();
    p.sr = p.sr || {};
    var keys = Object.keys(p.sr);
    for(var i = 0; i < keys.length; i++){
      var cur = p.sr[keys[i]];
      if(!cur) continue;
      if(algo === 'fsrs'){
        if(cur.d !== undefined) continue;                                   // 已是 FSRS 状态
        if(!cur.reps && !cur.interval){ p.sr[keys[i]] = {}; continue; }     // 空壳（仅 lastQ）直接清空
        p.sr[keys[i]] = sm2ToFsrs(cur);
      } else {
        if(cur.d === undefined) continue;                                   // 已是 SM-2 状态
        p.sr[keys[i]] = fsrsToSm2(cur);
      }
    }
    p.srAlgo = algo;
    EMMProgressStore.patch(function(p2){ p2.sr = p.sr; p2.srAlgo = algo; });
  }

  // v2.32.0：进度键派生与读写收敛到 EMMProgressStore（00-store.js），此处为同签名薄委托
  // v2.32.0：进度契约收敛到 EMM_PROGRESS store（00-store.js）——同签名薄委托
  function getH1(){ return EMMProgressStore.getH1(); }
  function keyOf(){ return EMMProgressStore.keyOf(); }
  function loadProgress(){ return EMMProgressStore.load(); }
  // 只 patch sr 字段（不重写整个 state），避免与 main 的 save(state) 写竞态
  function patchSr(srObj){ EMMProgressStore.patch(function(p){ p.sr = srObj; }); }
  function patchSrMode(mode){ EMMProgressStore.patch(function(p){ p.srMode = mode; }); }

  // v2.38.0：到期句集合（纯函数）——标准模式由它驱动 state.weak 增删。
  // 只认 due <= today 且 due 非空的句；key 保持字符串，调用方自行做边界校验。
  function dueKeys(sr, today){
    if(!sr || !today) return [];
    return Object.keys(sr).filter(function(k){
      var d = sr[k] && sr[k].due;
      return !!d && d <= today;
    });
  }

  // 与 Ebbinghaus 间隔表（1/2/4/7/15）对齐：取 max(SR.due, ebbinghausRound)
  // 用途：保证标准模式不会让复习频率低于经典 Ebbinghaus 节奏
  // 输入：reps 已完成的连续正确次数
  function ebbinghausDueDays(reps){
    var table = [1, 2, 4, 7, 15];
    return reps <= 0 ? 0 : (table[Math.min(reps - 1, table.length - 1)] || 15);
  }
  function alignWithEbbinghaus(sr){
    if(!sr) return sr;
    var ebbDays = ebbinghausDueDays(sr.reps || 0);
    if(sr.interval < ebbDays){
      var dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + ebbDays);
      sr.interval = ebbDays;
      sr.due = dueDate.getFullYear() + '-' + String(dueDate.getMonth()+1).padStart(2,'0') + '-' + String(dueDate.getDate()).padStart(2,'0');
      sr.aligned = 'ebbinghaus';
    } else {
      sr.aligned = 'sm2';
    }
    return sr;
  }

  // 当前评分粒度：二档（向后兼容）
  // ✓ → q=4，✗ → q=2
  function gradeFromJudge(v){
    return v === 'ok' ? 4 : 2;
  }

  // v2.38.0：把调度判定暴露给 main IIFE（算法职责留在本模块，main 只消费结果）
  // v2.39.0：新增 FSRS 层（fsrsNext/switchAlgo/currentAlgo）
  window.EMMSR = { dueKeys: dueKeys, srNext: srNext, alignWithEbbinghaus: alignWithEbbinghaus,
                   fsrsNext: fsrsNext, switchAlgo: switchAlgo, currentAlgo: currentAlgo };

  // 监听 main IIFE 的钩子，写入 state.sr
  window.__emmDispatch = function(event, idx, v){
    if(event === 'judge'){
      // 单次评分：仅记录 lastQ，endRound 时批量算 srNext
      var p = loadProgress();
      p.sr = p.sr || {};
      var cur = p.sr[idx] || {ef: 2.5, interval: 0, reps: 0, due: '', lastQ: null};
      cur.lastQ = gradeFromJudge(v);
      p.sr[idx] = cur;
      patchSr(p.sr);
    } else if(event === 'endRound'){
      // 一轮结束：批量 srNext，按 mode 决定是否与 Ebbinghaus 对齐
      // 第三个参数是 main 传入的 doneSnapshot（在 state.done 清空前快照）
      var done = (arguments.length >= 3 && arguments[2]) ? arguments[2] : (loadProgress().done || {});
      var p = loadProgress();
      p.sr = p.sr || {};
      var isStd = p.srMode === 'standard';
      var isFsrs = currentAlgo(p) === 'fsrs';
      var keys = Object.keys(done);
      for(var i = 0; i < keys.length; i++){
        var k = keys[i];
        var grade = done[k] === 'ok' ? (isFsrs ? 3 : 4) : (isFsrs ? 1 : 2);
        var prev = p.sr[k] || null;
        var next = isFsrs ? fsrsNext(grade, prev) : srNext(grade, prev || {ef: 2.5, interval: 0, reps: 0, due: '', lastQ: null});
        if(isStd && !isFsrs) next = alignWithEbbinghaus(next);
        p.sr[k] = next;
      }
      patchSr(p.sr);
    } else if(event === 'modeChange'){
      // 标准 / 轻量切换：对已有 state.sr 重新对齐 Ebbinghaus（FSRS 模式自管排期，跳过）
      var p2 = loadProgress();
      if(p2.srMode === 'standard' && currentAlgo(p2) !== 'fsrs'){
        Object.keys(p2.sr).forEach(function(k){
          p2.sr[k] = alignWithEbbinghaus(p2.sr[k]);
        });
        patchSr(p2.sr);
      }
    }
  };
})();

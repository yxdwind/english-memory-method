/* ===== v2.39.0 EMM_FSRS_V239: FSRS-5 调度核心（可选，与 SM-2 并存）=====
   来源：open-spaced-repetition/ts-fsrs v6.0.0 dist/models/fsrs-5（MIT）逐公式移植；
   19 个默认参数、DECAY/FACTOR、sMin/sMax/dMin/dMax 边界与 ts-fsrs 完全一致，
   黄金测试值固化于 tests/qa-v239.test.mjs（±1e-6 容差）。
   纯数学模块：不碰 DOM / localStorage；评分映射与状态持久化由 02-sr 负责。
   启用：02-sr 的 srAlgo='fsrs'（🧮 按钮切换，默认仍为 SM-2）。 */
window.EMMFSRS = (function(){
  "use strict";
  var W = [0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575, 0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621];
  var DECAY = 0.5;              // R(t,S) = (1 + FACTOR*t/S)^(-DECAY)
  var FACTOR = 19 / 81;         // 保证 R(S,S) = 0.9
  var S_MIN = 0.01, S_MAX = 36500, D_MIN = 1, D_MAX = 10;
  var RETENTION = 0.9;          // 请求记忆保持率
  function clamp(x, lo, hi){ return x < lo ? lo : (x > hi ? hi : x); }
  function round8(x){ return Math.round(x * 1e8) / 1e8; }
  function forgettingCurve(t, s){ return round8(Math.pow(1 + FACTOR * t / s, -DECAY)); }
  function initStability(g){ return clamp(W[g - 1], S_MIN, S_MAX); }
  function initDifficulty(g){ return clamp(round8(W[4] - Math.exp((g - 1) * W[5]) + 1), D_MIN, D_MAX); }
  function nextInterval(s, r){
    var mod = (Math.pow(r, 1 / -DECAY) - 1) / FACTOR;
    return Math.max(Math.round(s * mod), 1);
  }
  function linearDamping(deltaD, oldD){ return round8(deltaD * (10 - oldD) / 9); }
  function meanReversion(init, cur){ return round8(W[7] * init + (1 - W[7]) * cur); }
  function nextDifficulty(d, g){
    var deltaD = -W[6] * (g - 3);
    var nextD = d + linearDamping(deltaD, d);
    return clamp(meanReversion(initDifficulty(4), nextD), D_MIN, D_MAX);
  }
  function nextRecallStability(d, s, r, g){
    var hardPenalty = (g === 2) ? W[15] : 1;
    var easyBonus = (g === 4) ? W[16] : 1;
    return clamp(round8(s * (1 + Math.exp(W[8]) * (11 - d) * Math.pow(s, -W[9]) * (Math.exp((1 - r) * W[10]) - 1) * hardPenalty * easyBonus)), S_MIN, S_MAX);
  }
  function nextForgetStability(d, s, r){
    return clamp(round8(W[11] * Math.pow(d, -W[12]) * (Math.pow(s + 1, W[13]) - 1) * Math.exp((1 - r) * W[14])), S_MIN, S_MAX);
  }
  function nextShortTermStability(s, g){
    return clamp(round8(s * Math.exp(W[17] * (g - 3 + W[18]))), S_MIN, S_MAX);
  }
  function initPair(g){ return { d: initDifficulty(g), s: initStability(g) }; }
  /* state = {d, s}；t = 距上次复习的天数（0 = 同日，走 short-term 分支）；
     g ∈ {1: Again(卡), 2: Hard, 3: Good(顺), 4: Easy}——与 ts-fsrs Rating 一致 */
  function next(state, g, t){
    var d = state ? (state.d || 0) : 0;
    var s = state ? (state.s || 0) : 0;
    if (!d && !s) return initPair(g);
    var r = forgettingCurve(t, s);
    var newS;
    if (t === 0) {
      newS = nextShortTermStability(s, g);
    } else if (g === 1) {
      var sAfterFail = nextForgetStability(d, s, r);
      var sFloor = round8(s / Math.exp(W[17] * W[18]));
      newS = clamp(sFloor, S_MIN, sAfterFail);
    } else {
      newS = nextRecallStability(d, s, r, g);
    }
    return { d: nextDifficulty(d, g), s: newS };
  }
  return { next: next, interval: nextInterval, initState: initPair, forgettingCurve: forgettingCurve, W: W, RETENTION: RETENTION };
})();

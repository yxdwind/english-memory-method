/**
 * english-memory-method · 背诵方案组件冒烟测试
 * 运行：npm test（首次需 npm i --no-save jsdom@16）
 * 覆盖：v2.13 今日排期/自测模式/阶梯/留白/自检，v2.14 快刷/交互挖空/锚点，
 *       v2.15 内容指纹/宫殿 data-sents；长文与单篇两形态。
 */
const fs = require('fs');
const path = require('path');

let JSDOM;
try {
  JSDOM = require('jsdom').JSDOM;
} catch (e) {
  console.error('缺少 jsdom：请先执行 npm i --no-save jsdom@16 后重跑 npm test');
  process.exit(1);
}

const template = fs.readFileSync(path.join(__dirname, '..', 'assets', 'plan-template.html'), 'utf8');
const js = template.match(/<script>([\s\S]*)<\/script>/)[1];

function sent(i) {
  return `<div class="sent">
    <div class="sent-en">Test sentence <span class="tie">⌒</span> number ${i} <span class="wk">the</span> words.</div>
    <div class="sent-zh">第 ${i} 句翻译。</div>
    <div class="pron"><span class="lbl">连读 · 弱读 · 读法</span>注解 ${i}</div>
  </div>`;
}

function palaceStops(mode) {
  if (mode === 'paired') {
    return `<div class="palace-stop" data-sents="1,2"><span class="st-no">站 1</span><div class="st-name">站点1</div><span class="st-anchor">[a]</span></div>
      <div class="palace-stop" data-sents="3,4"><span class="st-no">站 2</span><div class="st-name">站点2</div><span class="st-anchor">[a]</span></div>`;
  }
  if (mode === 'gap') {
    return `<div class="palace-stop" data-sents="1,2"><span class="st-no">站 1</span><div class="st-name">站点1</div><span class="st-anchor">[a]</span></div>
      <div class="palace-stop" data-sents="3"><span class="st-no">站 2</span><div class="st-name">站点2</div><span class="st-anchor">[a]</span></div>`;
  }
  let s = '';
  for (let i = 1; i <= 4; i++) {
    s += `<div class="palace-stop"><span class="st-no">站 ${i}</span><div class="st-name">站点${i}</div><span class="st-anchor">[a]</span></div>`;
  }
  return s;
}

function fixture(withSegments, palaceMode) {
  let body = `<div class="wrap"><header><h1>Test 背诵方案</h1></header><h2>1. 整体策略</h2><div class="card">策略</div>`;
  if (withSegments) {
    body += `<h2>4.1 第1段 · 缘起</h2>` + sent(1) + sent(2);
    body += `<h2>4.2 第2段 · 控诉</h2>` + sent(3) + sent(4);
  } else {
    body += `<h2>3. 原文逐句精读</h2>` + sent(1) + sent(2) + sent(3) + sent(4);
  }
  body += `<h2>15. 记忆钩子</h2>
  <div class="hook-chain"><span class="para-hook">段钩1</span><span class="seg">钩A</span><span class="bridge">⇒</span><span class="seg">钩B</span><span class="anchor">[anchor1]</span><span class="anchor">[anchor2]</span></div>
  <div class="hook-chain"><span class="para-hook">段钩2</span><span class="seg">钩C</span><span class="bridge">→</span><span class="seg">钩D</span><span class="anchor">[anchor3]</span><span class="anchor">[anchor4]</span></div>`;
  body += palaceStops(palaceMode);
  body += `<h2>11. 挖空自测</h2>
  <p class="sec-label">第 1 段</p>
  <p style="font-size:15px;">This has ______ and ______ blanks.</p>
  <details class="answer-toggle"><summary>▶ 查看本段答案</summary><div class="answer">答案：words / sentence</div></details>
  <p class="sec-label">第 2 段</p>
  <p style="font-size:15px;">This has ______ ______ ______ three.</p>
  <details class="answer-toggle"><summary>▶ 查看本段答案</summary><div class="answer">答案：x / y</div></details>
  </div>`;
  return `<!DOCTYPE html><html><head><title>Test 背诵方案</title></head><body>${body}</body></html>`;
}

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else { failed++; console.log('  ❌ ' + label); }
}

const KEY = 'emm-progress:Test 背诵方案';

async function boot(opts = {}) {
  const dom = new JSDOM(fixture(opts.withSegments, opts.palaceMode), {
    runScripts: 'outside-only',
    url: 'http://localhost/plan.html' + (opts.query || ''),
  });
  const w = dom.window;
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  if (opts.confirmReturn !== undefined) { w.confirm = () => opts.confirmReturn; }
  if (opts.confirmCounter) { w.confirm = () => { opts.confirmCounter.n++; return opts.confirmReturn; }; }
  if (opts.seed) { w.localStorage.setItem(KEY, JSON.stringify(opts.seed)); }
  w.eval(js);
  await new Promise((r) => setTimeout(r, 80));
  const doc = w.document;
  return {
    w, doc,
    stateOf: () => JSON.parse(w.localStorage.getItem(KEY)),
  };
}

async function run(name, withSegments, query) {
  console.log('\n== ' + name + ' ==');
  const env = await boot({ withSegments, query });
  const w = env.w, doc = env.doc, stateOf = env.stateOf;

  // v2.13 今日任务卡
  const card = doc.querySelector('.emm-today');
  ok(!!card, '今日任务卡已注入');
  ok(card.textContent.includes('第 1 天 / 计划约 ' + (withSegments ? 17 : 16) + ' 天'), '天数计算正确（' + (withSegments ? '长文 17' : '单篇 16') + ' 天）');
  const rows = card.querySelectorAll('.emm-rows tr');
  ok(rows.length === (withSegments ? 2 : 1), '段落行数 = ' + rows.length);
  if (withSegments) {
    ok(rows[0].textContent.includes('第1段 · 缘起'), '段名识别：' + rows[0].cells[0].textContent);
    ok(rows[0].textContent.includes('今天新学'), 'Day1 第1段=今天新学');
    ok(rows[1].textContent.includes('🔒 Day 2'), 'Day1 第2段=未开始');
  } else {
    ok(rows[0].textContent.includes('全文'), '单篇回退为「全文」');
    ok(rows[0].textContent.includes('今天新学'), '单篇 Day1=今天新学');
  }

  // 改开始日期 → 到期计算流转
  const inp = card.querySelector('.emm-start');
  const y = new Date(Date.now() - 86400000);
  inp.value = y.getFullYear() + '-' + String(y.getMonth() + 1).padStart(2, '0') + '-' + String(y.getDate()).padStart(2, '0');
  inp.dispatchEvent(new w.Event('change', { bubbles: true }));
  ok(card.querySelector('.emm-dayline').textContent.includes('第 2 天'), '日期改为昨天→第 2 天');
  ok(card.querySelector('.emm-rows tr').textContent.includes('次日自测'), '第1段进入「次日自测」复习到期');

  // v2.13 复述阶梯
  const lv3 = card.querySelector('.emm-lv[data-seg="0"][data-lv="3"]');
  lv3.click();
  ok(!!card.querySelector('.emm-lv[data-seg="0"][data-lv="3"].emm-lv-on'), '点 L3 后 L1~L3 点亮');
  ok(stateOf().ladder['0'] && stateOf().ladder['0'].lv === 3, '阶梯等级已存 localStorage');

  // 勾选完成
  const chk = card.querySelector('.emm-donechk[data-seg="0"]');
  ok(!!chk, '今日任务有勾选框');
  chk.click();
  ok(!!stateOf().log && Object.keys(stateOf().log).length === 1, '勾选已写入 log');

  // v2.13 自测模式
  const qb = doc.querySelector('.rv-quiz');
  qb.click();
  ok(doc.body.classList.contains('emm-quiz1') && qb.textContent.includes('遮译文'), '自测一档：遮译文');
  qb.click();
  ok(doc.body.classList.contains('emm-quiz2') && qb.textContent.includes('全遮'), '自测二档：全遮');
  const s0 = doc.querySelectorAll('.sent')[0];
  s0.click();
  ok(s0.classList.contains('revealed'), '自测中点句→临时揭开');
  qb.click();
  ok(!doc.body.classList.contains('emm-quiz1') && qb.textContent.includes('关'), '三档循环回「关」');
  s0.click();
  ok(s0.classList.contains('revealed'), '关闭态点句不触发切换（保持原状）');

  // v2.13 留白
  const wbs = doc.querySelectorAll('.wb-line');
  ok(wbs.length === 4 + (withSegments ? 2 : 1), '留白数量正确（主线×段落 + 画面×4 站）＝' + wbs.length);
  const main = doc.querySelector('.wb-input[data-k="m0"]');
  main.textContent = '我自己的一句话';
  main.dispatchEvent(new w.Event('input', { bubbles: true }));
  const pal = doc.querySelector('.wb-input[data-k="p2"]');
  pal.textContent = '一头大象踩桌子';
  pal.dispatchEvent(new w.Event('input', { bubbles: true }));
  await new Promise((r) => setTimeout(r, 500)); // 等防抖落盘
  const st = stateOf();
  ok(st.wb && st.wb.main['0'] === '我自己的一句话' && st.wb.pal['2'] === '一头大象踩桌子', '留白内容分别存入 localStorage');

  // v2.13 ?check=1 自检
  if (query) {
    const rpt = doc.querySelector('.emm-check-rpt');
    ok(!!rpt, '自检报告已注入');
    const t = rpt.textContent;
    ok(t.includes('句数：4'), '报告：句数 4');
    ok(t.includes('✅ 站号 1..4 连续'), '报告：站号连续');
    ok(t.includes('✅ 句钩总数 4 / 句数 4') && t.includes('✅ 逻辑桥 2'), '报告：钩子链对齐通过');
    ok(t.includes('✅ 挖空：空数 2 == 答案数 2'), '报告：正常挖空判 ✅');
    ok(t.includes('⚠ 挖空：空数 3 ≠ 答案数 2'), '报告：错配挖空判 ⚠');
    if (withSegments) ok(t.includes('段1 [第1段 · 缘起] 2 句'), '报告：分段识别正确');
  }

  // .ics 导出不抛错
  let icsOk = true;
  try { doc.querySelector('.emm-ics').click(); } catch (e) { icsOk = false; }
  ok(icsOk, '导出 .ics 不抛错');

  // v2.14 快刷
  const drillBtn = doc.querySelector('.rv-drill');
  ok(!!drillBtn, '快刷按钮已注入');
  drillBtn.click();
  ok(!doc.body.classList.contains('emm-drill'), '薄弱为空时点快刷→守卫不进入');
  ok(drillBtn.textContent.includes('(0)'), '空守卫后标签仍显示薄弱(0)');
  const sent2 = doc.querySelectorAll('.sent')[1];
  sent2.querySelector('.rv-judge button[data-v=bad]').click();
  doc.querySelector('.rv-round').click();
  doc.querySelector('.rv-round').click();
  ok(!!stateOf().weak['1'], '评卡结算后 weak[1] 已入清单');
  ok(drillBtn.textContent.includes('(1)'), '快刷按钮计数更新为 1');
  drillBtn.click();
  ok(doc.body.classList.contains('emm-drill') && drillBtn.textContent.includes('快刷中'), '快刷开启');
  ok(sent2.classList.contains('rv-weakline'), '薄弱句带 rv-weakline（CSS 过滤依据）');
  drillBtn.click();
  ok(!doc.body.classList.contains('emm-drill'), '再点退出快刷');

  // v2.14 交互挖空
  const clzP = doc.querySelectorAll('details.answer-toggle')[0].previousElementSibling;
  const clzInputs = clzP.querySelectorAll('input.emm-clz');
  ok(clzInputs.length === 2, '挖空已转为 2 个输入框');
  const badP = doc.querySelectorAll('details.answer-toggle')[1].previousElementSibling;
  ok(badP.querySelectorAll('input.emm-clz').length === 0, '空数≠答案数段落保持静态（失配保护）');
  const in1 = clzInputs[0], mk1 = clzP.querySelector('.emm-clz-mark');
  in1.value = 'WORDS!';
  in1.dispatchEvent(new w.Event('blur'));
  ok(in1.classList.contains('emm-clz-ok') && mk1.textContent === '✓', '正确答案（大小写/标点不敏感）判 ✓');
  in1.value = 'wrongword';
  in1.dispatchEvent(new w.Event('blur'));
  ok(in1.classList.contains('emm-clz-bad') && mk1.textContent === '✗', '错误答案判 ✗');
  ok(!!stateOf().weak['0'], '错空映射回含该词的句子，已入薄弱清单');
  in1.value = '';
  in1.dispatchEvent(new w.Event('blur'));
  ok(!in1.classList.contains('emm-clz-ok') && !in1.classList.contains('emm-clz-bad'), '清空输入重置判定');

  // v2.14 今日任务锚点
  ok(doc.querySelector('h2#emm-cloze') !== null, '挖空区锚点 id=emm-cloze 已设置');
  if (withSegments) {
    ok(doc.querySelector('h2#emm-seg0') !== null, '段标题锚点 id=emm-seg0 已设置');
  }
  ok(doc.getElementById('emm-dash') !== null, '仪表盘锚点 id=emm-dash 已设置');
  const setDay = (daysAgo) => {
    const d = new Date(Date.now() - daysAgo * 86400000);
    inp.value = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
    inp.dispatchEvent(new w.Event('change', { bubbles: true }));
  };
  if (withSegments) {
    setDay(0);
    ok(card.querySelector('.emm-rows').innerHTML.includes('href="#emm-seg0"'), '「今天新学」带去背诵链接');
    setDay(1);
    ok(card.querySelector('.emm-rows').innerHTML.includes('href="#emm-cloze"'), '「次日自测」带去自测链接');
    setDay(3);
    ok(card.querySelector('.emm-rows').innerHTML.includes('href="#emm-dash"'), '「第3天只背错句」带看薄弱链接');
  } else {
    setDay(0);
    ok(card.querySelector('.emm-rows').innerHTML.includes('href="#emm-seg0"'), '单篇「今天新学」带去背诵链接');
    setDay(1);
    ok(card.querySelector('.emm-rows').innerHTML.includes('href="#emm-cloze"'), '单篇「次日自测」带去自测链接');
  }
}

(async () => {
  try {
    console.log('\n== v2.15 内容指纹 ==');
    // ① 旧版无指纹 → 静默采纳当前内容
    {
      const { stateOf } = await boot({ withSegments: true, seed: { weak: { '0': true }, rounds: [{ date: 'x', ok: 1, bad: 1 }] } });
      const st = stateOf();
      ok(st.fingerprint && st.fingerprint.length > 10, '旧状态静默采纳内容指纹');
      ok(!!st.weak['0'], '采纳时保留已有进度');
    }
    // ② 指纹匹配 → 不弹确认
    {
      const first = await boot({ withSegments: true });
      const fp = first.stateOf().fingerprint;
      const counter = { n: 0 };
      const { stateOf } = await boot({ withSegments: true, seed: { fingerprint: fp, weak: { '0': true } }, confirmCounter: counter, confirmReturn: true });
      ok(counter.n === 0, '指纹一致不弹确认框');
      ok(!!stateOf().weak['0'], '进度保留');
      // ③ 指纹失配 + 确定 → 重置（保留留白与开始日期）
      const { stateOf: st3 } = await boot({
        withSegments: true, confirmReturn: true,
        seed: { fingerprint: 'old-content', weak: { '0': true }, ladder: { '0': { lv: 3, date: 'x' } }, wb: { main: { '0': '我的主线' }, pal: {} }, start: '2026-01-01' },
      });
      const s3 = st3();
      ok(Object.keys(s3.weak).length === 0 && Object.keys(s3.ladder).length === 0, '失配+确定：打卡/薄弱/阶梯已重置');
      ok(s3.fingerprint === fp, '重置后写入新指纹');
      ok(s3.wb && s3.wb.main['0'] === '我的主线' && s3.start === '2026-01-01', '留白与开始日期保留');
      // ④ 指纹失配 + 取消 → 保留旧进度
      const { stateOf: st4 } = await boot({ withSegments: true, confirmReturn: false, seed: { fingerprint: 'old-content', weak: { '0': true } } });
      const s4 = st4();
      ok(!!s4.weak['0'] && s4.fingerprint === fp, '失配+取消：保留旧进度并采纳新指纹');
    }

    console.log('\n== v2.15 宫殿 data-sents ==');
    // ⑤ 同站多物：弱句 → 正确的站标红
    {
      const { doc, stateOf } = await boot({ withSegments: true, palaceMode: 'paired' });
      const sent3 = doc.querySelectorAll('.sent')[2];
      sent3.querySelector('.rv-judge button[data-v=bad]').click();
      doc.querySelector('.rv-round').click();
      doc.querySelector('.rv-round').click();
      const stops = doc.querySelectorAll('.palace-stop');
      ok(!!stateOf().weak['2'], '第 3 句已入薄弱');
      ok(stops[1].classList.contains('palace-weak') && !stops[0].classList.contains('palace-weak'), '红站按 data-sents 映射到第 2 站');
    }
    // ⑥ 自检：覆盖完整 / 缺句
    {
      const { doc } = await boot({ withSegments: true, palaceMode: 'paired', query: '?check=1' });
      const t = doc.querySelector('.emm-check-rpt').textContent;
      ok(t.includes('✅ 宫殿 data-sents 覆盖 4 / 句数 4'), '自检：data-sents 覆盖完整判 ✅');
    }
    {
      const { doc } = await boot({ withSegments: true, palaceMode: 'gap', query: '?check=1' });
      const t = doc.querySelector('.emm-check-rpt').textContent;
      ok(t.includes('⚠ 宫殿 data-sents 覆盖 3 / 句数 4') && t.includes('缺句: 4'), '自检：漏标句号判 ⚠ 并指出缺句');
    }

    await run('长文模式（4.x 段落单元）+ ?check=1', true, '?check=1');
    await run('普通单篇（无 4.x）+ ?check=1', false, '?check=1');
  } catch (e) {
    console.error('!! 异常:', e && (e.stack || e.message || e));
    failed++;
  }

  console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
  process.exit(failed ? 1 : 0);
})();

/**
 * english-memory-method · 组件冒烟测试
 * 运行：npm test（首次需 npm i --no-save jsdom@16）
 * 覆盖：v2.13 今日排期/自测模式/阶梯/留白/自检，v2.14 快刷/交互挖空/锚点，
 *       v2.15 内容指纹/宫殿 data-sents，v2.17 记忆库（书架/进度/搜索/轻刷/自检）；
 *       长文与单篇两形态。
 */
const fs = require('fs');
const path = require('path');

let JSDOM, VirtualConsole;
try {
  JSDOM = require('jsdom').JSDOM;
  VirtualConsole = require('jsdom').VirtualConsole;
} catch (e) {
  console.error('缺少 jsdom：请先执行 npm i --no-save jsdom@16 后重跑 npm test');
  process.exit(1);
}

// jsdom 对 <a> 点击导航等"Not implemented"能力打印完整栈,属已知噪音（.ics 导出 mock 场景）,过滤之
function quietConsole() {
  const vc = new VirtualConsole();
  vc.on('jsdomError', (e) => { if (!/^Not implemented/.test(e.message || '')) console.error('jsdomError:', e.message); });
  return vc;
}

const template = fs.readFileSync(path.join(__dirname, '..', 'assets', 'plan-template.html'), 'utf8');
// v2.18 起模板含多个 <script> 块：非贪婪逐块提取后拼接（与 sr-runtime/e2e 等新套件同一模式）
const js = [...template.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n;\n');

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
  body += `<h2>4. 关键词串联表</h2>
  <table><thead><tr><th style="width:44%">原句</th><th style="width:20%">关键词钩子</th><th>中文提示</th></tr></thead>
  <tbody><tr><td>Test sentence number 1 the words.</td><td>words</td><td>第 1 句提示</td></tr></tbody></table>`;
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
    virtualConsole: quietConsole(),
  });
  const w = dom.window;
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  w.scrollTo = () => {};
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

  // v2.13 复述阶梯（v2.22 起渐进引导：未定级时锁 L2~L5，先 L1 解锁）
  const lv3locked = card.querySelector('.emm-lv[data-seg="0"][data-lv="3"]');
  ok(lv3locked.disabled === true, '未定级时 L3 锁定（v2.22 渐进引导）');
  const lv1 = card.querySelector('.emm-lv[data-seg="0"][data-lv="1"]');
  ok(lv1.disabled === false, 'L1 默认可用');
  lv1.click();
  ok(!!card.querySelector('.emm-lv[data-seg="0"][data-lv="1"].emm-lv-on'), '点 L1 后点亮并落档');
  const lv3 = card.querySelector('.emm-lv[data-seg="0"][data-lv="3"]');
  ok(lv3.disabled === false, 'L1 完成后 L3 解锁');
  lv3.click();
  ok(!!card.querySelector('.emm-lv[data-seg="0"][data-lv="3"].emm-lv-on'), '解锁后点 L3，L1~L3 点亮');
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

  // v2.16 移动端自适应
  const allWrapped = Array.prototype.every.call(doc.querySelectorAll('table'), (t) => t.parentNode.classList.contains('emm-tblwrap'));
  ok(allWrapped, '所有表格（含今日卡）已套横滚容器');
  ok(doc.querySelectorAll('.emm-tblwrap').length >= 2, '横滚容器数量正确');
  const td0 = card.querySelector('.emm-rows td');
  ok(td0 && td0.getAttribute('data-l') === '段落', '今日卡单元格带 data-l 标签（窄屏堆叠用）');
  ok(template.includes('@media (max-width:720px)'), '窄屏媒体查询已在模板主样式块');
  ok(template.includes('body.rv-mode .rv-bar,body.emm-drill .rv-bar,body.emm-quiz1 .rv-bar'), '工具条吸顶规则已在模板主样式块');
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

    await runLibrary();
  } catch (e) {
    console.error('!! 异常:', e && (e.stack || e.message || e));
    failed++;
  }

  console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
  process.exit(failed ? 1 : 0);
})();

/* ===== v2.17 个人记忆库（library-template.html） ===== */
const libTemplate = fs.readFileSync(path.join(__dirname, '..', 'assets', 'library-template.html'), 'utf8');
const libJs = libTemplate.match(/<script>([\s\S]*)<\/script>/)[1];

const libA = {
  topic: 'success', file: 'success-memorization-plan.html', key: 'Success 背诵方案',
  title: 'Success', type: '议论文', sents: 3, words: 120, days: 16, date: '2026-10-01',
  chain: [
    { para: '起点钩', steps: [
      { h: '钩A', b: '⇒', a: 'test sentence', sidx: 1, en: 'Test sentence number 1 the words.' },
      { h: '钩B', b: '→', a: 'number two', sidx: 2, en: 'Test sentence number 2 the words.' },
    ] },
    { para: '收束钩', steps: [
      { h: '钩C', b: '', a: 'number three', sidx: 3, en: 'Test sentence number 3 the words.' },
    ] },
  ],
  cloze: [ { q: 'Test sentence ______ number 1 the words.', a: ['words'] } ],
};
const libB = {
  topic: 'dream', file: 'dream-memorization-plan.html', key: 'Dream 背诵方案',
  title: 'Dream', type: '长文', sents: 2, words: 80, days: 17, date: '2026-09-20',
  chain: [ { para: '段钩D', steps: [
    { h: '钩D', b: '', a: 'anchor d', sidx: 1, en: 'Dream sentence one here.' },
    { h: '钩E', b: '', a: 'anchor e', sidx: 2, en: 'Dream sentence two here.' },
  ] } ],
  cloze: [ { q: 'Dream one ______ and ______ here.', a: ['onlyone'] } ],
};

const KEY_A = 'emm-progress:Success 背诵方案';
const seededA = { done: {}, streak: {}, weak: { '1': true }, rounds: [{ date: '2026-09-01', ok: 2, bad: 1 }],
  mode: false, current: null, quiz: 0, start: '2026-09-01', perDay: 1, ladder: {}, log: {},
  wb: { main: {}, pal: {} }, fingerprint: '' };

function fillLib(articles) {
  // {{ARTICLES}} 位于 articles: [ ... ] 内,填逗号分隔的对象字面量（与 SKILL.md 约定一致）,
  // 不能填 JSON 数组（会双重嵌套）。末尾多留一个对象供失配断言。
  return libTemplate
    .replace('{{DATE}}', '2026-10-01')
    .replace('{{ARTICLES}}', articles.map((a) => JSON.stringify(a)).join(',\n'));
}

async function bootLib(articles, opts = {}) {
  const html = fillLib(articles);
  const js = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n;\n');
  const dom = new JSDOM(html, {
    runScripts: 'outside-only',
    url: 'http://localhost/memory-library.html' + (opts.query || ''),
    virtualConsole: quietConsole(),
  });
  const w = dom.window;
  w.Element.prototype.scrollIntoView = () => {};
  w.scrollTo = () => {};
  if (opts.seed) { w.localStorage.setItem(KEY_A, JSON.stringify(seededA)); }
  w.eval(js);
  await new Promise((r) => setTimeout(r, 60));
  return { w, doc: w.document };
}

function snapshotProgress(w) {
  const out = {};
  for (let i = 0; i < w.localStorage.length; i++) {
    const k = w.localStorage.key(i);
    if (k.indexOf('emm-progress:') === 0) out[k] = w.localStorage.getItem(k);
  }
  return JSON.stringify(out);
}

async function runLibrary() {
  console.log('\n== v2.17 记忆库：书架 / 进度 / 搜索 ==');
  ok((libTemplate.match(/EMM_LIBRARY_V217/g) || []).length === 1, 'EMM_LIBRARY_V217 标识恰好一次');
  {
    const { w, doc } = await bootLib([libA, libB], { seed: true });
    const cards = doc.querySelectorAll('.lib-card');
    ok(cards.length === 2, '书架渲染 2 张文章卡');
    ok(doc.querySelector('header .lib-sub').textContent.includes('已收录 2 篇 · 共 5 句'), '头部统计：2 篇 5 句');
    ok(doc.querySelector('header .lib-sub').textContent.includes('1 篇已有打卡进度'), '头部统计：1 篇有进度');
    const cardA = doc.querySelector('.lib-card[data-idx="0"]');
    ok(cardA.textContent.includes('已打卡 1 轮 · 薄弱 1 句 · 67%'), 'A 卡进度实时读取（1 轮/薄弱 1/67%）');
    ok(cardA.querySelector('.lib-bar i').style.width === '67%', 'A 卡进度条宽度 67%');
    ok(cardA.textContent.includes('天未复习，建议回温'), 'A 卡超 14 天未复习出现回温徽标');
    const cardB = doc.querySelector('.lib-card[data-idx="1"]');
    ok(cardB.textContent.includes('尚未打开方案打卡'), 'B 卡无进度显示未开始');
    ok(cardB.querySelector('.lib-btn-open').getAttribute('href') === 'dream-memorization-plan.html', 'B 卡原方案相对链接正确');

    const search = doc.querySelector('.lib-search');
    search.value = 'success';
    search.dispatchEvent(new w.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    ok(doc.querySelectorAll('.lib-card').length === 1, '搜索 success 只剩 1 张卡');
    search.value = 'zzz-nope';
    search.dispatchEvent(new w.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    ok(doc.querySelectorAll('.lib-card').length === 0 && !doc.getElementById('emm-lib-empty').hidden, '无匹配时显示空态提示');
    search.value = '';
    search.dispatchEvent(new w.Event('input', { bubbles: true }));
    await new Promise((r) => setTimeout(r, 250));
    ok(doc.querySelectorAll('.lib-card').length === 2, '清空搜索恢复 2 张卡');
  }

  console.log('== v2.17 记忆库：轻刷会话（结果不落盘） ==');
  {
    const { w, doc } = await bootLib([libA, libB], { seed: true });
    const before = snapshotProgress(w);
    doc.querySelector('.lib-card[data-idx="0"] [data-drill]').click();
    const session = doc.getElementById('emm-lib-session');
    ok(!session.hidden && doc.getElementById('emm-lib-shelf').hidden, '轻刷打开：会话显示、书架隐藏');
    ok(session.querySelectorAll('.ls-step').length === 3, '链回忆渲染 3 句');
    ok(session.querySelector('.ls-stage').textContent.includes('① 链回忆'), '阶段一：链回忆');
    const step0 = session.querySelector('.ls-step');
    step0.querySelector('.ls-hook').click();
    ok(step0.classList.contains('open') && step0.querySelector('.ls-en').textContent.includes('Test sentence number 1'), '点钩子揭开原句');
    const mark = session.querySelectorAll('.ls-mark')[1];
    mark.click();
    ok(mark.classList.contains('on'), '第 2 句标记「卡了」');
    ok(snapshotProgress(w) === before, '链回忆全程未写 localStorage');

    session.querySelector('#emm-lib-toclz').click();
    ok(session.querySelector('.ls-stage').textContent.includes('② 挖空挑战'), '阶段二：挖空挑战');
    const inp = session.querySelector('input.emm-clz');
    ok(!!inp && inp.getAttribute('data-ans') === 'words', '挖空输入框带答案数据');
    inp.value = 'WORDS!';
    inp.dispatchEvent(new w.Event('blur'));
    ok(inp.classList.contains('emm-clz-ok'), '正确答案（大小写/标点不敏感）判 ✓');
    inp.value = 'nope';
    inp.dispatchEvent(new w.Event('blur'));
    ok(inp.classList.contains('emm-clz-bad'), '错误答案判 ✗');
    inp.value = '';
    inp.dispatchEvent(new w.Event('blur'));
    ok(!inp.classList.contains('emm-clz-bad') && !inp.classList.contains('emm-clz-ok'), '清空输入重置判定');
    inp.value = 'nope';
    inp.dispatchEvent(new w.Event('blur'));

    session.querySelector('#emm-lib-tosum').click();
    ok(session.querySelector('.ls-stage').textContent.includes('③ 结算'), '阶段三：结算');
    ok(session.querySelector('.ls-sum').textContent.includes('自判卡壳 1') && session.querySelector('.ls-sum').textContent.includes('错 1 / 1 空'), '结算统计：卡壳 1 句、错 1/1 空');
    ok(session.querySelector('.ls-miss').textContent.includes('第 2 句') && session.querySelector('.ls-miss').textContent.includes('错空词「words」'), '结算列出卡壳句号与错空词');
    ok(snapshotProgress(w) === before, '轻刷全程（含挖空批改）未写 localStorage');

    session.querySelector('#emm-lib-done').click();
    ok(session.hidden && !doc.getElementById('emm-lib-shelf').hidden, '完成返回书架');
  }

  console.log('== v2.17 记忆库：空库与 ?check=1 自检 ==');
  {
    const { doc } = await bootLib([]);
    ok(!doc.getElementById('emm-lib-empty').hidden && doc.getElementById('emm-lib-empty').textContent.includes('记忆库还是空的'), '空库显示引导');
  }
  {
    const { doc } = await bootLib([libA, libB], { query: '?check=1' });
    const t = doc.querySelector('.emm-check-rpt').textContent;
    ok(t.includes('《Success》') && t.includes('✅ 链回忆 3 句'), '自检：A 链句数对齐判 ✅');
    ok(t.includes('✅ 挖空#1：空数 1 == 答案数 1'), '自检：A 挖空配对判 ✅');
    ok(t.includes('《Dream》') && t.includes('⚠ 挖空#1：空数 2 ≠ 答案数 1'), '自检：B 挖空失配判 ⚠');
  }

  console.log('== v2.28.1 记忆库：</script 截断防护 ==');
  {
    // 根因（审计 v2.28.1）：{{ARTICLES}} 填进 <script> 内，数据若含 </script 会让 HTML 解析器
    // 在字符串内部提前闭合脚本 → 整页 JS 静默挂掉，而 node --check 与 JS 提取都查不出来。
    // 交付校验 = 填充后全文 </script 计数必须为 1（SKILL.md 校验第 5 条）。这里锁死三件事：
    ok((libTemplate.match(/<\/script/g) || []).length === 1, '模板本身 </script 恰好 1 次');
    ok((fillLib([libA]).match(/<\/script/g) || []).length === 1, '正常数据填充后仍恰好 1 次');
    const hostileC = Object.assign({}, libB, { title: 'Dream</script>' });
    ok((fillLib([hostileC]).match(/<\/script/g) || []).length === 2, '含闭合序列的数据填充后计数变 2 → 交付校验可捕获');
  }

  console.log('== v2.28.2 记忆库：同名 key 检测 ==');
  {
    const dupB = Object.assign({}, libB, { key: libA.key });
    const { doc } = await bootLib([libA, dupB], { query: '?check=1' });
    const t = doc.querySelector('.emm-check-rpt').textContent;
    ok(t.includes('key 与第 1 篇重复'), '自检：重复 key 判 ⚠（同名陷阱会共享进度键）');
  }
}

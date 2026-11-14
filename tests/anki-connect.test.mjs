/**
 * v2.43.0 AnkiConnect 可选直推 · 运行时验证
 *
 * 对标 docs/SIMILAR-SKILLS.md #4（Top5 里最后一个未落地项）。
 * 设计约束：只访问本机 loopback 127.0.0.1:8765；探测失败/CORS 被拒/超时
 * 一律自动回退现有 CSV 导出，离线架构不破坏。
 *
 * 检查：
 *   a. 静态：按钮 / 锚点 / 共用 collectAnkiCards / loopback 地址 / 兼容矩阵含 fetch
 *   b. 成功路径：deckNames → createDeck → addNotes，回执写 state.log['anki:<date>']
 *   c. 重复卡：addNotes 返回 null 计入「重复被跳过」
 *   d. 降级路径：无 fetch / fetch 拒绝 → 弹诊断 + 触发 CSV 下载
 *
 * 跑：node tests/anki-connect.test.mjs（需要 npm i --no-save jsdom@16）
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN_TEMPLATE as template, bootCore, dstr, progKeyOfDoc as progKey } from './helpers/boot.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

const fakeArticle = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4. 原文逐句精读</h2>
    <div class="sent"><div class="sent-en">The cat sat on the mat.</div><div class="sent-zh">猫坐在垫子上。</div></div>
    <div class="sent"><div class="sent-en">It was a sunny day.</div><div class="sent-zh">这是晴天。</div></div>
`;
const KEY = 'emm-progress:{{TITLE}}背诵方案';
const wait = ms => new Promise(r => setTimeout(r, ms));

console.log('\n== v2.43.0 AnkiConnect 可选直推 运行时验证 ==');

// A. 静态
ok(/EMM_ANKICONNECT_V243/.test(template), 'EMM_ANKICONNECT_V243 锚点存在');
ok((template.match(/EMM_ANKICONNECT_V243/g) || []).length === 1, '锚点恰好 1 次');
ok(/class="rv-btn rv-anki-push"/.test(template), '复习条含「📡 直推 Anki」按钮');
ok(/127\.0\.0\.1:8765/.test(template), '只访问本机 loopback 8765');
ok(/function collectAnkiCards/.test(template) && /var cards = collectAnkiCards\(\);/.test(template),
  'CSV 与直推共用同一份卡片来源');
ok(/'fetch':/.test(read('bin/check-browser-compat.mjs')), '跨浏览器矩阵登记 fetch');

// 构造一个假的 AnkiConnect（成功响应）
function mockFetch(calls, addNotesResult) {
  return function (url, opts) {
    const body = JSON.parse(opts.body);
    calls.push(body.action);
    let result;
    if (body.action === 'deckNames') result = ['Default', '英语背诵'];
    else if (body.action === 'createDeck') result = 1;
    else if (body.action === 'addNotes') result = addNotesResult === undefined ? [1001, 1002] : addNotesResult;
    return Promise.resolve({ json: () => Promise.resolve({ result: result, error: null }) });
  };
}

// B. 成功路径
{
  const { w, doc, alerts } = await bootCore({ replaceWrap: fakeArticle, captureDownloads: true });
  const calls = [];
  w.fetch = mockFetch(calls);
  doc.querySelector('.rv-anki-push').click();
  await wait(120);
  ok(calls.join(',') === 'deckNames,createDeck,addNotes', `调用顺序 deckNames → createDeck → addNotes（${calls.join(',')}）`);
  const last = alerts[alerts.length - 1] || '';
  ok(/已直推到 Anki：2 张新增/.test(last), `成功回执含新增数（${last.slice(0, 40)}）`);
  const st = JSON.parse(w.localStorage.getItem(progKey(doc)) || '{}');
  const receipt = st.log && st.log['anki:' + dstr(0)];
  ok(!!receipt && JSON.parse(receipt).added === 2, '回执写入 state.log[anki:<today>]');
  ok(/英语背诵::/.test(JSON.parse(receipt).deck), '牌组名沿用「英语背诵::篇名」');
  ok(doc.querySelector('.rv-anki-push').disabled === false, '按钮在结算后恢复可用');
}

// C. 重复卡（addNotes 返回 null 表示被跳过）
{
  const { w, doc, alerts } = await bootCore({ replaceWrap: fakeArticle, captureDownloads: true });
  w.fetch = mockFetch([], [1001, null]);
  doc.querySelector('.rv-anki-push').click();
  await wait(120);
  const last = alerts[alerts.length - 1] || '';
  ok(/1 张新增/.test(last) && /1 张重复被跳过/.test(last), '重复卡单独计入回执');
}

// D. 降级：无 fetch
{
  const { w, doc, alerts, downloads } = await bootCore({ replaceWrap: fakeArticle, captureDownloads: true });
  try { delete w.fetch; } catch (e) { w.fetch = undefined; }
  doc.querySelector('.rv-anki-push').click();
  await wait(80);
  const joined = alerts.join('\n');
  ok(/无法连接 AnkiConnect/.test(joined), '弹出连接失败诊断');
  ok(/webCorsOriginList/.test(joined) && /2055492159/.test(joined), '诊断列出 CORS 与插件号两种常见原因');
  ok(downloads.length >= 1 && /-emm-anki-\d{4}-\d{2}-\d{2}\.csv$/.test(downloads[downloads.length - 1].name),
    '自动回退到现有 CSV 导出');
}

// E. 降级：fetch 直接拒绝
{
  const { w, doc, alerts, downloads } = await bootCore({ replaceWrap: fakeArticle, captureDownloads: true });
  w.fetch = () => Promise.reject(new Error('ECONNREFUSED'));
  doc.querySelector('.rv-anki-push').click();
  await wait(80);
  ok(/ECONNREFUSED/.test(alerts.join('\n')), '底层错误原样透出到诊断');
  ok(downloads.length >= 1, 'fetch 拒绝时同样回退 CSV');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

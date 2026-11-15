/**
 * v2.44.0 实证研究采集工具 · 运行时验证
 *
 * docs/RESEARCH.md §12 的待办里，「受试者用模板 / 数据采集」一直空缺。
 * 本版补 research/session.html（离线采集页）+ bin/research-validate.mjs（schema 门禁）。
 *
 * 检查：
 *   a. session.html 自包含、不联网、字段与 data_schema 对齐
 *   b. jsdom 下填写 → 保存 localStorage → 导出结构正确、客户端校验生效
 *   c. CLI 对 protocol 内两个示例受试者通过；对 4 类造坏数据判失败（退出码 1）
 *   d. --csv / --anon 导出正确（含 transcript 剔除）
 *   e. RESEARCH.md §12 待办状态已更新
 *
 * 跑：node tests/research-collector.test.mjs（需要 npm i --no-save jsdom@16）
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { JSDOM, VirtualConsole } from './helpers/boot.mjs';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');
const HTML = 'research/session.html';
const CLI = path.join(ROOT, 'bin', 'research-validate.mjs');
const PROTOCOL = path.join(ROOT, 'tests', 'fixtures', 'research-protocol.json');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'emm-research-'));
function runCli(args) {
  let code = 0, out = '';
  try { out = execFileSync(process.execPath, [CLI, ...args, '--no-color'], { encoding: 'utf8', cwd: ROOT }); }
  catch (e) { code = e.status ?? 1; out = (e.stdout || '') + (e.stderr || ''); }
  return { code, out };
}

console.log('\n== v2.44.0 实证研究采集工具 运行时验证 ==');

// A. 采集页自包含 / 字段
const html = read(HTML);
ok(!/<script[^>]+src=|<link[^>]+href=|<img[^>]+src=/.test(html), '页面零外部资源引用');
ok(!/\bfetch\s*\(|XMLHttpRequest|WebSocket|sendBeacon/.test(html), '页面不发起任何网络请求');
ok(html.includes('localStorage') && html.includes('不联网'), '数据只写本机并明示隐私声明');
const schemaFields = ['subject_id', 'consent_signed', 'baseline.phq9', 'baseline.gad7',
  'd7_recall.transcript', 'd7_recall.total_pct', 'retest_speed_sec'];
ok(schemaFields.every(k => html.includes('name="' + k + '"')),
  `7 个 data_schema 关键字段都映射到表单 name（${schemaFields.length} 个）`);
ok(/P\[0-9\]\{2\}/.test(html), '客户端校验受试者编号 P01–P20 格式');

// B. jsdom 行为
{
  const vc = new VirtualConsole(); vc.on('jsdomError', () => {});
  const dom = new JSDOM(html, { runScripts: 'outside-only', url: 'http://localhost/session.html', virtualConsole: vc });
  const w = dom.window, doc = w.document;
  w.URL.createObjectURL = () => 'blob:mock';
  w.URL.revokeObjectURL = () => {};
  w.HTMLAnchorElement.prototype.click = function () { w.__lastDownload = this.download; };
  const blocks = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).join('\n;\n');
  w.eval(blocks);

  ok(!!doc.getElementById('day3_minutes'), 'D1–D3 训练日志动态生成');
  ok(!!doc.getElementById('save') && !!doc.getElementById('export'), '保存 / 导出按钮存在');

  // 未签同意书 → 拒绝保存
  doc.getElementById('subject_id').value = 'P01';
  doc.getElementById('save').click();
  ok(/未签知情同意书/.test(doc.getElementById('status').textContent), '未签同意书时拒绝保存');

  // 完整填写 → 保存 + 导出
  doc.getElementById('consent_signed').checked = true;
  doc.getElementById('enrolled_at').value = '2026-11-16T10:00';
  doc.getElementById('english_score').value = '510';
  doc.getElementById('phq9').value = '2';
  doc.getElementById('day1_minutes').value = '72';
  doc.getElementById('day1_weak').value = '3,5';
  doc.getElementById('transcript').value = 'Four score and seven years ago';
  doc.getElementById('scores').value = '4,4,3';
  doc.getElementById('total_pct').value = '91.7';
  doc.getElementById('save').click();
  const stored = JSON.parse(w.localStorage.getItem('emm-research:P01') || '{}');
  ok(stored.subject_id === 'P01' && stored.consent_signed === true, '保存到本机 localStorage（键含编号）');
  ok(stored.baseline && stored.baseline.phq9 === 2, '嵌套字段组装正确（baseline.phq9）');
  ok(Array.isArray(stored.training_log) && stored.training_log[0].weak_sentences.join(',') === '3,5',
    '训练日志与逗号分隔的薄弱句号解析正确');
  ok(stored.d7_recall && stored.d7_recall.score_per_sentence.join(',') === '4,4,3', 'D7 逐句评分解析正确');
  doc.getElementById('export').click();
  ok(w.__lastDownload === 'P01-emm-research.json', `导出文件名按编号生成（${w.__lastDownload}）`);
  doc.getElementById('clear').click();
  doc.getElementById('subject_id').value = 'P01';
  doc.getElementById('load').click();
  ok(doc.getElementById('english_score').value === '510', '清空后可从本机记录载入');
}

// C. CLI 正向
{
  const r = runCli([PROTOCOL]);
  ok(r.code === 0, `两个示例受试者通过 schema 校验（exit ${r.code}）`);
  ok(/example_subject_experimental/.test(r.out) && /example_subject_control/.test(r.out), '两条记录都被扫描');
  ok(/复核提示/.test(r.out), '独立指标差异给出复核提示但不阻断');
  ok(!/不得为 null/.test(r.out), '对照组不适用的 null 探索性指标按「未采集」跳过');
}
// D. CLI 负向：4 类造坏数据
{
  const proto = JSON.parse(read('tests/fixtures/research-protocol.json'));
  const base = JSON.parse(JSON.stringify(proto.example_subject_experimental));
  const cases = [
    ['编号格式', o => { o.subject_id = 'P99x'; }],
    ['分组枚举', o => { o.group = 'unknown'; }],
    ['量表越界', o => { o.baseline.phq9 = 40; }],
    ['缺知情同意', o => { delete o.consent_signed; }],
  ];
  cases.forEach(([label, mutate], i) => {
    const o = JSON.parse(JSON.stringify(base)); mutate(o);
    const p = path.join(tmp, 'bad' + i + '.json');
    fs.writeFileSync(p, JSON.stringify(o), 'utf8');
    const r = runCli([p]);
    ok(r.code === 1, `负向「${label}」被拦下（exit ${r.code}）`);
  });
  const more = [
    ['逐句评分越界', o => { o.d7_recall.score_per_sentence = [4, 9, 3]; }],
    ['入组时间格式', o => { o.enrolled_at = 'yesterday'; }],
    ['必填字段为 null', o => { o.subject_id = null; }],
  ];
  more.forEach(([label, mutate], i) => {
    const o = JSON.parse(JSON.stringify(base)); mutate(o);
    const p = path.join(tmp, 'more' + i + '.json');
    fs.writeFileSync(p, JSON.stringify(o), 'utf8');
    ok(runCli([p]).code === 1, `负向「${label}」被拦下`);
  });
}
// E. 导出
{
  const csv = path.join(tmp, 'out.csv'), anon = path.join(tmp, 'anon.json');
  const r = runCli([PROTOCOL, '--csv', csv, '--anon', anon]);
  ok(r.code === 0, '带导出参数时仍退出码 0');
  const lines = fs.readFileSync(csv, 'utf8').trim().split(/\r?\n/);
  ok(lines.length === 3, `CSV 为 1 表头 + 2 行（实际 ${lines.length}）`);
  ok(/^subject_id,group,enrolled_at/.test(lines[0].replace(/^\ufeff/, '')), 'CSV 表头正确（BOM 已考虑）');
  const arr = JSON.parse(fs.readFileSync(anon, 'utf8'));
  ok(arr.length === 2 && arr.every(x => x.d7_recall && !('transcript' in x.d7_recall)),
    '匿名化导出剔除 transcript 自由文本');
}
// F. 文档状态
{
  const doc = read('docs/RESEARCH.md');
  ok(/\[x\].*research-template|\[x\].*session\.html|采集页/.test(doc), 'RESEARCH.md §12 记录采集工具已就绪');
}

fs.rmSync(tmp, { recursive: true, force: true });
console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

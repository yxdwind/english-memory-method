#!/usr/bin/env node
/**
 * bin/research-validate.mjs · v2.44.0 · 实证研究数据校验 / 导出（零依赖）
 *
 * 把 docs/RESEARCH.md 的实验设计从「草案」推进到「可执行」：受试者数据
 * 从 research/session.html 导出后，先过这道门禁再进入统计。
 *
 * 用法：
 *   node bin/research-validate.mjs <data.json|dir> [--csv out.csv] [--anon out.json] [--no-color]
 *   node bin/research-validate.mjs tests/fixtures/research-protocol.json --protocol-only
 *
 * 输入：单个受试者对象、对象数组，或含多个 .json 的目录。
 * 退出码：0=全部通过；1=存在校验失败；2=参数/读取错误。
 *
 * 校验依据：tests/fixtures/research-protocol.json 的 data_schema（draft-07 子集），
 * 只实现本 schema 用到的关键字：type / required / enum / pattern / minimum /
 * maximum / format(date-time) / items / properties。零外部依赖，便于离线审计。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const PROTOCOL = path.join(ROOT, 'tests', 'fixtures', 'research-protocol.json');
const argv = process.argv.slice(2);
const noColor = argv.includes('--no-color') || !process.stdout.isTTY;
const paint = (c, s) => noColor ? s : ({ red: '\x1b[31m', green: '\x1b[32m', yellow: '\x1b[33m', bold: '\x1b[1m', dim: '\x1b[2m' }[c] + s + '\x1b[0m');

function arg(name) { const i = argv.indexOf(name); return i > -1 ? argv[i + 1] : null; }
function fail(msg, code = 2) { console.error(paint('red', '❌ ' + msg)); process.exit(code); }

// ── draft-07 子集校验器 ───────────────────────────────────────────────────
function validate(v, schema, at, out, optional = false) {
  // 研究数据里 null 表示「该组不适用 / 未采集」（如对照组没有 exploratory 指标）。
  // 非必填字段允许 null；必填字段为 null 仍是错误。
  if (v === null) {
    if (optional) return;
    out.push(`${at}: 必填字段不得为 null`);
    return;
  }
  if (schema.type) {
    const t = schema.type;
    const actual = Array.isArray(v) ? 'array' : v === null ? 'null' : typeof v;
    const okType = t === 'integer' ? (typeof v === 'number' && Number.isInteger(v))
      : t === 'number' ? typeof v === 'number' && Number.isFinite(v)
      : actual === t;
    if (!okType) { out.push(`${at}: 类型应为 ${t}（实际 ${actual}）`); return; }
  }
  if (schema.enum && !schema.enum.includes(v)) out.push(`${at}: 值 ${JSON.stringify(v)} 不在枚举 ${JSON.stringify(schema.enum)}`);
  if (schema.pattern && typeof v === 'string' && !new RegExp(schema.pattern).test(v))
    out.push(`${at}: '${v}' 不匹配 ${schema.pattern}`);
  if (typeof v === 'number') {
    if (schema.minimum !== undefined && v < schema.minimum) out.push(`${at}: ${v} < 下限 ${schema.minimum}`);
    if (schema.maximum !== undefined && v > schema.maximum) out.push(`${at}: ${v} > 上限 ${schema.maximum}`);
  }
  if (schema.format === 'date-time' && typeof v === 'string' && !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(Z|[+-]\d{2}:\d{2})?$/.test(v))
    out.push(`${at}: '${v}' 不是 ISO date-time`);
  if (schema.type === 'object' && v && typeof v === 'object' && !Array.isArray(v)) {
    (schema.required || []).forEach(k => {
      if (!(k in v)) out.push(`${at}.${k}: 必填字段缺失`);
    });
    Object.entries(schema.properties || {}).forEach(([k, sub]) => {
      if (k in v) validate(v[k], sub, `${at}.${k}`, out, !(schema.required || []).includes(k));
    });
  }
  if (schema.type === 'array' && Array.isArray(v) && schema.items)
    v.forEach((item, i) => validate(item, schema.items, `${at}[${i}]`, out));
}

// ── 输入收集 ─────────────────────────────────────────────────────────────
const target = argv.find(a => !a.startsWith('--') && a !== arg('--csv') && a !== arg('--anon'));
if (!target) fail('缺少数据文件/目录参数。用法见文件头注释。');
let protocol;
try { protocol = JSON.parse(fs.readFileSync(PROTOCOL, 'utf8')); }
catch (e) { fail('无法读取 research-protocol.json：' + e.message); }
const schema = protocol.data_schema;

let subjects = [];
try {
  const st = fs.statSync(path.resolve(target));
  if (st.isDirectory()) {
    const files = fs.readdirSync(path.resolve(target)).filter(f => f.endsWith('.json')).sort();
    if (!files.length) fail('目录内没有 .json 文件');
    files.forEach(f => {
      const j = JSON.parse(fs.readFileSync(path.join(path.resolve(target), f), 'utf8'));
      (Array.isArray(j) ? j : [j]).forEach(x => subjects.push({ file: f, data: x }));
    });
  } else {
    const j = JSON.parse(fs.readFileSync(path.resolve(target), 'utf8'));
    // 直接传 protocol.json 时，用内嵌的两个示例受试者跑自检
    if (j.data_schema) {
      subjects = [
        { file: 'example_subject_experimental', data: j.example_subject_experimental },
        { file: 'example_subject_control', data: j.example_subject_control },
      ];
    } else {
      (Array.isArray(j) ? j : [j]).forEach(x => subjects.push({ file: path.basename(target), data: x }));
    }
  }
} catch (e) { fail('读取输入失败：' + e.message); }

// ── 校验 ────────────────────────────────────────────────────────────────
console.log(paint('bold', `english-memory-method · 研究数据校验（schema ${protocol.schema_version}）`));
console.log(paint('dim', `${subjects.length} 条受试者记录 · 依据 docs/RESEARCH.md §5 指标\n`));
let bad = 0;
const clean = [], notes = [];
subjects.forEach(({ file, data }) => {
  const errs = [];
  validate(data, schema, data && data.subject_id ? data.subject_id : file, errs);
  // 注意：docs/RESEARCH.md §5 里 total_pct（全文正确率）与 score_per_sentence（逐句量表）
  // 是两个独立指标，协议示例里就相差 5 分。这里只给复核提示，不作为硬约束。
  const d7 = data && data.d7_recall;
  if (d7 && Array.isArray(d7.score_per_sentence) && d7.score_per_sentence.length && typeof d7.total_pct === 'number') {
    const calc = d7.score_per_sentence.reduce((a, b) => a + b, 0) / (d7.score_per_sentence.length * 4) * 100;
    if (Math.abs(calc - d7.total_pct) > 2)
      notes.push(`${data.subject_id}: total_pct ${d7.total_pct} vs 逐句评分推算 ${calc.toFixed(1)}（两者独立指标，建议复核录入）`);
  }
  if (errs.length) {
    bad++;
    console.log(`  ${paint('red', '❌')} ${file}: ${errs.length} 项`);
    errs.forEach(e => console.log('      ✗ ' + e));
  } else {
    clean.push(data);
    console.log(`  ${paint('green', '✅')} ${file}  (${data.subject_id} / ${data.group})`);
  }
});

// ── 导出 ────────────────────────────────────────────────────────────────
const csvOut = arg('--csv'), anonOut = arg('--anon');
if (anonOut) {
  // 匿名化：去掉自由文本 transcript（可能含可识别信息），只保留结构化数值
  const anon = clean.map(s => {
    const c = JSON.parse(JSON.stringify(s));
    if (c.d7_recall) delete c.d7_recall.transcript;
    return c;
  });
  fs.writeFileSync(path.resolve(anonOut), JSON.stringify(anon, null, 2) + '\n', 'utf8');
  console.log(paint('green', `\n  ✅ 匿名化导出 ${anon.length} 条 → ${anonOut}（已剔除 transcript 自由文本）`));
}
if (csvOut) {
  const cols = ['subject_id', 'group', 'enrolled_at', 'consent_signed',
    'english_score', 'english_test', 'vark_v', 'vark_a', 'vark_r', 'vark_k', 'phq9', 'gad7',
    'd1_min', 'd2_min', 'd3_min', 'd7_total_pct', 'd7_mean_score', 'retest_speed_sec'];
  const cell = x => {
    const s = x === undefined || x === null ? '' : String(x);
    return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
  };
  const rows = [cols.join(',')];
  clean.forEach(s => {
    const b = s.baseline || {}, v = b.vark || {}, log = s.training_log || [], d7 = s.d7_recall || {};
    const mins = [1, 2, 3].map(d => { const e = log.find(x => x.day === d); return e ? e.minutes : ''; });
    const sc = d7.score_per_sentence || [];
    rows.push([s.subject_id, s.group, s.enrolled_at, s.consent_signed,
      b.english_score, b.english_test, v.v, v.a, v.r, v.k, b.phq9, b.gad7,
      ...mins, d7.total_pct, sc.length ? (sc.reduce((a, c) => a + c, 0) / sc.length).toFixed(3) : '',
      s.retest_speed_sec].map(cell).join(','));
  });
  fs.writeFileSync(path.resolve(csvOut), '\ufeff' + rows.join('\r\n') + '\r\n', 'utf8');
  console.log(paint('green', `  ✅ CSV 导出 ${clean.length} 行 × ${cols.length} 列 → ${csvOut}`));
}

if (notes.length) {
  console.log('\n' + paint('yellow', '⚠ 复核提示（不阻断）:'));
  notes.forEach(n => console.log('    · ' + n));
}
console.log('');
if (bad) {
  console.log(paint('red', `⚑ ${bad} 条记录未通过，禁止进入统计（详见上方）`));
  process.exit(1);
}
console.log(paint('green', `✓ 全部 ${subjects.length} 条通过 ${schema.required.length} 项必填 + 类型/范围/枚举/格式/items 校验`));

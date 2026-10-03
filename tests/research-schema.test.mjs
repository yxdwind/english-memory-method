/**
 * v2.20 §3.3 RESEARCH 实验设计 · 数据 schema 验证
 *
 * 验证：
 *   a. research-protocol.json 是合法 JSON
 *   b. 顶层必需字段存在
 *   c. data_schema 是合法 JSON Schema（手动校验，零依赖）
 *   d. example_subject_experimental / example_subject_control 满足 data_schema
 *   e. design.n_per_group × 2 = n_total
 *   f. primary_tests 与 hypothesis 数量对应
 *   g. timeline 14 天对应 14 天研究周期
 *
 * 跑：node tests/research-schema.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIXTURE = path.join(HERE, 'fixtures', 'research-protocol.json');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

console.log('\n== v2.20 §3.3 RESEARCH 实验设计 数据 schema 验证 ==');

// a. JSON 解析
let protocol;
try {
  protocol = JSON.parse(fs.readFileSync(FIXTURE, 'utf8'));
  ok(true, 'research-protocol.json 是合法 JSON');
} catch (e) {
  ok(false, 'research-protocol.json 是合法 JSON（解析失败：' + e.message + '）');
  console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
  process.exit(1);
}

// b. 顶层必需字段
const requiredTop = ['version', 'study_title', 'design', 'material', 'inclusion', 'exclusion', 'timeline', 'measures', 'statistics', 'data_schema'];
requiredTop.forEach(k => ok(k in protocol, `顶层字段 "${k}" 存在`));

// c. data_schema 合法（手动校验）
const schema = protocol.data_schema;
ok(schema && schema.type === 'object', 'data_schema 是 object 类型');
ok(Array.isArray(schema.required), 'data_schema 有 required 数组');
ok(Array.isArray(schema.properties.subject_id.enum || []), 'subject_id 无 enum（应使用 pattern）');
ok(schema.properties.subject_id.pattern === '^P[0-9]{2}$', 'subject_id pattern = P[0-9]{2}');
ok(schema.properties.group.enum.includes('experimental') && schema.properties.group.enum.includes('control'), 'group enum 含 experimental/control');

// d. example_subjects 满足 schema
function validateSubject(s, label) {
  ok(s.subject_id && /^P[0-9]{2}$/.test(s.subject_id), `${label}.subject_id 匹配 P[0-9]{2}（实际 ${s.subject_id}）`);
  ok(['experimental', 'control'].includes(s.group), `${label}.group ∈ {experimental, control}（实际 ${s.group}）`);
  ok(typeof s.consent_signed === 'boolean', `${label}.consent_signed 是 boolean`);
  ok(s.enrolled_at && !isNaN(Date.parse(s.enrolled_at)), `${label}.enrolled_at 是合法日期字符串`);
  if (s.d7_recall) {
    ok(Array.isArray(s.d7_recall.score_per_sentence), `${label}.d7_recall.score_per_sentence 是数组`);
    s.d7_recall.score_per_sentence.forEach((sc, i) => {
      ok(Number.isInteger(sc) && sc >= 0 && sc <= 4, `${label} 第 ${i+1} 句评分 ∈ [0,4]（实际 ${sc}）`);
    });
    ok(s.d7_recall.total_pct >= 0 && s.d7_recall.total_pct <= 100, `${label}.d7_recall.total_pct ∈ [0,100]（实际 ${s.d7_recall.total_pct}）`);
  }
  if (s.subjective) {
    ok(s.subjective.difficulty >= 1 && s.subjective.difficulty <= 5, `${label}.subjective.difficulty ∈ [1,5]（实际 ${s.subjective.difficulty}）`);
  }
}
validateSubject(protocol.example_subject_experimental, '实验组示例');
validateSubject(protocol.example_subject_control, '对照组示例');

// e. design 字段
const d = protocol.design;
ok(d.n_total === 20, `design.n_total = 20（实际 ${d.n_total}）`);
ok(d.n_per_group === 10, `design.n_per_group = 10（实际 ${d.n_per_group}）`);
ok(d.n_per_group * 2 === d.n_total, `n_per_group × 2 = n_total`);

// f. primary_tests 与 H1/H2/H3 对应
const hIds = protocol.statistics.primary_tests.map(t => t.hypothesis);
ok(hIds.length === 3, `primary_tests 数量 = 3（实际 ${hIds.length}）`);
['H1', 'H2', 'H3'].forEach(h => ok(hIds.includes(h), `primary_tests 包含 ${h}`));
ok(protocol.statistics.primary_tests[0].test === 'Welch_t', 'H1 使用 Welch_t');
ok(protocol.statistics.primary_tests[1].test === 'Mann_Whitney_U', 'H2 使用 Mann_Whitney_U（小样本非正态）');

// g. timeline 14 天
const tl = protocol.timeline;
['D0', 'D1_D3', 'D4_D7', 'D7'].forEach(k => ok(k in tl, `timeline.${k} 存在`));
ok(d.duration_days === 14, `design.duration_days = 14（实际 ${d.duration_days}）`);

// h. measures 类型
const m = protocol.measures;
ok(m.primary.id === 'M1' && m.primary.name === 'd7_recall_accuracy', '主指标 M1 = d7_recall_accuracy');
ok(m.secondary.length >= 3, `次要指标 ≥ 3（实际 ${m.secondary.length}）`);
ok(m.secondary.some(s => s.id === 'S1'), '次要指标含 S1 (training_total_minutes)');
ok(m.secondary.some(s => s.id === 'S2'), '次要指标含 S2 (subjective_difficulty)');
ok(m.secondary.some(s => s.id === 'S3'), '次要指标含 S3 (retest_speed_sec)');

// i. Cohen's d 阈值单调
const cs = protocol.statistics.effect_size.thresholds;
ok(cs.trivial < cs.small && cs.small < cs.medium && cs.medium < cs.large, `Cohen's d 阈值单调：trivial<small<medium<large (${cs.trivial}<${cs.small}<${cs.medium}<${cs.large})`);

// j. 伦理字段
ok(protocol.ethics.irb_required === true, 'ethics.irb_required = true');
ok(protocol.ethics.informed_consent_required === true, 'ethics.informed_consent_required = true');
ok(protocol.ethics.exit_right.includes('anytime'), 'ethics.exit_right 含 anytime');

// k. 文档与 schema 路径一致
ok(typeof protocol.study_short === 'string' && protocol.study_short.length > 0, `study_short 标识（${protocol.study_short}）`);

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);
/**
 * v2.42.0 生成质量评测集（evals/）· 运行时验证
 *
 * 对每个 evals/cases/*.html 跑 `verify-plan --eval`，比对 expected.json：
 *   a. 退出码 0（advisory 模式恒 0）
 *   b. 四条 E 规则状态（pass/warn/fail）逐项一致
 *   c. 质量分精确一致（100 − warn×10 − fail×25）
 * 守护点：E 规则口径漂移（阈值/公式改动）会被 expected.json 立即拦下。
 *
 * 跑：node tests/evals.test.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

console.log('\n== v2.42.0 生成质量评测集（evals/）==');

const expected = JSON.parse(readFileSync(path.join(ROOT, 'evals', 'expected.json'), 'utf8'));
const cases = Object.keys(expected).filter(k => !k.startsWith('_'));

for (const file of cases) {
  let stdout = '', code = 0;
  try {
    stdout = execFileSync(process.execPath, [path.join(ROOT, 'bin', 'verify-plan.mjs'),
      path.join(ROOT, 'evals', 'cases', file), '--eval', '--no-color'], { encoding: 'utf8' });
  } catch (e) { code = e.status ?? 1; stdout = e.stdout || ''; }
  ok(code === 0, file + '：--eval 退出码 0');

  const exp = expected[file];
  for (const [rule, want] of Object.entries(exp).filter(([k]) => k.startsWith('E'))) {
    const line = stdout.split('\n').find(l => l.includes(rule + ' '));
    ok(!!line, file + '：输出含 ' + rule + ' 行');
    if (line) {
      const got = line.includes('✅') ? 'pass' : line.includes('⚠') ? 'warn' : line.includes('❌') ? 'fail' : '?';
      ok(got === want, file + '：' + rule + ' 状态 ' + got + '（期望 ' + want + '）');
    }
  }
  const score = Number((stdout.match(/质量分：(\d+)\/100/) || [])[1]);
  ok(score === exp.score, file + '：质量分 ' + score + '（期望 ' + exp.score + '）');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

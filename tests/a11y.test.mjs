/**
 * v2.43.0 可访问性基础四件套 · 运行时验证
 *
 * ANALYSIS.md §2.3.5 曾给 a11y 评 4/10（SVG 无 title/desc、低对比色、clickable div、
 * 输入框无 label、无 prefers-reduced-motion），此后一直未动。本版补齐可机器验证的四项：
 *   a. prefers-reduced-motion 媒体查询（覆盖 JS 内联 transition）
 *   b. 结构图 SVG 的 role/aria-label/title/desc（规范 + 样例实现）
 *   c. 自测模式下 .sent 的 role/tabindex/aria-label + Enter/空格键盘等价
 *   d. contenteditable 留白的 role="textbox" + aria-label
 *
 * 跑：node tests/a11y.test.mjs（需要 npm i --no-save jsdom@16）
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
  <h2>17. 记忆宫殿映射</h2>
    <div class="palace-stop" data-sents="1"><span class="st-no">站 1</span></div>
    <div class="palace-stop" data-sents="2"><span class="st-no">站 2</span></div>
`;

console.log('\n== v2.43.0 可访问性基础四件套 运行时验证 ==');

// A. 减少动态效果
ok(/@media \(prefers-reduced-motion: reduce\)/.test(template), '模板含 prefers-reduced-motion 媒体查询');
ok(/transition-duration:\.01ms!important/.test(template), '用 !important 覆盖 JS 内联 transition');
ok(read('src/plan/css/main.css').includes('prefers-reduced-motion'), '源码 CSS 与产物同源');

// B. 结构图 SVG
ok(/<title>/.test(read('SKILL.md')) && /<desc>/.test(read('SKILL.md')) && /结构图规范/.test(read('SKILL.md')),
  'SKILL.md 结构图规范硬性要求 title/desc');
const samples = ['getty-memorialization-plan.html', 'ai-education-plan.html', 'boundary-100-plan.html'];
const withTitleDesc = samples.filter(f => {
  const h = read('tests/samples/' + f);
  return /<svg[^>]*role="img"[^>]*>[\s\S]*?<title>/.test(h) && /<desc>/.test(h);
});
ok(withTitleDesc.length === samples.length, `3 个样例内联 SVG 都含 title/desc（${withTitleDesc.length}/3）`);

// C. 自测模式键盘可达
{
  const { w, doc } = await bootCore({ replaceWrap: fakeArticle });
  w.HTMLElement.prototype.scrollIntoView = function () {};
  const sent = doc.querySelector('.sent');
  ok(!sent.hasAttribute('role') && !sent.hasAttribute('tabindex'), '常态下 .sent 不是按钮（不制造多余 tab 停靠点）');
  const quiz = doc.querySelector('.rv-quiz');
  quiz.click(); // 关 → 遮译文
  ok(sent.getAttribute('role') === 'button' && sent.getAttribute('tabindex') === '0',
    '自测开启后 .sent 暴露为 role=button + tabindex=0');
  ok(/第 1 句/.test(sent.getAttribute('aria-label') || ''), 'aria-label 带 1-based 句号');
  const ev = new w.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true });
  sent.dispatchEvent(ev);
  ok(sent.classList.contains('revealed'), 'Enter 键等价于点击：揭开译文');
  sent.dispatchEvent(new w.KeyboardEvent('keydown', { key: ' ', bubbles: true, cancelable: true }));
  ok(!sent.classList.contains('revealed'), '空格键再次切换：收起译文');
  quiz.click(); quiz.click(); // 回到「关」
  ok(!sent.hasAttribute('role') && !sent.hasAttribute('tabindex'), '自测关闭后移除按钮语义');
}

// D. 留白可访问
{
  const { doc } = await bootCore({ replaceWrap: fakeArticle });
  const inputs = [...doc.querySelectorAll('.wb-input')];
  ok(inputs.length > 0, `生成 ${inputs.length} 个亲手改造留白`);
  ok(inputs.every(ed => ed.getAttribute('role') === 'textbox'), '所有留白都有 role="textbox"');
  ok(inputs.every(ed => (ed.getAttribute('aria-label') || '').length > 4), '所有留白都有可读的 aria-label');
  const labels = inputs.map(ed => ed.getAttribute('aria-label'));
  ok(new Set(labels).size === labels.length, 'aria-label 互不重复（段号/站号可区分）');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

/**
 * v2.36.0 可选真浏览器套件（playwright-core + 系统 Chrome/Edge）
 *
 * jsdom 测不到真实渲染层（CSS/布局/媒体查询/内联 SVG/真实事件命中）。本套件在本地
 * 找得到系统 Chrome 或 Edge 时，用真实浏览器对样本页做渲染冒烟；找不到时整组跳过
 * （CI/无浏览器环境 exit 0，不影响 npm test 链）。首选 chrome，回退 msedge。
 *
 * 断言（浏览器可用时）：
 *   a. getty 样本：EMMProgressStore 就绪（store 注入块真实执行）、10 句渲染、仪表盘统计
 *   b. 首访 on-boarding 可关闭；「自测」开关可交互（真实点击命中）
 *   c. boundary 样本：100 句渲染、内联 SVG 结构图存在（v2.35.1 修复的破图回归守护）
 *   d. 全程无 pageerror / console.error
 *
 * 跑：node tests/browser-optional.test.mjs   （或 npm run test:browser）
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright-core';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const fileUrl = (f) => 'file:///' + path.join(ROOT, 'tests', 'samples', f).replace(/\\/g, '/');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

let browser = null, channel = '';
for (const ch of ['chrome', 'msedge']) {
  try { browser = await chromium.launch({ channel: ch, headless: true }); channel = ch; break; } catch (e) { /* 试下一个 */ }
}
if (!browser) {
  console.log('\n== 可选真浏览器套件 ==');
  console.log('  ⏭ 未找到系统 Chrome/Edge，整组跳过（npm test 链不受影响）');
  console.log('\n结果: 0 通过, 0 失败（跳过）');
  process.exit(0);
}

console.log('\n== v2.36.0 可选真浏览器套件（' + channel + '）==');
const errors = [];
try {
  const page = await browser.newPage();
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message));
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text()); });

  // a. getty 样本
  await page.goto(fileUrl('getty-memorialization-plan.html'));
  await page.waitForTimeout(400);
  ok(await page.evaluate(() => typeof window.EMMProgressStore === 'object'), 'EMMProgressStore 就绪（store 注入块真实执行）');
  ok((await page.locator('.sent').count()) === 10, 'getty 真实渲染 10 句');
  ok(await page.evaluate(() => document.body.textContent.includes('本篇 10 句')), '仪表盘统计正确（本篇 10 句）');

  // b. on-boarding 关闭 + 自测开关交互
  const dismiss = page.getByRole('button', { name: '我知道了，下次不再显示' });
  if (await dismiss.count()) { try { await dismiss.click({ timeout: 2000 }); } catch (e) { /* 遮挡时忽略 */ } }
  const toggle = page.getByRole('button', { name: /自测：/ }).first();
  const before = await toggle.textContent();
  await toggle.click();
  const after = await toggle.textContent();
  ok(before !== after, '「自测」开关真实点击命中（' + (before || '').trim() + ' → ' + (after || '').trim() + '）');

  // c. boundary 样本 + 内联结构图
  await page.goto(fileUrl('boundary-100-plan.html'));
  await page.waitForTimeout(600);
  ok((await page.locator('.sent').count()) === 100, 'boundary 真实渲染 100 句');
  ok((await page.locator('figure svg').count()) >= 1, '内联 SVG 结构图存在（v2.35.1 破图回归守护）');

  // d. 无错误
  ok(errors.length === 0, '全程无 pageerror / console.error' + (errors.length ? '：' + errors.slice(0, 3).join('；') : ''));
} finally {
  await browser.close();
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

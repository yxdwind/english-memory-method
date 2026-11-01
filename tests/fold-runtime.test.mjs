/**
 * v2.18 EMM_FOLD_V218 首屏折叠 + on-boarding 运行时验证
 *
 * 用 jsdom 加载 plan-template.html（注入真实示例数据），验证：
 *   a. EMM_FOLD_V218 标识存在且唯一
 *   b. 默认 body.emm-folded 类存在（首屏折叠）
 *   c. 浮动切换按钮存在
 *   d. 首次访问时 on-boarding 显示
 *   e. 点击切换按钮 → 折叠/展开切换
 *   f. dismiss on-boarding → 永久消失
 *   g. 进阶章节（h2 编号 ≥ 9）被标记 .emm-advanced
 *   h. 持久化（localStorage 跨 session）
 *
 * 跑：node tests/fold-runtime.test.mjs（需要 npm i --no-save jsdom@16）
 */
import { PLAN_TEMPLATE as template, scriptBlocks, bootCore } from './helpers/boot.mjs';

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

// 提取含 EMM_FOLD_V218 锚点的 <script> 块（即 v2.18 新增的折叠脚本）
// 注意：不能取"最后一个块"——后续版本（如 v2.29.0）会在文件末尾继续追加脚本块
const foldScript = scriptBlocks(template).find(b => /EMM_FOLD_V218/.test(b)) || scriptBlocks(template)[scriptBlocks(template).length - 1];

async function boot(opts = {}) {
  const { w, doc } = await bootCore({ ...opts, evalScripts: 'none' });
  // 仅跑 v2.18 折叠脚本
  w.eval(foldScript);
  return { w, doc };
}

console.log('\n== v2.18 EMM_FOLD_V218 运行时验证 ==');

// 静态检查
ok(!!template.match(/EMM_FOLD_V218/), 'EMM_FOLD_V218 标识存在');
ok((template.match(/EMM_FOLD_V218/g) || []).length === 1, 'EMM_FOLD_V218 恰好 1 次');

const fakeArticle = `
  <h2>1. 整体策略</h2><p>策略</p>
  <h2>2. 文章结构图</h2><p>图</p>
  <h2>3. 今日任务</h2><p>任务</p>
  <h2>4. 原文逐句精读</h2><p>原文</p>
  <h2>9. 三遍法</h2><p>三遍</p>
  <h2>10. 艾宾浩斯复习计划</h2><p>复习</p>
  <h2>11. 挖空自测</h2><p>挖空</p>
  <h2>17. 记忆宫殿</h2><p>宫殿</p>
`;

// 第一次访问
{
  const { doc } = await boot({ prefix: fakeArticle });
  ok(doc.body.classList.contains('emm-folded'), '首次访问：默认 body.emm-folded 存在');
  ok(!!doc.getElementById('emm-fold-toggle'), '浮动切换按钮已注入');
  ok(!!doc.getElementById('emm-onboarding'), '首次访问：on-boarding 显示');
  const advanced = doc.querySelectorAll('.emm-advanced');
  ok(advanced.length >= 4, `进阶章节被标记（实际 ${advanced.length} 个）`);
  // 折叠态：CSS 让 .emm-advanced display:none，jsdom 不跑样式但类已加
  // 点击切换
  doc.getElementById('emm-fold-toggle').click();
  ok(!doc.body.classList.contains('emm-folded'), '点击切换：折叠状态已移除');
}

// 第二次访问（已折叠 + onboarding 关闭）
{
  const { doc } = await boot({ prefix: fakeArticle, preload: { 'emm-fold-state': '1', 'emm-onboarding-shown': '1' } });
  ok(doc.body.classList.contains('emm-folded'), '持久化：折叠状态恢复');
  ok(!doc.getElementById('emm-onboarding'), '持久化：on-boarding 不再显示');
}

// dismiss on-boarding
{
  const { w, doc } = await boot({ prefix: fakeArticle });
  const dismiss = doc.querySelector('.emm-onboarding-dismiss');
  ok(!!dismiss, 'dismiss 按钮存在');
  dismiss.click();
  ok(!doc.getElementById('emm-onboarding'), 'dismiss 后 on-boarding 消失');
  try {
    const v = w.localStorage.getItem('emm-onboarding-shown');
    ok(v === '1', `onboarding-shown 已写入 localStorage（实际值=${JSON.stringify(v)}）`);
  } catch (e) { ok(false, 'localStorage 读取失败: ' + e.message); }
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed ? 1 : 0);
/**
 * v2.41.0 跨方案交错轻刷（interleaving）· 运行时验证
 *
 * a. 静态：模板含「交错轻刷」与轮转混排说明
 * b. 入口：≥2 篇有链数据 → 书架渲染 #emm-lib-inter；单篇 → 隐藏
 * c. 混排顺序：A1→B1→C1→A2→B2→C2（每步显示 .ls-no 与方案徽标《title》）
 * d. 「卡了」标记 → 结算按方案分组（仅 B 组）+ 每方案 ?jump= 回链
 *
 * 跑：node tests/qa-v241.test.mjs
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PLAN_TEMPLATE as template, LIB_TEMPLATE as libTemplate, bootLib } from './helpers/boot.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

console.log('\n== v2.41.0 跨方案交错轻刷 ==');

// a. 静态
ok(libTemplate.indexOf('交错轻刷') >= 0, '库模板含「交错轻刷」入口与说明');
ok(libTemplate.indexOf('openInterleaved') >= 0, '库模板含轮转混排实现');

const mkArt = (key, title, file) => ({
  key, title, file, sents: 2, type: '普通',
  chain: [{ para: 'p', steps: [
    { sidx: '1', h: 'hook-' + key + '-1', en: 'en-' + key + '-1' },
    { sidx: '2', h: 'hook-' + key + '-2', en: 'en-' + key + '-2' },
  ] }],
  cloze: [],
});
const arts = [mkArt('a', 'Alpha 方案', 'alpha.html'), mkArt('b', 'Beta 方案', 'beta.html'), mkArt('c', 'Gamma 方案', 'gamma.html')];

// b/c/d. 三篇会话
{
  const { w, doc } = await bootLib(arts);
  const inter = doc.querySelector('#emm-lib-inter');
  ok(!!inter && inter.textContent.indexOf('3 篇') >= 0, '书架渲染交错入口（3 篇）');
  inter.click();

  let panel = doc.querySelector('#emm-lib-session');
  ok(panel && !panel.hidden && panel.textContent.indexOf('交错轻刷') >= 0, '会话面板打开');

  // 混排顺序 + 卡了 B1
  const seq = [];
  for (let step = 0; step < 6; step++) {
    const no = doc.querySelector('.ls-no').textContent;
    const title = (panel.textContent.match(/《([^》]+)》/) || [])[1];
    seq.push(no + '@' + title);
    const mark = doc.querySelector('.ls-mark');
    if (step === 1) mark.click(); // B1（第 2 步）标卡
    doc.querySelector('#emm-lib-inter-next').click(); // 末步按钮即「查看结算」
  }
  ok(seq.join('|') === '1@Alpha 方案|1@Beta 方案|1@Gamma 方案|2@Alpha 方案|2@Beta 方案|2@Gamma 方案',
     '轮转混排 A1→B1→C1→A2→B2→C2（实际 ' + seq.join('|') + '）');

  // 结算：仅 B 组卡壳 + 跳转链接
  panel = doc.querySelector('#emm-lib-session');
  ok(panel.innerHTML.indexOf('自判卡壳 <b>1</b>') >= 0, '结算卡壳计数 = 1');
  ok(panel.textContent.indexOf('《Beta 方案》第 1 句') >= 0, '结算按方案分组：仅 Beta 组');
  ok(panel.textContent.indexOf('《Alpha 方案》第') < 0 && panel.textContent.indexOf('《Gamma 方案》第') < 0,
     'Alpha/Gamma 无卡壳不出现');
  const jump = panel.querySelector('a[href*="jump="]');
  ok(!!jump && jump.getAttribute('href').indexOf('beta.html?jump=1') === 0, 'Beta 组带 ?jump=1 回链');

  doc.querySelector('#emm-lib-done').click();
  ok(doc.querySelector('#emm-lib-session').hidden, '完成后回书架（session 隐藏）');
}

// b2. 单篇隐藏入口
{
  const { doc } = await bootLib([arts[0]]);
  ok(!doc.querySelector('#emm-lib-inter'), '单篇有链数据时不显示交错入口');
}

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

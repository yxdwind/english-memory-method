/**
 * 构建 tests/samples/ 下的 2 个示例方案（v2.21）：
 *   1. getty-memorialization-plan.html — 林肯葛底斯堡演说（演讲稿）
 *   2. ai-education-plan.html — 一篇议论文（AI 对教育的影响）
 *
 * 用法：node bin/build-samples.mjs
 * 零依赖（只读 plan-template.html + 写入 2 个 .html）。
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(HERE, '..');
const TPL_PATH = path.join(ROOT, 'skills', 'english-memory-method', 'assets', 'plan-template.html');
const OUT_DIR = path.join(ROOT, 'tests', 'samples');

if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });
const tpl = fs.readFileSync(TPL_PATH, 'utf8');

// ── Sample 1: Gettysburg Address（演讲稿 · 公版 · 3 段 10 句）──────
const gettySents = [
  // 段 1：起源
  '<div class="sent">\n  <div class="sent-en">Four score <span class="rv-tie">and seven</span> years ago,</div>\n  <div class="sent-zh">八十七年前，</div>\n  <div class="pron"><span class="lbl">连读</span>score and · /skɔːr ən/ · 词间辅音连缀</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">our fathers brought forth on this continent,</div>\n  <div class="sent-zh">我们的先辈在这块大陆上孕育了一个崭新的国家，</div>\n  <div class="pron"><span class="lbl">弱读</span>on this · /ən ðɪs/ · 弱读冠词</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">a new nation,</div>\n  <div class="sent-zh">一个崭新的国家，</div>\n  <div class="pron"><span class="lbl">连读</span>a new · /ə nuː/ · 元音间连读</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">conceived in liberty,</div>\n  <div class="sent-zh">孕育于自由之中，</div>\n  <div class="pron"><span class="lbl">弱读</span>in · /ɪn/ · 介词弱读</div>\n</div>',
  // 段 2：命题
  '<div class="sent">\n  <div class="sent-en">and dedicated to the proposition that all men are created equal.</div>\n  <div class="sent-zh">并献身于一项崇高的信条——人人生而平等。</div>\n  <div class="pron"><span class="lbl">连读</span>dedicated to · /ˈdɛdɪkeɪtɪd tu/ · 词间连读</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">Now we are engaged in a great civil war,</div>\n  <div class="sent-zh">如今我们卷入了一场伟大的内战，</div>\n  <div class="pron"><span class="lbl">弱读</span>in a · /ɪn ə/ · 介词+冠词双弱读</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">testing whether that nation,</div>\n  <div class="sent-zh">考验着这个国家，</div>\n  <div class="pron"><span class="lbl">连读</span>whether that · /ˈwɛðər ðæt/ · 词间连读</div>\n</div>',
  // 段 3：召唤
  '<div class="sent">\n  <div class="sent-en">or any nation so conceived and so dedicated,</div>\n  <div class="sent-zh">或任何同样孕育、同样献身于此信条的国家，</div>\n  <div class="pron"><span class="lbl">弱读</span>and so · /ən soʊ/ · 连词+小品词双弱读</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">can long endure.</div>\n  <div class="sent-zh">能否长久存续。</div>\n  <div class="pron"><span class="lbl">弱读</span>can · /kən/ · 情态动词弱读</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">We are met on a great battle-field of that war.</div>\n  <div class="sent-zh">我们相逢于这场战争的一个伟大战场。</div>\n  <div class="pron"><span class="lbl">连读</span>met on · /mɛt ɑn/ · 词间连读</div>\n</div>'
];

// ── Sample 2: AI 与教育（议论文 · 5 段 10 句）──────────────────
const aiSents = [
  // 段 1：现状
  '<div class="sent">\n  <div class="sent-en">Artificial intelligence is rapidly transforming how students learn.</div>\n  <div class="sent-zh">人工智能正在快速改变学生的学习方式。</div>\n  <div class="pron"><span class="lbl">弱读</span>is rapidly · /ɪz ˈræpɪdli/ · be 动词弱读</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">From adaptive tutoring systems to automated grading,</div>\n  <div class="sent-zh">从自适应辅导系统到自动评分，</div>\n  <div class="pron"><span class="lbl">连读</span>tutoring systems · /ˈtuːtərɪŋ ˈsɪstəmz/ · 词间连读</div>\n</div>',
  // 段 2：益处
  '<div class="sent">\n  <div class="sent-en">AI offers unprecedented personalization at scale.</div>\n  <div class="sent-zh">人工智能提供了规模化的前所未有的个性化。</div>\n  <div class="pron"><span class="lbl">弱读</span>at scale · /ət skeɪl/ · 介词短语弱读</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">Students who struggled in traditional classrooms</div>\n  <div class="sent-zh">在传统课堂上挣扎的学生</div>\n  <div class="pron"><span class="lbl">连读</span>who struggled · /huː ˈstrʌɡəld/ · 词间连读</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">can now learn at their own pace with AI tutors.</div>\n  <div class="sent-zh">现在可以借助 AI 导师按自己的节奏学习。</div>\n  <div class="pron"><span class="lbl">弱读</span>at their · /ət ðɛər/ · 介词弱读</div>\n</div>',
  // 段 3：风险
  '<div class="sent">\n  <div class="sent-en">However, this technological shift raises critical questions.</div>\n  <div class="sent-zh">然而，这一技术转变提出了关键问题。</div>\n  <div class="pron"><span class="lbl">弱读</span>this technological · /ðɪs tɛknəˈlɑdʒɪkəl/ · 指示代词弱读</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">Does personalized learning risk reducing students to data points?</div>\n  <div class="sent-zh">个性化学习是否会把学生简化为数据点？</div>\n  <div class="pron"><span class="lbl">连读</span>risk reducing · /rɪsk rɪˈdjuːsɪŋ/ · 词间连读</div>\n</div>',
  // 段 4：辩证
  '<div class="sent">\n  <div class="sent-en">Educators must ensure that technology serves pedagogy, not the reverse.</div>\n  <div class="sent-zh">教育者必须确保技术服务教学法，而非反过来。</div>\n  <div class="pron"><span class="lbl">弱读</span>not the · /nɑt ðə/ · 否定小品词弱读</div>\n</div>',
  // 段 5：结论
  '<div class="sent">\n  <div class="sent-en">The future of education depends on how wisely we wield these tools.</div>\n  <div class="sent-zh">教育的未来取决于我们多明智地使用这些工具。</div>\n  <div class="pron"><span class="lbl">连读</span>how wisely · /haʊ ˈwaɪzli/ · 副词连读</div>\n</div>',
  '<div class="sent">\n  <div class="sent-en">AI is a powerful ally, but the human teacher remains irreplaceable.</div>\n  <div class="sent-zh">AI 是一个强大的盟友，但人类教师仍然不可替代。</div>\n  <div class="pron"><span class="lbl">弱读</span>but the · /bət ðə/ · 连词弱读</div>\n</div>'
];

// ── 替换策略 ───────────────────────────────────────────
// 1. 替换 {{TITLE}}
// 2. 替换 <title>{{TITLE}}背诵方案</title>
// 3. 替换 .sent 块（多次匹配 → 第一个替换为示例段 1 第一个 .sent，第二个替换为示例段 1 第二个 .sent，依此类推）
//    简化：模板里有占位 .sent 块 1 个，我们只替换第一个，剩下的保留占位。

// ── Sample 挖空自测数据（v2.28.2）────────────────────────────
// 此前 build-samples 从不填充第 11 节挖空自测，模板占位符 {{答案词，斜杠分隔}}
// 原样入库 → verify:fixture 规则 5 必挂，且重跑会用占位符覆盖手工修复。
const gettyCloze = {
  secLabel: '第 1 段 · 开场与立意',
  text: 'Four score and ______ years ago our fathers brought forth on this continent, a ______ nation, conceived in ______, and dedicated to the proposition that all men are created ______.',
  answers: 'seven / new / liberty / equal',
};
const aiCloze = {
  secLabel: '第 1 段 · 现象引入',
  text: 'Artificial intelligence is rapidly transforming how students ______. From adaptive ______ systems to automated ______, AI offers unprecedented personalization at scale.',
  answers: 'learn / tutoring / grading',
};

// ── Sample 3: 100 句性能边界样本（v2.35.0 · 程序化生成 · 幂等）──────────
// 目的：把模板推到大句数压测渲染与文件体积——100 个 .sent 块 + 挖空节。
// 句子内容为确定性生成（不随机），保证 build-samples 连跑逐字稳定。
const boundarySents = [];
for (let i = 1; i <= 100; i++) {
  const seg = Math.ceil(i / 20);
  const en = 'Boundary sentence ' + i + ' stress-tests the template with a moderately long English clause — item ' + i + ' of segment ' + seg + ' in this synthetic article.';
  const zh = '边界句 ' + i + '：用一条中等长度的英文从句压测模板（第 ' + seg + ' 段第 ' + (((i - 1) % 20) + 1) + ' 句）。';
  const lbl = (i % 2 === 1) ? '连读' : '弱读';
  boundarySents.push('<div class="sent">\n  <div class="sent-en">' + en + '</div>\n  <div class="sent-zh">' + zh + '</div>\n  <div class="pron"><span class="lbl">' + lbl + '</span>sentence ' + i + ' · /ˈsɛntəns ' + i + '/ · 边界样本生成标注</div>\n</div>');
}
// v2.42.2：答案词必须真实出现在 .sent-en 中（verify-plan 规则 5 溯源）。
// 此前这段挖空是自造句，4/5 个答案在原文找不到——因为 perf-boundary 从没对边界样本
// 跑过交付硬门禁，直到本次补上才暴露。现改为直接挖第 1 句的真实词。
const boundaryCloze = {
  secLabel: '第 1 段 · 边界压测（100 句样本）',
  text: 'Boundary sentence 1 ______ the template with a moderately long English ______ — item 1 of ______ 1 in this ______ article.',
  answers: 'stress-tests / clause / segment / synthetic',
};

// ── v2.42.2 边界样本的第 15/17 节真实数据 ─────────────────────────────
// 此前 boundary-100 只有 100 个 .sent，{{HOOK_CHAINS}} / {{PALACE_STOPS}} 仍是占位符：
// perf-boundary 只查句数，测的是骨架而非真实长文方案（SKILL.md 说 §15/§17 全部体裁必备）。
// 现按 SKILL.md「记忆宫殿层 · 句站对齐」的 M/base/rem 公式生成，并让 verify-plan 规则 3/4 可验。
const PALACE_ROUTE = ['起床','卫生间','衣柜','厨房','餐桌','大门','电梯','小区门','公交站',
  '地铁站','闸机','站台','车厢','公司大堂','办公楼电梯','工位','茶水间','会议室','食堂',
  '下楼','超市','公园','回家路','沙发','床'];

// M = min(25,n); base = floor(n/M); rem = n%M; 站 j 承载 base+(j<=rem?1:0) 句
function palaceGroups(n){
  const M = Math.min(25, n);
  const base = Math.floor(n / M), rem = n % M;
  const groups = [];
  let cur = 1;
  for(let j = 1; j <= M; j++){
    const c = base + (j <= rem ? 1 : 0);
    groups.push(Array.from({length: c}, (_, k) => cur + k));
    cur += c;
  }
  return groups;
}

function boundaryHookChains(){
  // 5 段 × 20 句：每条链 20 segs / 19 bridges / 20 anchors + 1 para-hook（满足 verify-plan 规则 4）
  let html = '';
  for(let seg = 1; seg <= 5; seg++){
    const start = (seg - 1) * 20 + 1;
    let line = '', anchors = '';
    for(let i = start; i < start + 20; i++){
      line += '<span class="seg">边界句' + i + '</span>';
      if(i < start + 19) line += '<span class="bridge">→</span>';
      anchors += '<span class="anchor">[Boundary sentence ' + i + ']</span>';
    }
    html += '<div class="hook-chain"><span class="para-hook">段 ' + seg + ' · 边界压测</span>'
      + '<div class="chain-line">' + line + '</div>'
      + '<div class="chain-anchors">' + anchors + '</div></div>\n';
  }
  return html;
}

function boundaryPalaceStops(){
  return palaceGroups(100).map(function(g, j){
    return '<div class="palace-stop" data-sents="' + g.join(',') + '">'
      + '<span class="st-no">站 ' + (j + 1) + '</span>'
      + '<span class="st-name">' + PALACE_ROUTE[j] + '</span>'
      + '<div class="st-hook">' + g.map(i => '边界句' + i).join(' · ') + '</div>'
      + '<span class="st-anchor">[Boundary sentence ' + g[0] + ']</span>'
      + '</div>';
  }).join('\n');
}

// ── 结构图内联 SVG（v2.35.1）────────────────────────────
// 此前样本保留模板的 <img src="assets/{{topic}}-structure.svg"> 脚手架 → 破图 + 404。
// 改为确定性生成的内联链式背诵地图（段盒子 + 箭头），样本自包含、无外部引用。
function chainSvg(labels) {
  const n = labels.length;
  const w = 760, h = 96, bw = 168;
  const gap = (w - n * bw) / (n + 1);
  let s = '<svg role="img" aria-label="背诵地图" viewBox="0 0 ' + w + ' ' + h + '" xmlns="http://www.w3.org/2000/svg" style="max-width:100%;height:auto">';
  for (let i = 0; i < n; i++) {
    const x = gap + i * (bw + gap);
    s += '<rect x="' + x + '" y="24" width="' + bw + '" height="48" rx="10" fill="#eef3ff" stroke="#4a6fa5" stroke-width="1.5"/>';
    s += '<text x="' + (x + bw / 2) + '" y="44" text-anchor="middle" font-size="13" fill="#1f2d3d">' + labels[i] + '</text>';
    s += '<text x="' + (x + bw / 2) + '" y="62" text-anchor="middle" font-size="11" fill="#5a6b7f">段 ' + (i + 1) + '</text>';
    if (i < n - 1) {
      const ax = x + bw + 4, aw = gap - 8;
      s += '<line x1="' + ax + '" y1="48" x2="' + (ax + aw) + '" y2="48" stroke="#4a6fa5" stroke-width="2" marker-end="url(#arr)"/>';
    }
  }
  s += '<defs><marker id="arr" markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0,0 L6,3 L0,6 Z" fill="#4a6fa5"/></marker></defs>';
  return s + '</svg>';
}

function build(title, subtitle, structureHint, sents, fillFirstN, outFile, cloze, structureLabels, opts){
  let html = tpl;
  html = html.replace(/\{\{TITLE\}\}/g, title);
  html = html.replace(/<title>\{\{TITLE\}\}背诵方案<\/title>/, '<title>' + title + '背诵方案</title>');
  html = html.replace(/\{\{SUBTITLE：结构类型 · 句数 · 目标天数\}\}/g, subtitle);
  html = html.replace(/\{\{对结构图的一句话导读\}\}/g, structureHint);

  // v2.35.1：结构图占位 <img src="assets/{{topic}}-structure.svg">（{{TITLE}} 已先被替换）
  // 用内联 SVG 链式背诵地图替换，样本自包含、无破图外链。
  if (structureLabels){
    html = html.replace('<img src="assets/{{topic}}-structure.svg" alt="' + title + '结构图">', chainSvg(structureLabels));
  }

  // 替换第一个 .sent 占位块：模板只有 1 个占位，需要复制 N 份以生成多句方案
  const sentBlockRe = /<div class="sent">[\s\S]*?<\/div>\s*<\/div>/;
  const placeholderMatch = html.match(sentBlockRe);
  if (placeholderMatch){
    const placeholder = placeholderMatch[0];
    const replacement = sents.slice(0, fillFirstN).join('\n');
    // v2.28 修复：模板只含 1 个 .sent 占位，按 fillFirstN 复制替换（join 后直接覆盖占位）
    html = html.replace(sentBlockRe, replacement);
  }

  // v2.28.2：填充第 11 节挖空自测（与样本中手工内容逐字一致，保证重跑幂等）
  if (cloze){
    html = html.replace('<p class="sec-label">第 1 段 · {{逻辑角色}}</p>', '<p class="sec-label">' + cloze.secLabel + '</p>');
    html = html.replace('{{挖空后的段落原文，空用 ______ 表示}}', cloze.text);
    html = html.replace('{{答案词，斜杠分隔}}', cloze.answers);
  }

  // v2.42.2：仅边界样本填 §15/§17 真实数据；其余样本按 v2.28.2 约定保留装饰性占位符
  if (opts && opts.hookChains) html = html.replace('{{HOOK_CHAINS}}', () => opts.hookChains);
  if (opts && opts.palaceStops) html = html.replace('{{PALACE_STOPS}}', () => opts.palaceStops);

  fs.writeFileSync(path.join(OUT_DIR, outFile), html, 'utf8');
  console.log('  ✅ ' + outFile + ' (' + (html.length / 1024).toFixed(1) + ' KB)');
}

build(
  'Gettysburg Address',
  '演讲稿 · 3 段 10 句 · 16 天',
  '三段叙事：起源（国家诞生）→ 命题（当前危机）→ 召唤（战场祭奠）',
  gettySents,
  10,
  'getty-memorialization-plan.html',
  gettyCloze,
  ['起源 · 国家诞生', '命题 · 当前危机', '召唤 · 战场祭奠']
);

build(
  'AI 与教育',
  '议论文 · 5 段 10 句 · 16 天',
  '提出议题（AI 改变学习）→ 列举益处 → 揭示风险 → 辩证分析 → 收束结论',
  aiSents,
  10,
  'ai-education-plan.html',
  aiCloze,
  ['议题 · AI 改变学习', '益处 · 个性化', '风险 · 数据点化', '辩证 · 服务教学法', '结论 · 人师不可替']
);

build(
  '100 句边界压测',
  '边界样本 · 5 段 100 句 · 压测',
  '确定性生成的 100 句合成文章：验证模板在大句数下的渲染与体积上限（性能边界守护样本，tests/perf-boundary.test.mjs 消费）',
  boundarySents,
  100,
  'boundary-100-plan.html',
  boundaryCloze,
  ['句 1–20', '句 21–40', '句 41–60', '句 61–80', '句 81–100'],
  { hookChains: boundaryHookChains(), palaceStops: boundaryPalaceStops() }
);

console.log('\n用法：npm run preview → 浏览器打开 http://localhost:4173/tests/samples/');

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

function build(title, subtitle, structureHint, sents, fillFirstN, outFile){
  let html = tpl;
  html = html.replace(/\{\{TITLE\}\}/g, title);
  html = html.replace(/<title>\{\{TITLE\}\}背诵方案<\/title>/, '<title>' + title + '背诵方案</title>');
  html = html.replace(/\{\{SUBTITLE：结构类型 · 句数 · 目标天数\}\}/g, subtitle);
  html = html.replace(/\{\{对结构图的一句话导读\}\}/g, structureHint);

  // 替换第一个 .sent 占位块：模板只有 1 个占位，需要复制 N 份以生成多句方案
  const sentBlockRe = /<div class="sent">[\s\S]*?<\/div>\s*<\/div>/;
  const placeholderMatch = html.match(sentBlockRe);
  if (placeholderMatch){
    const placeholder = placeholderMatch[0];
    const replacement = sents.slice(0, fillFirstN).join('\n');
    // v2.28 修复：模板只含 1 个 .sent 占位，按 fillFirstN 复制替换（join 后直接覆盖占位）
    html = html.replace(sentBlockRe, replacement);
  }

  fs.writeFileSync(path.join(OUT_DIR, outFile), html, 'utf8');
  console.log('  ✅ ' + outFile + ' (' + (html.length / 1024).toFixed(1) + ' KB)');
}

build(
  'Gettysburg Address',
  '演讲稿 · 3 段 10 句 · 16 天',
  '三段叙事：起源（国家诞生）→ 命题（当前危机）→ 召唤（战场祭奠）',
  gettySents,
  10,
  'getty-memorialization-plan.html'
);

build(
  'AI 与教育',
  '议论文 · 5 段 10 句 · 16 天',
  '提出议题（AI 改变学习）→ 列举益处 → 揭示风险 → 辩证分析 → 收束结论',
  aiSents,
  10,
  'ai-education-plan.html'
);

console.log('\n用法：npm run preview → 浏览器打开 http://localhost:4173/tests/samples/');

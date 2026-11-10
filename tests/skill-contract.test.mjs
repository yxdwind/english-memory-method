/**
 * v2.37.0 SKILL.md 契约 gate
 *
 * 把「从 GitHub 同类 skill 借鉴的优化」固化成机器检查，防止后续编辑把方法论
 * 悄悄改回去（description 重新膨胀成功能清单、陪练协议被删、版本戳再次陈旧）。
 *
 * 检查：
 *   a. description 触发语为轴、≤1024 字符、不含版本戳
 *   b. 四个新章节存在，且各自硬规则齐全
 *   c. 信源表含真实 URL 与可信度评级，二手线索有明确禁用声明
 *   d. 模板今日任务卡含「复习优先」顺序条；页脚版本戳与 package.json 对齐
 *   e. 根 SKILL.md ≡ skills/ 副本（与 version-check 双保险）
 *
 * 断言数：22（v2.38.0 计入总测试数 721）
 * 跑：node tests/skill-contract.test.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = p => fs.readFileSync(path.join(ROOT, p), 'utf8');

let passed = 0, failed = 0;
function ok(cond, label) {
  if (cond) { passed++; console.log('  ✅ ' + label); }
  else      { failed++; console.log('  ❌ ' + label); }
}

const skill = read('SKILL.md');
const copy = read('skills/english-memory-method/SKILL.md');
const planTpl = read('assets/plan-template.html');
const pkg = JSON.parse(read('package.json'));

console.log('\n== v2.38.0 SKILL.md 契约 gate ==');

// A. description：Agent 每轮都要读的元数据，只写「何时用」不堆功能清单
const desc = (/^description: (.+)$/m.exec(skill) || [])[1] || '';
ok(desc.length > 0 && desc.length <= 1024, `description 精简（${desc.length} 字符 ≤ 1024）`);
ok(!/\d+\.\d+\.\d+/.test(desc), 'description 不含时间敏感的版本戳');
const triggers = ['背诵方法', '记忆技巧', '帮我背', '出背诵方案', '和上面一样的记忆技巧',
  '生成记忆库', '更新记忆库', '汇总我的方案', '考我', '陪我练'];
ok(triggers.every(t => desc.includes(t)), `description 触发语齐全（${triggers.length} 个）`);

// B. 四个新章节
const sections = ['## 对话陪练协议', '## 复习调度硬规则', '## 倦怠检测与换法阈值', '## 同类 skill 借鉴与信源'];
ok(sections.every(s => skill.includes(s)), '四个新增章节齐全（陪练 / 调度 / 倦怠 / 信源）');
const drill = ['一次一问', '等答再揭', '三档诚实评分', '原文唯一真相源', '结算三要素', 'due-first'];
ok(drill.every(s => skill.includes(s)), '对话陪练硬规则 + due-first 齐全');
ok(skill.includes('不写也读不到 localStorage') && skill.includes('回原方案补打卡'), '陪练不落盘、与 HTML 方案分工明确');
// v2.37.1：修掉「文档要求读浏览器 localStorage」这条不可执行链路
ok(skill.includes('七条硬规则') && skill.includes('能力诚实'), '新增第 7 条「能力诚实」硬规则');
ok(skill.includes('出题池 · 静态档') && skill.includes('出题池 · 动态档'), 'due-first 改为静态档（默认）+ 动态档（用户贴进度）双档');
ok(skill.includes('读不到浏览器 `localStorage`') && skill.includes('禁止虚构句号/到期日'), '显式声明读不到浏览器存储、禁止假称能读进度');
const discipline = ['复习优先于新学', '新学量上限', '交错复习', '复习会话短于初学会话',
  '遗忘甜区', '诚实评卡', '评分纪律'];
ok(discipline.every(s => skill.includes(s)), '复习调度 7 条规则齐全');
ok(skill.includes('连续 3 句') && skill.includes('连续 2 轮') && skill.includes('<60%'), '倦怠触发 + 换法阈值齐全');
ok(skill.includes('L5 费曼检验') && skill.includes('费曼三问'), 'L5 费曼检验替代「说够 90 秒」');

// C. 信源与学术严谨性
const urls = (skill.match(/https:\/\/github\.com\/[^\s)]+/g) || []);
ok(urls.length >= 5, `信源表列出可核对的 GitHub URL（${urls.length} 个）`);
ok(skill.includes('**A** =') && skill.includes('**B** =') && skill.includes('**C** ='), '信源含 A/B/C 可信度评级定义');
ok(skill.includes('未核一手,不得写进交付给用户的学术依据表'), '二手学术线索明确标注禁用范围');

// C2. SM-2 标准模式语义（v2.38.0 起真正驱动调度，取代 v2.37.1 的「仅可视化」）
ok(skill.includes('句级调度器') && skill.includes('由 SM-2 `due` 驱动'),
  'SKILL.md 明确「标准」已升级为句级调度器');
ok(skill.includes('轻量模式行为逐字不变') && skill.includes('回归护栏'),
  'SKILL.md 声明轻量模式零回归 + 回归护栏');
const zhReadme = read('readme.md'), enReadme = read('readme.en.md');
ok(zhReadme.includes('自动回炉') && enReadme.includes('auto-schedule'),
  '双语 readme 同步声明标准档自动调度到期句');

// D. 代码层：复习优先提示 + 版本戳同步
ok(planTpl.includes('emm-order') && planTpl.includes('今日顺序') && planTpl.includes('先复习到期段'),
  '模板今日任务卡含「⏱ 今日顺序」复习优先条');
ok(planTpl.includes("var EMM_VERSION = 'v" + pkg.version + "'"),
  `页脚版本戳与 package.json 对齐（v${pkg.version}，消除 v2.30.0 陈旧漂移）`);

// E. 版本与双副本
ok(skill.includes('v' + pkg.version), `SKILL.md 标题声明 v${pkg.version}`);
ok(skill.replace(/\r\n/g, '\n') === copy.replace(/\r\n/g, '\n'), '根 SKILL.md ≡ skills/ 副本');

console.log('\n结果: ' + passed + ' 通过, ' + failed + ' 失败');
process.exit(failed > 0 ? 1 : 0);

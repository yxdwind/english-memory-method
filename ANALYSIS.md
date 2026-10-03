# English Memory Method · 优缺点分析（v2.17.0）

> **写作目的**：作者自评改进 · 三合一视角（方法论 / 工程 / UX） · 对手画像 + 维度交叉
> **信源原则**：每个外部论断尽量给一手出处；找不到一手来源时明确标注。
> **审阅日期**：2026-10-01 · **审阅对象**：`skills/english-memory-method/` v2.17.0
> **审阅范围**：`SKILL.md` (260 行)、`assets/plan-template.html` (1180 行)、
`assets/library-template.html` (470 行)、`tests/smoke.test.js` (490 行)、`platforms/` 7 个适配配置、`package.json`

---

## 0 · TL;DR

**总体评分（满分 1.0，权重：方法论 0.4 / 工程 0.3 / UX 0.3）**

| 维度 | 评分 | 一句话 |
|---|---|---|
| 方法论 | **0.78** | 16 个版本叠出来的"链式生成+穴位兜底"组合很独特；间隔算法停留在艾宾浩斯固定点，未走到 SM-2/FSRS |
| 工程 | **0.82** | 自包含 HTML + jsdom 冒烟测试 + 7 平台适配，发布面干净；模板膨胀到 1180 行，存在维护拐点 |
| UX | **0.75** | ?check=1 自检 / 指纹重置 / 自测模式三档循环都是亮点；信息密度过高，新手会迷路 |
| **综合** | **0.79** | 罕见地把"段落级背诵"做成了一个端到端可用的 AI skill；最大短板是缺乏实证、没有调度算法 |

**一句话定位**："AI 时代的艾宾浩斯执行器"——把一条 1885 年的曲线与 1978 年的生成效应整合进 2026 年的 AI skill 工作流；执行面（链式复述、自测、记忆宫殿、留白、指纹校验）做到了接近"填空"的成熟度，**评估/反馈**位置还没填。

---

## 1 · 对手画像（先建立对照系）

每个对手给一段"它做对了什么 / 它没做什么"，作为后续维度交叉的参照点。

### 1.1 传统理论系（学术界 · 算法界）

| 对手 | 一句话 | 一手出处 |
|---|---|---|
| **艾宾浩斯 H. Ebbinghaus** | 1885 年用无意义音节自测，描绘"20 分钟转 58.2% / 1 天后 33.7% / 6 天后 25.4%"的遗忘曲线，确立"先快后慢"原则 | *Über das Gedächtnis* (1885)；维基/MBA 智库整理数据 |
| **Cepeda 等（2006/2008）** | 317 实验 839 次比较的 meta 分析：96% 比较里间隔练习胜出集中练习；最优间隔 = 期望保留时间的 **10–20%** | Cepeda et al., *Psychological Bulletin* 132(3), 2006; Cepeda et al., *Psychological Science* 19(11), 2008 |
| **SuperMemo SM-2** | Woźniak 1987 年写的第一个实用间隔算法：每张卡一个 Ease Factor，按回忆质量 0–5 评分动态调整下一次间隔 | Woźniak, *Optimization of learning*, Master's Thesis, 1990（网页重发于 supermemo.com/archives1990-2015/.../sm2） |
| **FSRS（Free Spaced Repetition Scheduler）** | 2022 年起的现代开源调度器，用 DSR 三参（Difficulty/Stability/Retrievability）模型 + ML 拟合 19 个权重，预测误差 ~4% vs SM-2 ~14% | Jarrett Ye et al., github.com/open-spaced-repetition；fsrs 安卓 sdk |
| **Slamecka & Graf（1978）** | 生成效应：自生成的信息比被动阅读的同信息回忆率高得多 | *Journal of Experimental Psychology: Human Learning and Memory* 4(6):592–604 |
| **Method of Loci / 记忆宫殿** | 古罗马传承的空间记忆术；2021 meta 分析（13 RCT）效应中等，但"高风险偏倚"，对语音库为次优手段 | McCabe (2015), *Teaching of Psychology* 42(2)；Legge et al. (2012), *Consciousness and Cognition* |

### 1.2 工具系（产品层）

| 对手 | 一句话 | 一手出处 |
|---|---|---|
| **Anki** | 卡片 SRS 的事实标准；23.10+ 默认 FSRS，可选旧 SM-2；社区卡包 5 万+ | apps.ankiweb.net、docs.ankiweb.net |
| **SuperMemo（产品）** | 商业/学术混血；Windows 端独占；Algorithm Arena 跑 SM-2~SM-20 + FSRS；学习曲线陡 | supermemo.com |
| **Quizlet / RemembraDeck / 大众闪卡 app** | 入门门槛低，但调度算法通常 SM-2 clone；不优化洞见（easiness hell） | 业界综述 imprimo.app, fluentcards.org |

### 1.3 同类 AI skill 系（最直接的对手）

| 对手 | 一句话 | 一手出处 |
|---|---|---|
| **mastery-loop**（all666666all） | 与本 skill 同源思路：**AI 生成 + 真实调度器（FSRS 默认）**，每日短循环主动回忆；pyPL 默认 | github.com/all666666all/mastery-loop |
| **agent-memory-method**（LobeHub, zhongweiv） | 中文 LobeHub 生态的"记忆方法" skill；面向古诗/公式/历史地理等，passage + 概念都覆盖 | lobehub.com/skills/zhongweiv-hermes-edu-skills-agent-memory-method |
| **vocab-trainer / English_srs / ReMindful**（GitHub 中文圈） | 单词级 SRS 工具；普遍 SM-2；UI 完整但只服务词汇 | github.com/mylinwu/vocab-trainer 等 |
| **Anki + AI 插件族**（GPT-4 Deck Generator、Anki AI） | 已有工具挂 AI；调度仍走 Anki，AI 只做卡生成 | zekaiwork.com 综述 |

### 1.4 中文教育传统（隐性对手）

| 对手 | 一句话 | 一手出处 |
|---|---|---|
| **影子跟读法（Shadowing）** | 滞后 2–3 词跟读源语；50 遍以上才见效；同传专业入门功 | 光明日报 2015-05-05；多位口译训练文献 |
| **听写法（Dictation）** | 听到哪写到哪；最大代价 → 最深记忆；与本 skill 的"听写模式"几乎同构 | 光明日报 2025-10-25 |
| **同声传译训练法** | "中文 → 立刻英文"双向转换，强行制造主动回忆 | 光明日报 2025-10-25 |
| **复述六法（艾宾浩斯中文变体）** | 1/3/7/15 天复习点；中文圈执行最广的版本 | 多家教辅资料（如新东方在线） |

### 1.5 关键洞察：从对手画像看出本 skill 的位置

- **空白带在领域**：以"段落级背诵"为目标的 AI skill 极少。mastery-loop 是单词/概念级；vocab-trainer 类只服务词汇；中文圈缺一个原生段落背诵的。
- **你的真正对手是 Anki + AI 插件族**：他们调度比你强（FSRS），但调度错位——他们是卡片式的，不是段落式的。**段落式的最大痛点不是"什么时候复习"，而是"怎么记住才能保持顺序"。你的链式钩子/记忆宫殿是在解这个问题。**
- **传统方法论都没处理的事**：文本多样性（议论文/说明文/演讲稿/叙事文各需要不同拆法）、**评估**（你怎么知道背熟了？）、**留白促进生成效应**（这个你是做了的！）。

---

## 2 · 维度交叉（按方法论 / 工程 / UX 三大块）

### 2.1 方法论维度

#### 2.1.1 间隔重复算法 · 评分：6/10

| 你做了什么 | 业内做法 | 缺点 | 一手对比 |
|---|---|---|---|
| 固定点：5min / 当晚 / D1 / D3 / D7 / D15 | SM-2 (1987) 动态 Ease × Interval；FSRS (2022+) 三参 + ML | 你没用调度算法；薄弱句 = 同一篇内"再出现"，跨篇不调度；不按卡 | [super-memory sm2](https://super-memory.com/english/ol/sm2.htm)、[FSRS](https://github.com/open-spaced-repetition/fsrs4anki） |

**为什么你能这样做**：分词（SRS）的逻辑前提是"卡片相互独立"。**段落背诵不是**——你不能"记住第 3 句但不记住第 7 句"，必须记住一段顺序。所以 SM-2 的"调高/调低 EF"在段落级毫无意义。**你做对了**：把调度简化成"全段重背"+"薄弱句加重"两件。

**但是**：
1. **整段固定 D1/D3/D7/D15 与 Cepeda 2008 时间脊线有偏**。按"10–20% 期望保留时间"算的话，D1 是合理的起点，但 D3、D15 对于周期段落（如演讲稿/小说片段）的"长期复用"目标太短。**可选**：让"长期保留目标"成为传参（1 周 / 1 月 / 1 学期）。
2. **薄弱句"再出现"没有和原句级别调度挂钩**。一个 D1 评卡的薄弱句在 D3 出现时是 D2 + D3 两个 D2？这块没有描述。可以补一句"薄弱句按原复习点提前一天"作为软调度。
3. **缺调速机制**。一个已经连顺 5 轮的句子应该"毕业"——你做的是"连顺 2 轮毕业"（`applyJudgeState`→`streak` >=2），这其实比 Anki 默认的"4 轮"更激进。激进好不好要看用户。

#### 2.1.2 学习内容分层 · 评分：9/10

你把段落级拆成 6 层：

```
骨架（逻辑角色）
  ↓
关键词（每句 1-2 个钩子）
  ↓
问题链 / 电影法 / 轨道法（链式化）
  ↓
五级阶梯 L1-L5
  ↓
三层钩子链（段钩/句钩/锚点）
  ↓
记忆宫殿（站点化）
```

**对手没这么做的**。Anki 是单层卡片；mastery-loop 是"概念 + 例子"；vocab-trainer 是单词 + 例句。
**学术对应**：原型拆词（Levels of Processing, Craik & Lockhart 1972）的扩展版。

**风险**：
1. **信息密度高**，对新手不友好。15 节、22 节、17 节三套并列方案，新手不知道从哪入手。可考虑"先 L1 走通 → 再开 L2"的渐进引导。
2. ✅ **"留白"设计是亮点（v2.21.0 已闭环）**——SKILL.md「亲手改造留白」段已加 **Slamecka & Graf (1978)** 引用：「受试者自己生成的词比阅读的词回忆率高 25-35%,即使生成的内容更困难」；新增「主要参考出处」节列出 5 篇一手论文（生成效应 / 间隔重复 / SM-2 / 测试效应 / 记忆宫殿）。便于未来被 review 时说"我不是凭空说留白好"。

#### 2.1.3 主动回忆与生成效应 · 评分：8/10

| 你做了什么 | 学术对应 | 缺失 |
|---|---|---|
| 自测模式三档（关/遮译文/全遮） | Roediger & Karpicke 2006 testing effect | 三档没量化，"全遮"用什么难度评？ |
| 挖空自测（`______` 自动转输入框 + LCS 比对） | 完形填空效应（与 cloze deletion 同源） | 答案必须按空的出现顺序写，错位会失配（v2.14.0 已留 guard） |
| 亲手改造留白（`✍️ 一句话主线`、`🎨 我的画面`） | **生成效应 Slamecka & Graf 1978** | 用户不改怎么办？没强提醒 |
| 复述技巧包（10 条通用技巧） | Paraphrase 合法化对应深度加工 | 没什么大事 |

**关键改进点**：
- **"用户不改留白怎么办"是个真问题**。Solution：在阶梯升级时检测留白是否填写，未填写则阻断升级（"请先填一句话主线，再点 L2"）。
- **测试支撑（testing effect）不只是评分对错**——还要支持"先答后看"。你目前是 LCS 比对，OK；但可以加个"先听写再对比"的纯输入流，避开视觉抄答案的捷径。
- **错误反馈**部分可以做更细：LCS 比对告诉你哪个词错，但没说"为什么这样接"。比如 "did you mean past tense? this sentence uses past progressive"。

#### 2.1.4 多模态 · 评分：7/10

| 模态 | 你支持 | 缺失 |
|---|---|---|
| 视觉（结构图 SVG） | ✅ 完整规范 | SVG 不在 ?check=1 自检里，没有自动校验画布合不合规 |
| 听觉（TTS） | ✅ 浏览器 speechSynthesis 美音 + MediaRecorder 录音对比（v2.19.0） | 强制对齐（forced alignment）未做，依赖用户词级自评 |
| 动觉（拼写 / 听写） | ✅ 输入框批改 | 不评发音 |
| 视觉（图片桩记忆宫殿） | ❌ | 没有图片桩上传 |

**最大缺口是"用户录音"。** 听写模式只放不放录。**加一个录音对比功能**（用 MediaRecorder API）能把"影子跟读"和"段落背诵"结合起来——这正好对应光明日报那个影子跟读法 50 遍传统。

> **v2.19.0 已闭环**：✅ 见 §3.2 item 1 实现细节。手动标注 + 可选录音的最小形态已上线；强制对齐留作未来可选迭代。

#### 2.1.5 间隔可视化 · 评分：9/10

**今日排期卡（v2.13）** 是你最有产品感的功能之一：
- 开始日期 + 每天新学段数 → 自动算出今天学什么
- 一键导出 .ics 日历
- 阶梯追踪 L1-L5 留档

**业内无对标**。Anki 是"今天到期哪些卡"，FSRS Helper 是"今天复习什么"，但都是"卡片堆"维度。你是"段落进度"维度。
**学术对应**：Cepeda 2008 时间脊线的**具体实现**——你把抽象的"10-20%"做成了用户看得见的时间表。

**改进点**：
1. **.ics 用 DATE 而不是 DATETIME，时区处理可能踩 DST 坑**。比如用户跨时区或 DST 切换那天，可能出现 "事件提前/延后 1 小时" 的诡异。换成 `DTSTART;TZID=...:...` 更稳。
2. ✅ **"今天新学"链接到 `?#emm-seg0` 但只对第一段（v2.21.0 已闭环）**——长文模式今日任务卡每段行追加「📌 设为今天」按钮，点击后倒推 `state.start` 让该段 `learnDayOf(si)` 等于当天 `dayNumberOf()`，其他段跟着顺延；当前段显示「✓ 当前」绿色标记，单段文章不显示该按钮（无意义操作）。`tests/today-segment.test.mjs` 10/10。
3. **缺"按段的统计"**：每段总耗时、每段薄弱率。这些对你做方法论迭代价值大。

#### 2.1.6 跨文章聚合（记忆库）· 评分：8/10

**v2.17 记忆库**是你超出同行的功能。**标准 SRS 文献都让用户"自己管理多卡片堆"**——你直接做出一个统一的书架。
**学术对应**：跨领域学习的迁移效应（transfer-appropriate processing）。同一种钩子方法反复做，本身就是迁移训练。

**改进点**：
1. **"轻刷不落盘"是好设计**——避免用户产生"我点卡了就要写进度"的预期负担。但是"回原方案补打卡"这一步有摩擦（用户要从记忆库点开原方案 → 翻到打卡区）。**优化**：在轻刷结果页直接给"一键打卡该缺的句子"按钮，跳到方案页时自动展开对应句子。
2. **缺搜索维度**：只能按 title/topic/type/file/chain 文本搜，不能按"我哪篇薄弱最多"、"我超过 14 天没复习的"这种状态搜。这条很产品化，可以做"按状态筛选"。
3. ✅ **缺"导出进度"（v2.21.0 已闭环）**——复习打卡条新增「💾 导出」+「📥 导入」按钮：导出当前 localStorage 完整 state（含 `sr` / `shadow` / `weak` / `fingerprint` 等）序列化为 `<h1>-emm-progress-YYYY-MM-DD.json` 下载；导入读取 JSON 后做 fingerprint 失配检测，弹 confirm 让用户选择是否覆盖。零依赖（`Blob` + `URL.createObjectURL` + `FileReader`）。`tests/export-import.test.mjs` 20/20。

### 2.2 工程维度

#### 2.2.1 模板可维护性 · 评分：7/10

**plan-template.html = 1180 行**（HTML 200 + CSS 200 + JS 800）。这个体积有信号：
- <500 行：单文件很清爽
- 500-1000：还能管
- 1000+：单一文件开始拖累维护；多人协作难；找代码靠 Ctrl-F

**专业做法**：
1. 把 JS 拆成 `assets/emm-components.js`（init 装载），CSS 拆成 `assets/emm.css`，plan-template.html 变成"只装内容 + 引用"。
2. 但你**故意**做成自包含单文件（"自包含 HTML"是产品亮点，不是缺陷）。两者取舍是产品决策，不是技术债——如果保留单文件，要在 README / SKILL.md 里明说"为了开箱即用故意单文件"。

**模板 + JS 之间的耦合**已经接近临界。例如 `keyOf()` 必须与 `<h1>` 文本前 40 字严格对齐——这是文档化的契约，但靠运行时错误兜底。这种"以 schema 隐式定义接口"的做法在团队协作下会爆。

**改进点**：
1. 在模板的注释里**显式列出所有契约"SKILL.md 第 X 节"**，便于追溯。
2. 把契约集中到一个 `CONTRACT.md`（或者 SKILL.md 的"接口契约"章节）。比如：
   ```
   keyOf() = localStorage 'emm-progress:<h1 前 40 字>'
   state.fingerprint = sent.text.length + ':' + sent.text.slice(0,32)
   ...
   ```

#### 2.2.2 单元测试 · 评分：8/10

**`tests/smoke.test.js` = 490 行**，覆盖 v2.13/v2.14/v2.15/v2.17 全链路。**测试是认真的**：
- 段识别、阶梯升级、留白存档、指纹确认/取消/重置、快刷开启/退出、挖空错配保护、记忆库书店/bookshelf/renderShelf/light-drill/empty、?check=1 自检

**但是**：
1. **没有跨平台/跨浏览器测试**——只跑 Node.js + jsdom。真实用户在 Chrome/Firefox/Safari/Edge 上行为可能不同（`speechSynthesis` 在不同浏览器的 voices 表现不同，`localStorage` 在 file:// 协议下的容量不同）。
2. **没有 e2e 测试**——比如"用户输入文章 → 验证生成的 HTML 通过校验"。这个最值钱但最难写。
4. **测试 fixture 是手写 string，不是从真实生成结果反推**——意味着如果 SKILL.md 改了，fixture 不一定真实。

**改进点**：
1. 真实浏览器跑一遍——`npm test:browser`（playwright），至少覆盖 dictation / speechSynthesis / localStorage 三大浏览器差异点。
2. 加 fixture 的 version-check：CI 上跑一次生成 → 跑一次校验 → 跑 fixture。

#### 2.2.3 跨平台适配 · 评分：9/10

**7 个平台**（Cursor/cline/Copilot/Gemini/Qoder/Roo/Aider）的适配配置都打齐了。这是一个**真功夫活**——市面 80% 的 AI skill 只有 Claude Code 一份。

**但是有 drift 风险**：
- 7 份配置，1 份 SKILL.md 改了，所有 7 份都要同步——靠人工
- 各大平台的 `frontmatter` 格式不一样（Claude 用 `description`/`alwaysApply`，Cursor 用 `globs` 等）

**改进点**：
1. 写一个 `bin/sync-platforms.mjs`（用你的 `npm test` 体系已经现成）从 SKILL.md 自动生成 7 份 platform-specific 摘要。
2. 加 `tests/platforms-drift.test.js`：检测 SKILL.md 修改后 platforms 配置是否同步。

#### 2.2.4 内容校验 · 评分：6/10

**SKILL.md 第 206-221 行的"内容校验（生成后强制执行）"**列出 6 条硬校验：
1. 逐句完整性（最关键，禁止意译）
2. 标注精度（音标抽查 ≥3 处）
3. 宫殿对齐
4. 钩子链对齐
5. 挖空可核对
6. 词汇/金句溯源

**问题**：
1. **全是人工**——没有自动校验工具。SKILL.md 列的是"AI 生成时要自查"，但没代码。
2. **SKILL.md 给了一段** `node -e` 抽句对照示例**——好！但只覆盖第 1 条。**
3. **?check=1 是运行时 DOM 自检**，但它只能校验结构（段数、钩子数、挖空数），不能校验内容（翻译是否对、连读是否标对、挖空答案是否真的在原句中）。

**改进点**：
1. **写 `bin/verify-plan.mjs`**：抽句对照 + 词典校验（答案词真的在 .sent-en 中出现）+ 翻译长度合理性（不应 < N 字也不应 > 2N 字）+ 连读类型覆盖率（标注不能少于句数的 X%）。
2. **?check=1 的输出里加"待人工复核"标记**——比如标红的项同时给出"原文片段" + "建议核对方向"。
3. **音标/IPA 校验**：用正则检查是否出现非 IPA 字符，给出可疑项。

#### 2.2.5 版本管理 · 评分：5/10

**16 次小升级都在 SKILL.md 里用注释行 `[v2.X.0]` 标号**——这是好实践。
**但"没有真正的 CHANGELOG.md"**。

**问题**：
1. SKILL.md 一长就难找到"什么时候加了 X 功能"
2. 模板/components 里的 version marker（如 `EMM_LIBRARY_V217`、`EMM_TODAY_V213`、`EMM_DRILL_CLOZE_V214`）是**自检锚点**——好处是可在生成端 grep；坏处是 version 不一致时会失败。
3. package.json 版本没跟着改（看代码注释是 v2.17.0 但 package.json 也是 2.17.0 —— 这次对得上。但前 16 次很可能有 drift。）

**改进点**：
1. **加 CHANGELOG.md**：每次升级写一段"v2.X.0：新增 X；改进 X；不推荐 Z"。
2. **加 npm script `npm version-check`**：扫所有 version marker，断言一致。
3. **git tag 跟着版本号走**——已经是 GitHub repo，做 `git tag v2.17.0` 就能保留历史。

---

### 2.3 UX 维度

#### 2.3.1 信息密度 · 评分：5/10

**单篇方案 15 节 / 演讲稿 16 节 / 长文 17 节**——信息过载。

**问题**：
1. 用户打开方案第一眼看到 17 节 → **认知超载**
2. 三套章节顺序（普通/演讲/长文）让用户不能形成稳定预期
3. 移动端在 ≤720px 下做了堆叠（v2.16.0），但**章节顺**的折叠拖动眼睛没加

**改进点**：
1. **首屏只显 3 节**："今日任务 / 原文逐句 / 钩子链"，其余折叠为"进阶"section。这条**对 UX 是最重要的一条改进**。
2. **章节命名精简**：把"15. 记忆钩子（跨段总链）（把句子"粘"起来）"这种带括号的、嵌套括号的、emoji 全部去掉。
3. **首屏加一个"今天先做这个"按钮**：根据今日任务卡的状态，自动决定是"开始听写" / "开始打卡" / "开始复述 L1"，跳到对应章节。

#### 2.3.2 评估与反馈 · 评分：7/10

**?check=1 自检** 是你这版最有 UX 感的设计——结构化问题暴露给用户，不藏匿。

**问题**：
1. **自检只检结构，不检内容**——你不知道翻译是否准确、连读是否正确、挖空是否真在原文里
2. **没有"我这章真的学会了吗"的客观指标**——目前只有"连顺 2 轮毕业"这个机制
3. **没有进度条可视化**——只有复习仪表盘，但那是按句子看的，不是按章节看的

**改进点**：
1. **?check=1 加上"内容可疑项"**——比如"本句翻译比原文长 1.8 倍，建议核对"
2. **加"段落测试"按钮**：每段学完后给一个 60 秒综合测试（听写 + 钩子复述 + 关键句翻译），给一个 0-100 评分。
3. **毕业条件改细**：现在是"连顺 2 轮毕业"，可以改成"3 轮 + 听写通过 + 在长文中不出错"。

#### 2.3.3 新手引导 · 评分：5/10

**没有"第一次用"的引导**——直接上来是 17 节方案。新手会懵。

**问题**：
1. **没有 on-boarding**——第一次生成的方案里就一个"先看 1. 整体策略 / 4. 原文逐句精读 / 13. 记忆钩子"的最短路径？
2. ✅ **没有"试背一下"小例子（v2.21.0 已闭环）**——`tests/samples/` 放 2 个完整示例方案：`getty-memorialization-plan.html`（林肯葛底斯堡演说 · 3 段 10 句）+ `ai-education-plan.html`（议论文 · 5 段 10 句）。`bin/build-samples.mjs` 零依赖生成（85 KB / 个），`bin/preview.mjs` 启动 node http server（端口 4173），`npm run preview` 浏览器打开。
4. **缺"模式选择"**——一上来就问"哪种文体"，然后才进入？或者自动判断？

**改进点**：
1. **加 on-boarding 节**：方案第一屏放一个 "🎓 第一次用？先看这里 5 分钟"，给一个最小流程示例
2. **把样例方案作为 fixture**：在 `tests/samples/` 里放 2 个真实生成的方案，`npm run preview` 启动一个本地预览
3. **加"模式向导"**：在对话里先让用户选"短文 / 长文 / 演讲稿"再进入

#### 2.3.4 失败恢复 · 评分：9/10

**v2.15.0 内容指纹** 是你这版的亮点之一：
- 方案内容改了 → 自动检测 → 弹"重置进度（保留留白与开始日期）"
- 错位（进度误读到新方案）的可能降到 0

**对比**：Anki 改了卡片模板/内容时，进度怎么算是个老大难——Anki 是靠 card id 而你靠内容指纹，更主动。
**改进点**：
1. 弹框现在只有"确定/取消"两档——可以加一档"仅看 diff"，告诉用户具体哪里变了
2. 进度可以加 export/import 按钮（v2.18 顺手）

#### 2.3.5 可访问性 · 评分：4/10

**当前现状**：
- SVG 结构图有 `alt="..."` ✅
- 但章节内联 SVG 没有 `<title>`/`<desc>` 元素 → 屏幕阅读器读不到
- 颜色对比度部分用了 #6d28d9 / #92400e 等低对比色
- 键盘导航：`button` 是 `<button>` ✅，但大量 `div` 被赋予 click 行为
- 听写模式有 `<input>` + `aria-label ✅`，但 `.emm-clz` 输入框没关联 label

**改进点**：
1. SVG 加 `<title>` 和 `<desc>`
2. 关键色换 AA 级对比
3. 关键 click handler 的 div 改为 `<button role="button">` + keyboard handler
4. 加 `prefers-reduced-motion` 媒体查询（"挖空输入成功"那种绿光闪烁对前庭疾病用户不友好）

#### 2.3.6 进度持久化 · 评分：7/10

**localStorage 方案**有局限：
- 容量 5-10MB（够）
- **跨设备 = 0**（没云端）
- **同一浏览器同源** = 强（你的进度键就靠这个）

**问题**：
1. 用户换电脑 = 丢进度
2. localStorage 在 file:// 协议下，Chrome 默认是按 origin 隔离——你的 README 提示了 Chrome/Edge 桌面能工作，但 Safari 可能不行
4. 进度键依赖 `<h1>` 文本前 40 字——改一个字就丢所有进度（虽然指纹保护了内容变更，但纯改名是覆盖的）

**改进点**：
1. **加 export/import 进度为 JSON**——10 行代码解决
2. **加 backup prompt**：检测超过 30 天未打开 → 提示导出
3. **可选云端**：如果未来想做"工具集成"层，加一个 `.mavis/skills/english-memory-method` 选项让它读 Mavis memory —— 但这偏离 skill 自包含原则，可选。

---

## 3 · 结论与下一步

### 3.1 三件必做（如果你只有一个下午）

1. ~~**加内容自动校验 `bin/verify-plan.mjs`**~~ —— ✅ **已实现（v2.17.1）**：`bin/verify-plan.mjs` 把 SKILL.md 第 206-221 行的 6 条做成可执行命令。`npm run verify <file>` 跑单文件，`npm run verify:fixture` 跑测试夹具；支持 `--source <原文>` 触发规则 1 逐字符对比。退出码 0=通过、1=有 error、2=参数错误。零外部依赖（只依赖 node:fs/path/url），单文件约 600 行。
2. ~~**首屏只显 3 节 + on-boarding 入口**~~ —— ✅ **已实现（v2.18.0）**：默认隐藏 h2 编号 ≥ 9 的所有进阶章节（首屏只剩 §1/2/3/4 核心），右上角固定浮动按钮「≡ 进阶内容」一键切换；首次访问者顶部出现 60 秒 5 步引导卡片，"我知道了"后可永久关闭。两个 localStorage 键：`emm-fold-state`（折叠态）、`emm-onboarding-shown`（引导关闭态）。同时 bump 到 v2.18，版本链路全部联动（package.json / CHANGELOG / SKILL.md / plan-template.html 头部 / `EMM_FOLD_V218` 锚点 / `bin/version-check.mjs`）。
3. ~~**CHANGELOG.md + npm version-check script**~~ —— ✅ **已实现（v2.18.0）**：`CHANGELOG.md` 按 Keep a Changelog 1.1 风格整理了 v2.0 → v2.18 全量升级历史；`bin/version-check.mjs` 7 组检查（package.json semver 格式 / 6 个 `EMM_xxx_Vxxx` 锚点各恰好 1 次 / 锚点版本 ≤ package.json / SKILL.md 与两个模板的头部版本声明 / CHANGELOG.md 最新条目版本号）。`npm run version-check` 直接跑。

**三件已闭环**——下面进入"三件值得做"（参见 §3.2）。

### 3.2 三件值得做（如果有一个月）

1. ✅ **用户录音对比（v2.19.0 已闭环）**——首次落地的不是全链路强制对齐，而是**手动词级标注 + MediaRecorder 可选录音**的最小可用形态：
   - **必备**：每句拆为词按钮，三态循环 ✓/✗/pending（点击次数 `0/1/2/3` 对应 `null/✗/✓/null`）。用户听 TTS 后逐词自评，比对清晰度。
   - **可选**：🎙️ 按钮调用 `navigator.mediaDevices.getUserMedia + MediaRecorder` 录制整段影子跟读音频；浏览器不支持（Firefox/iOS Safari < 14.1）则弹 alert 降级，不抛错。
   - **毕业钩子**：单句错词 ≥ 25%（6 词里错 5 词 = 83% 即自动入 `state.weak`），复用 §2.1.4 既有的薄弱句调度——`state.shadow[si] = {ok, bad}` 与 `state.weak` 同源。
   - **持久化**：`localStorage[ keyOf() ]` 内嵌 `shadow` 字段，下次访问恢复到原 ✓/✗ 标记。
   - **24/24 运行时测试**：覆盖词按钮三态、错词阈值自动入薄弱、跨 session 持久化、MediaRecorder 降级、TTS 循环朗读完整路径。完整测试 144 + 12 + 24 = 180/180 全绿，零回归。
   - **未做**：forced alignment（WebRTC VAD + 编辑距离对齐）——目前依赖用户自评。原因：Web Speech API 跨浏览器支持残缺（Chrome 限定 + 续发策略不一致），不如人工标注稳定；后续若用户呼声强烈，可再迭代。
2. ✅ **毕业生升级为 SM-2 算法（v2.20.0 已闭环）**——在保留旧「连顺 2 轮毕业」作为可选项的同时，新增 Wozniak 1990 SM-2 算法：
   - **算法**：`srNext(q, prev)` 纯函数，输出 `{ef, interval, reps, due, lastQ}`。公式遵循 Anki Manual §3.3（https://docs.ankiweb.net/deck-options.html#sm-2-then-scheduling）：q<3 重置 reps=0 + interval=1；reps=0/1 → 1/6 天；reps=n>1 → `round(prev.interval × ef)`；EF 更新 `EF' = EF + (0.1 - (5-q) × (0.08 + (5-q) × 0.02))`，钳制到 ≥ 1.3。
   - **评分粒度**：二档（向后兼容）——✓ → q=4、✗ → q=2，**不动 UI**，用户无感升级。
   - **Ebbinghaus 对齐**：`max(SM2.interval, ebbinghaus[reps])`，标准模式下生效，防止 SR 给出比经典间隔表（1/2/4/7/15）更激进的节奏。`sr.aligned` 标记来源（`sm2` 或 `ebbinghaus`）。
   - **轻量 / 标准模式**：复习打卡条新增 `📚 轻量 / 🧠 标准` 切换按钮。默认轻量（保留旧 streak 行为）；标准模式下仪表盘显示 SM-2 间隔详情（ef / 间 / due / 已逾期高亮）。
   - **数据 schema**：每句 `state.sr[si] = {ef, interval, reps, due, lastQ, aligned}`，`state.srMode ∈ 'light' | 'standard'`。跨 session 持久化到 localStorage。
   - **钩子设计**：self-contained SR IIFE，通过 `window.__emmDispatch('judge' | 'endRound' | 'modeChange', ...)` 接收事件；不侵入 main IIFE 的判卡与 streak 逻辑。`patchSr()` 只写 `sr` 字段（避免与 main 的 `save(state)` 写竞态）。
   - **41/41 运行时测试**：覆盖 srNext 算法（Wozniak spec 各项）、Ebbinghaus 对齐边界、UI 切换、judge/endRound 钩子集成、跨 session 持久化、重置清空。完整测试 144 + 12 + 24 + 41 = **221/221 全绿，零回归**。
   - **未做**：标准模式下让 SR 真正替代 streak 驱动 `state.weak` 增删（目前 SR.due 与 weak 列表共存，标准模式只是「显示 SR」，未真正用 SR 替代 streak 规则）；SR.due 到期句未自动加入今日任务卡。两者留作 v2.21.0+ 迭代。
3. **教师/班级模式**——单 user 模式已经够用，但加"教师演示中 AI 帮全班生成 → 学生各自打卡 → 教师仪表盘"会打开 B 端市场（B 端学习社群/语言培训机构）。

### 3.3 一件可选做（如果有精力）

- ✅ **加实证研究面板（v0.1 已闭环为研究协议草案）**——把"我们比传统方法更好"从**信仰**变成**数据**的完整研究协议已交付：
  - **`docs/RESEARCH.md`**（12 KB，12 章）：研究问题与假设（H1/H2/H3）、样本入选 / 排除 / 配对分组、材料选择标准（200 词 / Flesch 60-70 / COCA 4001-7000 词频）、14 天流程（D0 评估 → D1-3 训练 → D4-7 保持期 → D7 测试）、主要指标 M1 = D7 默写准确率（4 档评分）+ 4 个次要指标 + 3 个探索性指标、统计方法（Welch's t + Mann-Whitney U + 配对 t + Cohen's d + 95% CI + BH-FDR）、伦理（IRB + 知情同意 + 退出权 + 50 CNY 补偿）、报告模板、时间表（2026-11 → 2027-01）。
  - **`tests/fixtures/research-protocol.json`**（9 KB）：含 `data_schema`（JSON Schema）+ 实验配置 + 受试者字段约束（subject_id pattern `^P[0-9]{2}$`、group enum `{experimental, control}`、评分 ∈ [0,4]、基线 PHQ-9/GAD-7 阈值等）+ 实验组 / 对照组完整示例数据。
  - **`tests/research-schema.test.mjs`**（74/74 绿）：JSON 合法性、data_schema 字段约束、design 自洽性（n_per_group × 2 = n_total）、primary_tests 包含 H1/H2/H3、Cohen's d 阈值单调、伦理字段完整。
  - **74/74 schema 校验**：验证协议本身自洽、可机读、能直接驱动后续研究脚本。
  - **完整测试套件**：smoke 144 + fold 12 + shadow 24 + sr 41 + research-schema 74 = **295/295 全绿，零回归**。
  - **未做 / 待合作研究者启动**：受试者用极简模板 `research-template.html`（基于 `assets/plan-template.html` 裁剪，仅留：原文 + 译文切换 + 录音播放 + 影子跟读可选 + 默写采集 + JSON 导出）——本 turn scope 过大，留作招募到合作研究者后启动。
  - **下一步**：联系 1-2 名心理学 / 教育学研究者合作申请 IRB，准备具体 200 词文本（New Scientist 候选），启动日期敲定。

---

## 4 · 主要参考出处（按章节归口）

### 艾宾浩斯 / 遗忘曲线

- Ebbinghaus, H. (1885). *Über das Gedächtnis*. 维基整理数据：`https://wiki.mbalib.com/...`
- Kepuchina 中国科普整理：`https://www.kepuchina.cn/article/articleinfo?business_type=100&ar_id=327648`

### 间隔效应 meta 分析 / 时间脊线

- Cepeda, N. J., Pashler, H., Vul, E., Wixted, J. T., & Rohrer, D. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3), 354–380.
- Cepeda, N. J., Vul, E., Rohrer, D., Wixted, J. T., & Pashler, H. (2008). Spacing effects in learning: A temporal ridgeline of optimal retention. *Psychological Science*, 19(11), 1095–1102.
- 综述：Dunlosky et al. (2013), *Psychological Science in the Public Interest*.

### SuperMemo / FSRS

- Wozniak, P. A. (1990). Optimization of learning. *Master's Thesis*, University of Technology in Poznan. 重发：`https://www.supermemo.com/archives1990-2015/english/ol/sm2`
- FSRS 开源：`https://github.com/open-spaced-repetition`
- FSRS vs SM-2 综述：`https://fluentcards.org/blog/fsrs-spaced-repetition-algorithm`

### 生成效应

- Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. *Journal of Experimental Psychology: Human Learning and Memory*, 4(6), 592–604. DOI: 10.1037/0278-7393.4.6.592
- 综述：telldear.org/articles/aspect-generation_effect

### 记忆宫殿 / Method of Loci

- McCabe, J. A. (2015). Location, location, location! Demonstrating the mnemonic benefit of the method of loci. *Teaching of Psychology*, 42(2).
- Legge, E. L. G., Madan, C. R., Ng, E. T., & Caplan, J. B. (2012). Building a memory palace in minutes: Equivalent memory performance using virtual vs. conventional environments with the method of loci. *Consciousness and Cognition*, 21(3).

### 测试效应 / 主动回忆

- Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science*, 17(3), 249–255.

### 中文背诵法传统

- 影子跟读：光明日报 (2015-05-05), `https://epaper.gmw.cn/lx/html/2015-05/05/nw.D110000lx_20150505_1-07.htm`
- 行之有效的英语背诵方法：光明日报 (2025-10-25), `https://epaper.gmw.cn/wzb/html/2025-10/25/nw.D110000wzb_20251025_5-02.htm`

### 同类 AI skill

- mastery-loop: `https://github.com/all666666all/mastery-loop`
- agent-memory-method (LobeHub): `https://lobehub.com/skills/zhongweiv-hermes-edu-skills-agent-memory-method`
- ReMindful: `https://github.com/cmhwp/ReMindful`
- English_srs: `https://github.com/xy1105/English_srs`
- vocab-trainer: `https://github.com/mylinwu/vocab-trainer`

---

## 5 · 自我反思（这一节是写给未来读这份报告的自己）

1. **这条 skill 走的是"厚方法论 + 厚工程"路线，不是"轻应用"路线**——所以它的护城河是方法论与 UX 整合，不是单点算法优势。对应打法是：把"段落级背诵"做到 Anki 类工具达不到的位置（链式钩子 + 记忆宫殿 + 留白），而不是跟 Anki 拼调度。
2. **最大的方法论盲点是"评估"——背熟了吗？背的标准是什么？** 答"连顺 2 轮毕业"是必要的，但不够。**短期**可以加听写通过率、**中期**可以加段落测试分数、**长期**可以做 N=20 小实验。
3. **最大的工程盲点是"自动校验"——SKILL.md 自己列了 6 条硬校验，但没代码执行**。这条用户实际看到的不就是问题——用户看到一个漂亮方案，但不知道翻译是否对、连读是否标对。**这一条补上价值最高**。
4. **最大的产品机会是"暗夜里的灯塔"——其他同类 AI skill 没有覆盖段落级背诵**。mastery-loop 是概念级、vocab-trainer 是单词级，**段落级背诵是个真空白**。这条 skill 应该把"段落级背诵"打成品类心智。
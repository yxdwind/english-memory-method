# English Memory Method · 参考层（REFERENCE.md）

> 本文件是 `SKILL.md` 的**按需加载参考层**（v2.44.0 渐进披露）。
> 生成背诵方案时不必读取；仅在「核对方法论来源 / 用户说记性差 / 需要学术引用」等
> 明确触发条件命中时才读取对应章节。执行规则一律留在 `SKILL.md`，本文件不含行为约束。
> 历史版本与工程流水账见 `CHANGELOG.md`，完整架构评估见 `ANALYSIS.md`。

---

## 同类 skill 借鉴与信源(v2.37.0)

> 2026-11-09 读取 GitHub 同类 Agent Skill 源码后的横向对照。可信度评级:**A** = 已读取仓库内 SKILL.md 原文并逐条核对;**B** = 读取仓库 README 原文(经摘要提取);**C** = 仅搜索摘要 / 技能目录镜像,未核一手。

| 仓库 / 文件 | 评级 | 可借鉴机制 | 本 skill 落地位置 | 不照搬的原因 |
|---|---|---|---|---|
| `michalstrnadel/source-to-skill` → `skills/skill-study/SKILL.md` | A | 一次一问 / 等答再揭 / 三档评分 / 原文唯一真相源 / due-first / 结算给最弱项+下次到期 / Leitner 1-3-7-14-30 | 「对话陪练协议」 | 它是**概念卡**级;段落背诵必须保句序,不能把句子打散成独立卡 |
| `kaixiad/RetainCraft` → `SKILL.md` | A | 倦怠检测 / 评分纪律 / 逐级升级+连续 2 次达标 / L5 费曼检验 / 效果量表 | 「倦怠检测与换法阈值」「L5 费曼检验」 | 它的 L1-L5 是**知识等级**,本 skill 的 L1-L5 是**脚手架拆除级别**,语义不同;它的 `optimize-params` 需 1000+ 条 review 才拟合**个性化权重**,这**不等于 FSRS 算法不可用**(见下方校准) |
| `lyndonkl/claude` → `skills/memory-retrieval-learning/SKILL.md` | A | 交错 ABCABC / 20-40% 遗忘甜区 / 3 轮 <60% 换法 / 复习短于初学 / 质量 rubric | 「复习调度硬规则」「换法阈值」 | 只给通用学习计划,不生成逐句标注与结构图 |
| `liknenS/language-learning-skills` → `skills/vocab-coach/SKILL.md` | A | Pick-don't-dump(5-15 项)/ 一条目一事 / 先展示后保存 / 1-4 档评分 / 无连接器时 CSV 兜底 | 专业词汇 5~12 个、短语 8~15 个的「择优」原则 | 服务**词汇**而非**篇章**;四档评分会破坏现有二档向后兼容(SM-2 q=4/2) |
| `m98/fluent` → `README.md` | B | 复习优先于新学 / helper skill 按职责拆分 / 会话结果解析出下次重点 | 规则 1 | 拆成 12 个 skill + 6 个 DB,违背本 skill「单文件零依赖」承诺 |
| `jeffreytse/grimoire-core` → `apply-spaced-repetition` | C | 扩展间隔 1-2-4-8-16-35-90 / 每日新卡 10-20 上限 / 反复卡住的卡重写成原子卡 | 规则 2 + 换法阈值 | raw SKILL.md 路径 404,仅据技能目录镜像;「原子卡」假设与段落顺序记忆冲突 |
| `adamaiken89/learn-something` | C | FSRS-5 卡组 / 每模块 3-5 挖空 / predict-next / error-spotting | 仅作未来参考 | 仅搜索摘要;课程制与单篇交付形态不同 |
| Anthropic / `write-better-skill` 系 | C | description 写「何时用」不堆功能 / body 渐进披露 / 每步可检查且穷尽的完成判据 | 本次 description 重写 | 本 skill 需保持单文件 + 21 平台直装,暂无 `REFERENCE.md` 拆分层(留作后续架构项) |

> **v2.42.2 校准(消除历史表述矛盾)**:v2.37.0 写本表时,「FSRS-5 需 1000+ 条 review」被简写成「本地单文件场景数据不足」,容易读成"本 skill 不能用 FSRS";v2.39.0 已内置 FSRS-5 核心,该表述不再成立。准确区分是两层——
> ① **算法核心**:`src/plan/scripts/01b-fsrs.js` 逐公式移植 ts-fsrs v6.0.0 FSRS-5,用**默认 19 参数 W**(7 组黄金值 ±1e-6 锁死),零历史数据即可算 D/S/R 与到期日,🧮 一键切换,默认仍 SM-2;
> ② **个性化参数优化**(RetainCraft `optimize-params` / FSRS 社区经验):需 1000+ 条 review 才不会过拟合,**本 skill 不做**——单文件 localStorage 样本量不够,且每篇方案独立、跨篇不共享调度历史。
> 因此「不做 per-user 拟合」是范围选择,不是能力缺失;若未来记忆库聚合出足量跨篇复习日志,才具备做②的前提。

**读取 URL**:

- https://github.com/michalstrnadel/source-to-skill/blob/main/skills/skill-study/SKILL.md
- https://github.com/kaixiad/RetainCraft/blob/main/SKILL.md
- https://github.com/lyndonkl/claude/blob/main/skills/memory-retrieval-learning/SKILL.md
- https://github.com/liknenS/language-learning-skills/blob/main/skills/vocab-coach/SKILL.md
- https://github.com/m98/fluent/blob/main/README.md
- https://www.skillsdirectory.com/skills/jeffreytse-apply-spaced-repetition (镜像,评级 C)

**二手学术线索(评级 C,未核一手,不得写进交付给用户的学术依据表)**:Donoghue & Hattie (2021) 效果量(间隔 d=0.85 / 主动回忆 d=0.74 / 交错 d=0.47,转引自 RetainCraft 方法论表)、Bjork desirable difficulties(转引自 memory-retrieval-learning Guardrails)。按 `ANALYSIS.md` §4 的信源原则,核到一手论文前本 skill 的正式引用仍以「主要参考出处」5 篇一手论文为准。

---

## 记忆力友好包(面向记忆弱的学习者)

- **减量**:先只背主线 70%--每个意群只锁 1 个核心词,修饰语靠语法和逻辑推。先粗后细,比一次全背更牢。
- **画面化**:每个钩子变成 1 秒画面,越具体越荒诞越好--图像记忆是人类的母语。
- **自己编**:用户自己写的问题清单/自己编的电影画面,记忆强度约翻倍(生成效应)--AI 给的方案只是示例,改造动作必须用户亲手做。方案内「✍️ 我的一句话主线」「🎨 我的画面」留白(v2.13.0)就是为此准备的,交付时明确督促用户亲手填写。
- **减压阀**:背不动时停 60 秒做别的再回来;漏一天不清零,第二天接着来;忘掉 20~40% 是正常甜区(见「复习调度硬规则」规则 5)。触发「累了 / 连卡 3 句 / 连续 2 轮降分」时按「倦怠检测与换法阈值」降档,不要硬扛。

---

## 主要参考出处

按章节归口,核心一手出处(完整列表见 `ANALYSIS.md` §4):

- **生成效应(留白设计的依据)**:Slamecka, N. J., & Graf, P. (1978). The generation effect: Delineation of a phenomenon. *Journal of Experimental Psychology: Human Learning and Memory*, 4(6), 592–604. DOI: 10.1037/0278-7393.4.6.592
- **间隔重复 / 艾宾浩斯**:Cepeda, N. J., et al. (2006). Distributed practice in verbal recall tasks: A review and quantitative synthesis. *Psychological Bulletin*, 132(3), 354–380.
- **SM-2 算法**:Wozniak, P. A. (1990). Optimization of repetition spacing in the practice of learning. *Acta Neurobiologiae Experimentalis*, 50, 303–313.
- **测试效应 / 主动回忆**:Roediger, H. L., & Karpicke, J. D. (2006). Test-enhanced learning. *Psychological Science*, 17(3), 249–255.
- **记忆宫殿 / Method of Loci**:McCabe, J. A. (2015). Location, location, location! *Teaching of Psychology*, 42(2).

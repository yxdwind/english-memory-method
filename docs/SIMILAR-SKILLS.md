# 对标分析：GitHub 同类 skill 调研（v2.36.0 时点，2026-11-10）

> 调研范围：anthropics/skills 官方仓库、ComposioHQ/awesome-claude-skills（1000+ 条目）、定向搜索（SKILL.md + anki / spaced repetition / vocabulary / language learning）、FSRS 生态（open-spaced-repetition）、Echo-Loop 等非 skill 形态参照。目的：为下一步演进找真增量。

## 一、生态现状：本 skill 的位置

**生态里没有第二个「自包含交互 HTML」路线的英语背诵 skill。** 所有同类都是「生成 Markdown/闪卡文本 + 交给外部工具」模式：

| 对标项目 | 形态 | 核心机制 | 与本 skill 的关系 |
|---|---|---|---|
| RowanXB/academic-vocabulary-anki（6★） | Agent skill + Python 脚本 | 学术词汇 → **sense-specific** Anki 卡，经 **AnkiConnect** 直推运行中的 Anki；含 evals/ 生成质量评测集 | 词汇线竞品；亮点是直推与评测 |
| chr1stophe /learn（gist） | 方法论 skill | 6 阶段 14 步自学的学习科学循环（teach-back/Feynman、interleaving、deliberate practice、anti-patterns） | 方法论金矿，交互设计可借鉴 |
| WSE-research/guided-learning-skill | Claude Code + Obsidian vault | 引导式学习 + SR tracker + session journals | 形态不同（vault 依赖） |
| Mran/anki-deck-builder | Claude skill | 学习材料 → Anki 牌组 | 我们已有 Anki/CSV 导出 |
| open-spaced-repetition（FSRS 官方） | 算法库（含 ts-fsrs JS） | FSRS-5：DSR 三变量调度，同等保持率下复习量比 SM-2 少约 20% | **算法层最大升级候选** |
| Echo-Loop | 独立 App | 精听/跟读/盲听/复述/间隔复习 | 机制重叠，无 skill 形态 |

本 skill 的独有优势（对标皆无）：自包含交互 HTML（真实打卡/录音/语音识别 LCS 评分）、记忆宫殿与三层钩子链、654 项测试 + 构建门禁、跨方案记忆库。

## 二、Top 5 提升点（按性价比排序）

### 1. FSRS 调度器选项 ★★★（算法升级）
SM-2 是 1987 年算法；FSRS-5（open-spaced-repetition/ts-fsrs，MIT）用难度/稳定性/可提取性三变量建模，同等记忆保持率下复习请求少约 20%。
**落地**：vendor 精简 FSRS-5 核心（纯数学 ~150 行，保持零依赖），复习组件加「调度算法：SM-2（默认）/FSRS」切换，progress 存 fsrs 字段；默认不变、随时可回退。QA：现有 SM-2 用例全保留 + 新增 FSRS 等价性用例。

### 2. Feynman 追问模式（复述 L5 升级）★★★（方法论升级）
/learn skill 的 teach-back 循环：AI 扮演追问者，对 L5「转述他人」做 2–3 轮深挖（为什么这么说 / 换个场景还成立吗 / 反例），答不上的句子自动入薄弱清单。把 L5 从「单向转述」升级成真正的 interview，纯交互逻辑、零依赖。
**落地**：复习条加「🎤 Feynman」入口（仅 L5 解锁时可用），语音识别文本喂给追问链，2 轮后出「转述完整度」小结。

### 3. 跨方案交错快刷（interleaving）★★（学习科学）
/learn 9c：同一会话内混排多个主题比分块练习更牢（Rohrer & Taylor 2007）。记忆库「今日全局排期」已跨方案，但轻刷仍按方案分块。
**落地**：今日任务加「🔀 交错模式」开关——把多方案当日到期句混排成一场快刷，结算页按方案分组回写。

### 4. AnkiConnect 直推（可选增强）★★ ✅ 已落地（v2.43.0）
academic-vocabulary-anki 的核心体验：卡不需要手动导 CSV。探测 `localhost:8765`（AnkiConnect），在线时一键直推挖空/复述卡并带回导入回执；探测失败自动回退现有 CSV 路径。只碰本机 loopback，不破坏离线架构。
**落地**：复习条新增「📡 直推 Anki」按钮 → `deckNames` 探测（1.5s 超时）→ `createDeck` → `addNotes`（`allowDuplicate=false`）；CSV 与直推共用 `collectAnkiCards()` 避免漂移；回执写 `state.log['anki:<date>']`（本机进度，随 💾 导出一起带走）。**注意**：`file://` 页面 Origin 为 `null`，AnkiConnect 默认 CORS 常拒绝，诊断弹窗会列出插件号 / `webCorsOriginList` / 端口三种原因并**自动回退 CSV**——离线可用性不受影响。

> Top5 至此 5/5 全部落地：FSRS(v2.39.0) / Feynman(v2.40.0) / interleaving(v2.41.0) / evals(v2.42.0) / AnkiConnect(v2.43.0)。

### 5. 生成质量 evals 集 ★★（工程对齐）
academic-vocabulary-anki 有 evals/（语言生成样例 + 评测用例）。我们的 verify-plan 六硬规则管「结构完整性」，不管「钩子链/译文好不好」。
**落地**：建 evals/ 固定输入集（3 篇不同体裁）+ 评分准则（钩子具体性、译文长度比、IPA 规范），verify-plan 扩展 --eval 模式输出质量分。

## 三、不建议跟进的
- Obsidian vault 形态（WSE-research）：与自包含 HTML 架构冲突。
- NotebookLM 依赖（/learn）：引入外部服务依赖。
- 盲听模式（Echo-Loop）：已有听写模式覆盖。
- 反模式提醒（/learn）：有真实价值（如「超 7 天未打开 → 先检索后新学」）但依赖用户行为数据积累，排为后续观察项。

## 四、结论
本 skill 在生态里**没有同构竞品**——最接近的只有词汇卡与学习方法论两类。真正的提升空间不在「补功能」（功能面已宽于所有对标），而在三个纵深：**调度算法现代化（FSRS）、复述交互纵深化（Feynman）、跨方案练习交错化（interleaving）**。三者全部兼容零依赖单 HTML 架构。

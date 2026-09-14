# english-memory-method

**英语篇章背诵法 · English Passage Memorization Method** -- 一个把"背英语文章"从死记硬背升级为结构化流程的 AI 技能(skill)。丢给它任何一篇英语文章,它会输出:结构图(SVG)+ 完整背诵方案(HTML,含挖空自测)。

## ✨ 方法一览(v2)

**四步主线:拆骨架 → 串关键词并焊成链 → 链式复述(L1→L5)→ 间隔复习**

| 步骤 | 做什么 |
|---|---|
| 1 拆骨架 | 识别文体与段落角色,把文章压成一张结构图 |
| 2 串关键词 + 焊成链 | 每句提炼 1~2 个钩子词,并按文体三选一焊成"链":问题链(议论文)/ 电影法(叙事)/ 轨道法(通用兜底) |
| 3 链式复述 L1→L5 | 看钩子表 → 看结构图 → 看标题 → 空手复述 → 转述他人,逐级摘脚手架 |
| 4 间隔复习 | 艾宾浩斯节奏排班;复习 = 阶梯升级,不是原地重复 |

配套:记忆钩子库(头韵 / 押韵 / 排比 / 对比 / 同义换词 / 首尾呼应 / 数字锚点 / 路标词)+ 挖空自测。

**v2.1 新增**：原文逐句精读区 —— ① 逐句中文翻译（默认中文，可传参换语种，如“翻译成日语”）；② 全现象连读标注：连读 ⌒ / 弱读 / 缩读 / flap t / h 击穿行内标记 + 美式 IPA 读法注解，看原文就能“看到”读音。

**v2.1.1 新增**：① 「7.5 复述技巧包」—— 10 条纯技巧（卡壳自救 / 表达提速 / 练习要领）固定附在记忆钩子之后；② 多平台支持 —— 安装器自动铺装 16 个 agent 平台，并为无 skills 机制的平台提供规则适配文件（见 [platforms/](platforms/README.md)）。

## 🧠 为什么 v2 用"链"不用"钩子"

孤立钩子 = 断点:钩子要背、顺序要背、钩子↔句子的映射也要背--三重负担。
v2 把钩子焊成链:每一环由上一环"推"出来,**能被逻辑推出的内容不需要背**。
完整理念见 [SKILL.md](SKILL.md) 的「核心理念」与「链式复述五级阶梯」。

## 📦 安装

**一键安装（推荐）**——脚本自动探测本机全部已装平台（Claude Code / Codex / Trae / 通义灵码 / Comate / CodeBuddy / WorkBuddy / Kimi Code / Windsurf / Continue / Roo Code 等），逐一装入：

Windows（PowerShell）：
```powershell
irm https://raw.githubusercontent.com/yxdwind/english-memory-method/main/install.ps1 | iex
```

macOS / Linux：
```bash
curl -fsSL https://raw.githubusercontent.com/yxdwind/english-memory-method/main/install.sh | bash
```

**指定平台**（逗号分隔别名，也支持自定义目录）：
```powershell
./install.ps1 -Target "claude,codex,trae"
./install.sh claude,codex,trae
```

别名全集：`autoclaw` `openclaw` `agents` `claude` `codex` `trae` `lingma` `comate` `codebuddy` `windsurf` `continue` `roo` `kimi` `qoder` `qwen` `workbuddy`

若 raw.githubusercontent.com 访问不畅，用备选方案：`git clone https://github.com/yxdwind/english-memory-method.git` 后手动复制（见下）。

**装完即用，无需重启**：技能目录有 watcher 监控（OpenClaw / AutoClaw 默认开启），装完下一条消息即可触发；若当前会话未刷新，开一个新会话，或直接让 agent 读取 `SKILL.md` 文件执行（Claude Code 无 watcher，新开会话生效）。

**手动安装（备选）**：将 `SKILL.md` 和 `assets/` 复制到对应技能目录：

| 平台 | 技能目录 |
|---|---|
| Claude Code | `~/.claude/skills/english-memory-method/` |
| Codex | `~/.codex/skills/english-memory-method/` |
| Trae | `~/.trae/skills/english-memory-method/` |
| 通义灵码 Lingma | `~/.lingma/skills/english-memory-method/` |
| 文心快码 Comate | `~/.comate/skills/english-memory-method/` |
| CodeBuddy / WorkBuddy | `~/.codebuddy/skills/` 、`~/.workbuddy/skills/` |
| Kimi Code | `~/.kimi-code/skills/english-memory-method/` |
| Windsurf / Continue / Roo Code | `~/.windsurf|continue|.roo/skills/` |
| OpenClaw / AutoClaw | `~/.openclaw-autoclaw/skills/english-memory-method/` |

触发方式：丢一篇英语文章 + 一句“出背诵方案”（或“出记忆技巧”）

## 🖥 平台支持（v2.1.1）

本 skill 遵循开放的 **Agent Skills 标准**（`skills/<name>/SKILL.md`），国内外主流 agent 平台已普遍采用。支持分三级：

- **L1 · Skill 直装**（功能完整：SVG 结构图 + 自包含 HTML 方案 + 逐句连读标注）：AutoClaw / OpenClaw / Claude Code / Codex / Trae / 通义灵码 / Comate / CodeBuddy / WorkBuddy / Kimi Code / Qwen Work / Windsurf / Continue / Roo Code
- **L2 · 规则注入**（Markdown 版方案）：Cursor / Qoder / GitHub Copilot / Gemini CLI / Cline / Aider —— 即用适配文件见 [`platforms/`](platforms/README.md)
- **L3 · 手动跟随**：其他平台把 `SKILL.md` 内容粘贴到自定义指令即可

完整矩阵（20 平台 × 安装方式）见 **[platforms/README.md](platforms/README.md)**。

## 🎯 适用场景

四六级 / 考研 / 雅思托福的精听与背诵、成人英语自学、AI 辅助语言学习。
配套训练法(另见系列):《精听诊断五步流程》《连读·弱读四步拆解法》。

## 📄 License

[MIT](LICENSE)

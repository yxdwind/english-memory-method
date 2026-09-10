# english-memory-method

**英语篇章背诵法 · English Passage Memorization Method** —— 一个把"背英语文章"从死记硬背升级为结构化流程的 AI 技能（skill）。丢给它任何一篇英语文章，它会输出：结构图（SVG）+ 完整背诵方案（HTML，含挖空自测）。

## ✨ 方法一览（v2）

**四步主线：拆骨架 → 串关键词并焊成链 → 链式复述（L1→L5）→ 间隔复习**

| 步骤 | 做什么 |
|---|---|
| ① 拆骨架 | 识别文体与段落角色，把文章压成一张结构图 |
| ② 串关键词 + 焊成链 | 每句提炼 1~2 个钩子词，并按文体三选一焊成"链"：问题链（议论文）/ 电影法（叙事）/ 轨道法（通用兜底） |
| ③ 链式复述 L1→L5 | 看钩子表 → 看结构图 → 看标题 → 空手复述 → 转述他人，逐级摘脚手架 |
| ④ 间隔复习 | 艾宾浩斯节奏排班；复习 = 阶梯升级，不是原地重复 |

配套：记忆钩子库（头韵 / 押韵 / 排比 / 对比 / 同义换词 / 首尾呼应 / 数字锚点 / 路标词）+ 挖空自测。

## 🧠 为什么 v2 用"链"不用"钩子"

孤立钩子 = 断点：钩子要背、顺序要背、钩子↔句子的映射也要背——三重负担。
v2 把钩子焊成链：每一环由上一环"推"出来，**能被逻辑推出的内容不需要背**。
完整理念见 [SKILL.md](SKILL.md) 的「核心理念」与「链式复述五级阶梯」。

## 📦 安装

**一键安装（推荐）**——脚本自动探测技能目录（AutoClaw → OpenClaw → Claude Code），装好 `SKILL.md` + `assets/`：

Windows（PowerShell）：
```powershell
irm https://raw.githubusercontent.com/yxdwind/english-memory-method/main/install.ps1 | iex
```

macOS / Linux：
```bash
curl -fsSL https://raw.githubusercontent.com/yxdwind/english-memory-method/main/install.sh | bash
```

自定义目录：`install.ps1 -Target <skills目录>` 或 `install.sh <skills目录>`。
若 raw.githubusercontent.com 访问不畅，用备选方案：`git clone https://github.com/yxdwind/english-memory-method.git` 后手动复制（见下）。

**手动安装（备选）**：将 `SKILL.md` 和 `assets/` 复制到对应技能目录：

- **Claude Code**：`~/.claude/skills/english-memory-method/`
- **OpenClaw / AutoClaw**：`~/.openclaw-autoclaw/skills/english-memory-method/`

装完重启 agent 即生效。触发方式：丢一篇英语文章 + 一句"出背诵方案"（或"同上记忆技巧"）

## 🎯 适用场景

四六级 / 考研 / 雅思托福的精听与背诵、成人英语自学、AI 辅助语言学习。
配套训练法（另见系列）：《精听诊断五步流程》《连读·弱读四步拆解法》。

## 📄 License

[MIT](LICENSE)

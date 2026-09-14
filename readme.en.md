# english-memory-method (English)

**English Passage Memorization Method** — an AI skill (for Claude Code / OpenClaw) that turns "memorizing English articles" from rote grinding into a structured workflow.

Paste any English article, and it produces: a structure diagram (SVG) + a full study plan (HTML, with fill-in-the-blank tests).

## ✨ The Method (v2)

**Four steps: Skeleton → Keywords welded into chains → Chained retelling (L1→L5) → Spaced review**

| Step | What it does |
|---|---|
| ① Skeleton | Detect genre & paragraph roles, compress the article into a structure map |
| ② Keywords → Chains | Extract 1–2 hook words per sentence, then weld them into chains (choose by genre): Question Chain (argumentative) / Mental Movie (narrative) / Rails (universal) |
| ③ Chained retelling L1→L5 | Hook table → structure map → titles only → bare hands → tell it to someone else — remove scaffolding level by level |
| ④ Spaced review | Ebbinghaus schedule; review = ladder upgrade, not repetition |

Plus: a memory-hook library (alliteration / rhyme / parallelism / contrast / synonym swap / bookend echo / number anchors / signpost words) + fill-in-the-blank tests.

**New in v2.1**: a sentence-by-sentence close-reading section — ① per-sentence translation (Chinese by default; pass a parameter for any language, e.g. "翻译成日语"); ② full connected-speech marking: linking ⌒ / weak forms / contractions / flap t / h-dropping marked inline with American IPA annotations — see the pronunciation in the text itself.

**New in v2.1.1**: ① a "7.5 Retelling Toolkit" — 10 universal techniques (stall recovery / fluent delivery / practice tips) appended after the memory hooks; ② multi-platform support — the installer now deploys to 16 agent platforms at once, with rule-adapter files for platforms without a skills mechanism (see [platforms/](platforms/README.md)).

## 🧠 Why chains, not hooks

Isolated hooks = broken points: you must memorize the hooks, their order, AND their mapping to sentences — triple burden.
v2 welds hooks into chains: each link is *inferred* from the previous one — **whatever can be logically derived doesn't need to be memorized**.
See [SKILL.md](SKILL.md), sections 「核心理念」 and 「链式复述五级阶梯」 (Chinese).

## 📥 Install

**Way 1 · Claude Code native plugin (zero CLI, recommended)**: in a Claude Code session run `/plugin marketplace add yxdwind/english-memory-method` then `/plugin install english-memory-method`

**Way 2 · One-liner to deploy EVERY detected platform (recommended)**: the script auto-detects all installed platforms (Claude Code / Codex / Trae / Lingma / Comate / CodeBuddy / WorkBuddy / Kimi Code / MiniMax / Windsurf / Continue / Roo Code ...) and installs into each one; download sources auto-fallback (raw → jsdelivr CDN, China-friendly):

Windows (PowerShell):
```powershell
irm https://cdn.jsdelivr.net/gh/yxdwind/english-memory-method@main/install.ps1 | iex
```

macOS / Linux:
```bash
curl -fsSL https://cdn.jsdelivr.net/gh/yxdwind/english-memory-method@main/install.sh | bash
```

> If jsdelivr lags behind, use the official source: `irm https://raw.githubusercontent.com/yxdwind/english-memory-method/main/install.ps1 | iex`

**Way 3 · npm / npx (Node users)**:

```bash
npx english-memory-method              # deploy to every detected platform
npx english-memory-method claude,trae  # specific platforms
```

**Way 4 · Built-in platform installer (no CLI)**: on platforms with a built-in skill installer (Codex, CodeBuddy...), just tell the agent:

> Install the skill english-memory-method from GitHub (repo: yxdwind/english-memory-method)

**Target specific platforms** (comma-separated aliases; a custom dir also works):
```powershell
./install.ps1 -Target "claude,codex,trae"
./install.sh claude,codex,trae
```

Aliases: `autoclaw` `openclaw` `agents` `claude` `codex` `trae` `lingma` `comate` `codebuddy` `windsurf` `continue` `roo` `kimi` `qoder` `qwen` `workbuddy` `minimax`

If raw.githubusercontent.com is unreachable, fall back to `git clone https://github.com/yxdwind/english-memory-method.git` and copy manually (below).

**No restart needed**: the skills watcher (on by default for OpenClaw / AutoClaw) picks the skill up on your next message. If the current session doesn't refresh, start a new conversation — or simply ask your agent to read the `SKILL.md` directly. (Claude Code has no watcher: a new session picks it up.)

**Manual (fallback)**: copy `SKILL.md` and `assets/` into your skills dir, e.g.:

| Platform | Skills dir |
|---|---|
| Claude Code | `~/.claude/skills/english-memory-method/` |
| Codex | `~/.codex/skills/english-memory-method/` |
| Trae | `~/.trae/skills/english-memory-method/` |
| Lingma (Alibaba) | `~/.lingma/skills/english-memory-method/` |
| Comate (Baidu) | `~/.comate/skills/english-memory-method/` |
| CodeBuddy (Tencent) | `~/.codebuddy/skills/english-memory-method/` |
| WorkBuddy (Tencent) | `~/.workbuddy/skills/english-memory-method/` |
| Kimi Code (Moonshot) | `~/.kimi-code/skills/english-memory-method/` |
| MiniMax | `~/.minimax/skills/english-memory-method/` |
| Windsurf | `~/.windsurf/skills/english-memory-method/` |
| Continue | `~/.continue/skills/english-memory-method/` |
| Roo Code | `~/.roo/skills/english-memory-method/` |
| OpenClaw / AutoClaw | `~/.openclaw-autoclaw/skills/english-memory-method/` |

Trigger: paste an English article and ask for a memorization plan (出背诵方案, or 出记忆技巧).

## 🖥 Platform Support (v2.1.1)

This skill follows the open **Agent Skills standard** (`skills/<name>/SKILL.md`), now adopted by most mainstream agent platforms worldwide. Three support tiers:

- **L1 · Native skill install** (full features: SVG diagram + self-contained HTML plan + per-sentence linking marks): AutoClaw / OpenClaw / Claude Code / Codex / Trae / Lingma / Comate / CodeBuddy / WorkBuddy / Kimi Code / MiniMax / Qwen Work / Windsurf / Continue / Roo Code
- **L2 · Rule injection** (Markdown plan): Cursor / Qoder / GitHub Copilot / Gemini CLI / Cline / Aider — ready-to-use adapter files in [`platforms/`](platforms/README.md)
- **L3 · DIY**: on any other platform, paste the `SKILL.md` content into its custom instructions

Full matrix (20 platforms × install methods): **[platforms/README.md](platforms/README.md)**.

## 🎯 Use cases

CET-4/6, Kaoyan, IELTS/TOEFL intensive listening & recitation, adult self-study, AI-assisted language learning.
Companion methods (same series): the 5-step intensive-listening diagnosis, and the 4-step linked-speech breakdown.

## 📄 License

[MIT](LICENSE)

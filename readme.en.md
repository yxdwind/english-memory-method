<div align="center">

# 🧠 english-memory-method

**Turn "memorizing English articles" from rote grinding into a path you can actually walk.**

Paste any English article, and it produces a **14-section study plan** (self-contained HTML):
sentence-by-sentence linking marks, hooks welded into question chains, a retelling ladder, terminology tables, collapsed self-tests — all in one file.

![Version](https://img.shields.io/badge/version-2.8.0-blue)
![Platforms](https://img.shields.io/badge/platforms-16+-teal)
![Skill Sections](https://img.shields.io/badge/skill_sections-13-orange)
![License](https://img.shields.io/badge/license-MIT-green)
![Standard](https://img.shields.io/badge/Agent_Skills-standard-red)

[Install](#-quick-start) · [Features](#-features) · [How it works](#-how-it-works13-section-closed-loop) · [Platforms](#-platform-support) · [中文](readme.md)

</div>

---

## ✨ Features

| | Feature | In one line |
|---|---|---|
| 🧠 | **Chained retelling** | Hooks are welded into question chains: each link is *inferred* from the previous one — whatever can be derived doesn't need memorizing |
| 📖 | **Close reading** | Chinese translation + full connected-speech marking (⌒ linking / weak forms / flap t / h-dropping) + term highlighting |
| 📚 | **Terminology tables** | Word-formation breakdown (roots & affixes) + IPA + memory hooks — know the root, and new words become familiar ones |
| 💬 | **Life examples for phrases** | Every collocation gets a plain-English daily sentence, **ready to mimic** (no translation — think in English) |
| 🗂 | **13-section closed loop** | Strategy → close reading → hooks & chains → retelling ladder → three-pass → review → self-test → accumulation |
| 🔁 | **Review loop** | Sentence-level OK/stuck check-in → weak-sentence list (click to jump) → graduate after 2 clean rounds; progress persists in your browser |
| 🏛 | **Memory palace** | 25-station daily-life route, one sentence per station — spatial cues back up the hook chain; an "empty station" exposes a lost sentence |
| 🔒 | **Collapsed self-tests** | Fill the blanks first; answers hide behind "▶ 查看本段答案" toggles, auto-hidden when printing |
| 🖥 | **16+ platforms, one command** | Claude Code / Codex / Trae / Lingma / Comate / CodeBuddy / WorkBuddy / Kimi / MiniMax… |
| 📄 | **Self-contained single file** | Each plan is one HTML: inline SVG, collapsible, print-friendly, zero external dependencies |

---

## 🚀 Quick Start

**Windows (PowerShell)**:

```powershell
irm https://cdn.jsdelivr.net/gh/yxdwind/english-memory-method@main/install.ps1 | iex
```

**macOS / Linux**:

```bash
curl -fsSL https://cdn.jsdelivr.net/gh/yxdwind/english-memory-method@main/install.sh | bash
```

**Claude Code (zero CLI)**:

```
/plugin marketplace add yxdwind/english-memory-method
/plugin install english-memory-method
```

**npm / npx**:

```bash
npx english-memory-method
```

> The installer auto-detects **every installed platform** and deploys to each one (16+ aliases — see [Platform Support](#-platform-support)).
> If jsdelivr lags, switch to the official source: `irm https://raw.githubusercontent.com/yxdwind/english-memory-method/main/install.ps1 | iex`

**Trigger**: paste an English article + ask for a memorization plan. No restart needed.

---

## 📖 How it works (14-section closed loop)

| # | Section | What it does |
|---|---|---|
| 1 | Strategy | Detect genre & skeleton, estimate length and days |
| 2 | Structure map | Compress the article into one SVG map |
| 3 | Close reading | Translation + linking marks + term highlighting, sentence by sentence |
| 4 | Keyword table | 1–2 hook words per sentence + Chinese cues |
| 5 | Question chain | Weld hooks into 4–7 signpost questions — self-QA when retelling |
| 6 | Retelling ladder | L1 hooks → L2 chain → L3 titles → L4 bare hands → L5 tell someone |
| 7 | Three-pass method | Read ×3 → retell with hooks → retell with the chain |
| 8 | Spaced review | 5 min → tonight → next day → day 3 → day 7/15 |
| 9 | Fill-in-blank test | 2–5 blanks per paragraph; answers collapsed |
| 10 | Phrase list | 8–15 collocations + corpus-style examples, ready to reuse |
| 11 | Terminology | Word-formation breakdown + IPA + memory hooks |
| 12 | Memory hooks | In-text hooks + **three-layer hook chain**: paragraph hook → sentence-hook chain (logic bridges) → English anchors |
| 13 | Retelling toolkit | 10 techniques: stall recovery / delivery / practice tips |
| 14 | Palace map | 25-station daily-life route, one sentence per station — spatial backup for lost sentences |

**Core idea**: isolated hooks = broken points — you memorize the hooks, the order, AND the mapping. Triple burden.
v2 welds hooks into chains: each link is *inferred* from the previous one — **whatever can be logically derived doesn't need memorizing**.

---

## 🖥 Platform Support

Built on the open **Agent Skills standard** (`skills/<name>/SKILL.md`). Three tiers:

- **L1 · Native skill install**: AutoClaw / OpenClaw / Claude Code / Codex / Trae / Lingma / Comate / CodeBuddy / WorkBuddy / Kimi Code / MiniMax / Qwen Work / Windsurf / Continue / Roo Code
- **L2 · Rule injection** (Markdown plans): Cursor / Qoder / GitHub Copilot / Gemini CLI / Cline / Aider — adapters in [`platforms/`](platforms/README.md)
- **L3 · Manual**: paste `SKILL.md` content into any platform's custom instructions

Full matrix (21 platforms × install methods): **[platforms/README.md](platforms/README.md)**.

---

## 📜 Version History

<details>
<summary><b>Expand: all changes from v2.1 → v2.8.0</b></summary>

**v2.1**: sentence-by-sentence close reading — per-sentence translation (any language) + full connected-speech marking (⌒ linking / weak forms / flap t / h-dropping) with American IPA.

**v2.1.1**: ① "7.5 Retelling Toolkit" — 10 universal techniques appended after memory hooks; ② multi-platform support — installer deploys to 16 agent platforms, with rule adapters for platforms without skills.

**v2.2.0**: terminology — ① inline term highlighting in close reading; ② "6.5 Terminology" table (term / word-formation / IPA / Chinese / memory hook); all 30 existing plans upgraded.

**v2.2.1**: fill-in-blank answers hidden behind per-section toggles; auto-hidden when printing.

**v2.3.0**: ① phrase list upgraded to a 3-column table with life examples; ② all sections renumbered 1–13.

**v2.4.0**: phrase examples upgraded to authentic-corpus style (news / TED voice), collocations bolded inline, no translation — 728 examples rewritten across all 30 plans.

**v2.5.0**: Terminology IPA upgraded to three-accent annotation — US default, UK differences on a separate `UK:` line, Indian English per system rules on `IN:`; 189 terms fully annotated (57 UK/US contrasts, 68 Indian-English notes).

**v2.6.0**: Memory hooks upgraded to the **three-layer hook chain** — (1) paragraph hook: one vivid hook per paragraph; (2) sentence-hook chain: a 2–4 character micro-hook per sentence, linked by logic bridges (⇒ cause / ↔ contrast / → progression / ＋ parallel / : example); (3) English anchors: 2–3 anchor words from the original sentence after every hook (Chinese hook → anchor → sentence). Cover the text, follow the chain, speak one sentence per hook; wherever you get stuck is exactly the sentence to re-drill. All 30 plans upgraded: 124 chains / 423 hooks.

**v2.7.0**: Review loop — plans now ship with a built-in sentence-level check-in widget: mark each sentence OK/stuck, stuck ones auto-join the **weak-sentence list** (click to jump to the text), graduate after 2 consecutive OK rounds; rounds settle with dates, progress persists in localStorage, controls hidden when printing. Built into all 30 plans — just open the file to track progress.

**v2.8.0**: Memory-palace layer — new Section 14 "Palace map": a 25-station daily-life route (bed → … → bed-side; replaceable with your own route via parameter), one sentence per station in order, hooks & anchors reused straight from the hook chain. Walk the logic line (hook chain) normally; switch to the spatial line (palace) when stuck — an "empty station" pinpoints the lost sentence instantly. Injected into all 30 plans.

</details>

---

## 🎯 Use cases

CET-4/6, Kaoyan, IELTS/TOEFL intensive listening & recitation, adult self-study, AI-assisted language learning.
Companion methods (same series): the 5-step intensive-listening diagnosis, and the 4-step linked-speech breakdown.

## 📄 License

[MIT](LICENSE)

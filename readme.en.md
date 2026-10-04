<div align="center">

# 🧠 english-memory-method

**Turn "memorizing English articles" from rote grinding into a path you can actually walk.**

Paste any English article, and it produces a **17-section longform plan (15 basic / 16 speech / 17 longform) (speeches: 16 sections incl. skeleton)** (self-contained HTML):
sentence-by-sentence linking marks, hooks welded into question chains, a retelling ladder, terminology tables, collapsed self-tests — all in one file.

![Version](https://img.shields.io/badge/version-2.28.1-blue)
![Platforms](https://img.shields.io/badge/platforms-16+-teal)
![Skill Sections](https://img.shields.io/badge/skill_sections-13-orange)
![License](https://img.shields.io/badge/license-MIT-green)
![Standard](https://img.shields.io/badge/Agent_Skills-standard-red)

[Install](#-quick-start) · [Features](#-features) · [How it works](#-how-it-works151617-section-loop-by-article-type) · [Platforms](#-platform-support) · [中文](readme.md)

</div>

---

## ✨ Features

| | Feature | In one line |
|---|---|---|
| 🧠 | **Chained retelling** | Hooks are welded into question chains: each link is *inferred* from the previous one — whatever can be derived doesn't need memorizing |
| 📖 | **Close reading** | Chinese translation + full connected-speech marking (⌒ linking / weak forms / flap t / h-dropping) + term highlighting |
| 📚 | **Terminology tables** | Word-formation breakdown (roots & affixes) + IPA + memory hooks — know the root, and new words become familiar ones |
| 💬 | **Life examples for phrases** | Every collocation gets a plain-English daily sentence, **ready to mimic** (no translation — think in English) |
| 🗂 | **14-section closed loop** | Strategy → close reading → hooks & chains → retelling ladder → three-pass → review → self-test → accumulation |
| 🔁 | **Review loop** | Sentence-level OK/stuck check-in → weak-sentence list (click to jump) → graduate after 2 clean rounds; progress persists in your browser |
| 🏛 | **Memory palace** | 25-station daily-life route, one sentence per station — weak stations auto-marked red on check-in, cleared on graduation |
| 🎧 | **Dictation check** | TTS reads each sentence → type what you hear → word-level diff; mistakes flow into the weak list |
| 💎 | **Golden Patterns** | 5–9 transferable patterns per article (bold replaceable part + swappable template) — straight into your writing/speeches |
| 🎤 | **Speech mode** | Detects the three-act skeleton (hook / argument / crescendo) with delivery guidance; question chain & ladder retooled for speeches |
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

## 📖 How it works (15/16/17-section loop by article type)

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
| 12 | Golden Patterns | Four-column transferable patterns: pattern / meaning / swappable template / usage scene |
| 13 | Memory hooks | In-text hooks + **three-layer hook chain**: paragraph hook → sentence-hook chain (logic bridges) → English anchors |
| 14 | Retelling toolkit | 10 techniques: stall recovery / delivery / practice tips |
| 15 | Palace map | 25-station daily-life route, one sentence per station — spatial backup for lost sentences |

<details>
<summary><b>🎤 Speech-mode section table (16 sections)</b></summary>

| # | Section | Notes |
|----|------|------|
| 1 | Strategy | Speech path: skeleton → keywords → three-pass → spaced review |
| 2 | Structure map | Three-act SVG map |
| **3** | **Speech Skeleton** 🎤 | Three-act stations (hook / argument / crescendo) with rhetorical function + transferable technique; breathing groups & intonation |
| 4 | Close reading | Translation + linking marks, sentence by sentence |
| 5 | Keyword table | Hook words + Chinese cues |
| 6 | Question chain | **Audience-viewpoint** "what's next?" self-QA |
| 7 | Retelling ladder | L3 = **retell from the skeleton** |
| 8 | Three-pass method | Read ×3 → retell with hooks → retell with the chain |
| 9 | Spaced review | 5 min → tonight → next day → day 3 → day 7/15 |
| 10 | Fill-in-blank test | Collapsed answers, fill first |
| 11 | Phrase list | Collocations + corpus-style examples |
| 12 | Terminology | Word-formation + three-accent IPA + memory hooks |
| 13 | Golden Patterns | Speech-pattern four-column table (opening / parallelism / closing templates) |
| 14 | Memory hooks | Three-layer hook chain |
| 15 | Retelling toolkit | 10 techniques (incl. speech recovery) |
| 16 | Palace map | 25-station route, spatial backup |

Sample: the Gettysburg Address plan (triple negation → deed-vs-words line → of-by-for the people).

</details>

<details>
<summary><b>📜 Longform-mode section table (17 sections · auto-enabled for 500–2000 words)</b></summary>

| # | Section | Notes |
|----|------|------|
| 1 | Strategy | Includes the per-segment schedule: 1–2 segments per day |
| 2 | Structure map | Full-text map with the cross-segment master chain |
| **3** | **Segment Dashboard** 📜 | One row per segment: name / schedule / 🔒▶✅ state driven by check-ins / weak count |
| 4.1–4.N | **Segment units** 📜 | Each segment is a self-contained loop: annotated close reading + keywords + question chain + hook chain |
| 9 | Three-pass method | For today's segment only |
| 10 | Spaced review | **Per-segment staggered schedules** + a full-text assembly day |
| 11 | Fill-in-blank test | Per-segment blanks + collapsed answers |
| 12 | Phrase list | Full-text phrases |
| 13 | Terminology | Full-text terms |
| 14 | Golden Patterns | Full-text patterns |
| 15 | Memory hooks | **Cross-segment master chain**: learn it first |
| 16 | Retelling toolkit | 10 techniques |
| 17 | Palace map | Station numbering continuous across segments (station 1 = first sentence) |

Sample: the [Declaration of Independence condensed edition](declaration-memorization-plan.html) (5 segments / 21 sentences / ~830 words / 5 days).

</details>




**Quality gates**: every generated plan runs **6 mandatory content checks** (sentence completeness / annotation precision / palace alignment / station numbering / cloze consistency / term & pattern provenance) via `bin/verify-plan.mjs` — each rule reports error/warning, and a failing plan doesn't ship.

**Memory-friendly**: the whole flow is designed for weaker memorizers — pictographic hooks (the weirder the better), blanks-before-learning, first-screen folding (core 4 sections only), a first-visit onboarding card, and SM-2's "light mode" as the default (ignore the algorithm, keep the old behavior).
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

> Newest first; earliest versions in the collapsed section at the bottom.

**Audit fixes** (v2.28.1)

**v2.28.1**: **Copy divergence + truncation guard** — fixed the dual-source-of-truth break caused by the v2.18→v2.28 batch update (`assets/` stuck at v2.16/v2.17, `plugin.json` missed, npm users got stale components; version-check gains 2 new groups for plugin.json & copy identity, now 9); fixed the library `</script` truncation hazard (hard SKILL.md check + 3 smoke guards: a closing-sequence in data makes the parser terminate the script early and the whole page silently dies); segment-stats table wrapped for mobile scroll; drill recap shows "?" for missing sentence numbers; plan cards show the planned days; test version assertion now compares CHANGELOG dynamically. Total tests **468**.

**Testing infrastructure** (v2.28.0–v2.26.0)

**v2.28.0**: **End-to-end session driver** — jsdom runs the full 35-step user flow (`bin/e2e-flow.mjs`, --strict); fixed the endRound persistence bug; total tests 455.

**v2.27.0**: Cross-browser API static scanner (43 APIs × 4 browsers) + `docs/CROSS-BROWSER.md`.

**v2.26.0**: fixture sync tool `bin/sync-fixtures.mjs` + CI-friendly `--check` mode.

**Polish & self-test** (v2.25.0–v2.23.0)

**v2.25.0**: 📝 60-second cloze challenge countdown; 🎯 configurable graduation threshold (2/3/4/5 streak).

**v2.24.0**: Quick-drill "🎯 back-to-plan check-in" jump; library status filter chips.

**v2.23.0**: Step 0 genre detection (short/longform/speech) in the workflow; per-segment stats table.

**Scheduling & portability** (v2.22.0–v2.19.0)

**v2.22.0**: git tag automation `bin/tag.mjs`; .ics timezone fixes.

**v2.21.0**: Progress export/import (💾/📥); longform "📌 set as today's new" reshuffle.

**v2.20.0**: **SM-2 scheduler** (Wozniak 1990) replaces the fixed graduation threshold; light/standard modes.

**v2.19.0**: Shadowing — TTS → MediaRecorder recording → comparison scoring; wrong words auto-feed the weak list.

**Platform & library** (v2.18.0–v2.16.0)

**v2.18.0**: First-screen folding (h2 ≥9 collapsed by default) + first-visit onboarding card.

**v2.17.0**: **Personal memory library** `memory-library.html` — bookshelf / search / quick-drill / live progress.

**v2.16.0**: Narrow-screen (≤720px) adaptation — horizontal-scroll tables, stacked task cards, sticky toolbars.

**Learning loop** (v2.15.0–v2.13.0)

**v2.15.0**: Progress content fingerprint — regenerated plans detected, no more stale misalignment; palace `data-sents` precise weak-station mapping.

**v2.14.0**: Weak drill "⚡ only weak(N)"; interactive cloze — blanks become inputs at load, auto-graded, misses feed the weak list.

**v2.13.0**: Self-test modes "🙈" three-way cycle (off → hide translation → hide all); "📅 Today card" computing today's work via per-segment Ebbinghaus.


<details>
<summary><b>Expand early versions (v2.12.0 → v2.1)</b></summary>

**v2.12.0**: Longform mode — articles of 500–2000 words (or 12+ sentences) automatically produce a 17-section plan: new Section 3 "Segment Dashboard" (per-segment row: name / schedule / 🔒▶✅ state driven by check-ins / weak count), sections 4.1–4.N per-segment units (each with its own close reading + keywords + question chain + hook chain), per-segment staggered Ebbinghaus schedules plus a full-text assembly day, a cross-segment master chain to learn first, and a continuous 21-station palace. Sample: the Declaration of Independence condensed edition (5 segments / 21 sentences).

**v2.11.0**: Speech mode — feed it a speech and it produces a 16-section plan with a new Section 3 "Speech Skeleton" (three-act stations: opening hook / argument / crescendo, each with its rhetorical function and a transferable technique, plus breathing groups and intonation guidance); the question chain becomes audience-viewpoint self-QA and ladder L3 becomes "retell from the skeleton". Sample plan: the Gettysburg Address.

**v2.10.0**: New Section 12 "Golden Patterns (reusable for writing & speeches)" — 5–9 transferable sentence patterns per article in two flavors (practical frameworks + classic rhetoric), as a four-column table: pattern (replaceable part in bold) / meaning / swappable template / usage scene. Sections after it shift: hooks→13, retelling toolkit→14, palace→15. All 30 plans retrofilled with 187 patterns.

**v2.9.0**: Dictation mode — new "🎧 Dictation" entry above the sentence list: browser US-English TTS reads each sentence aloud (zero setup), you type what you hear, word-by-word diff highlighting (wrong = yellow, missing = red strike, extra = grey strike, correct = green); wrong sentences flow straight into the weak-sentence list, synced with check-in marks and palace red stations. Progress saved separately; controls hidden when printing. Built into all 30 plans.

**v2.8.1**: Palace × check-in linkage completed — on "end round", stations of weak sentences turn red automatically; graduate on 2 clean rounds clears the mark; reopening the file restores marks from saved progress, so the palace always mirrors current weak spots.

**v2.8.0**: Memory-palace layer — new Section 14 "Palace map": a 25-station daily-life route (bed → … → bed-side; replaceable with your own route via parameter), one sentence per station in order, hooks & anchors reused straight from the hook chain. Walk the logic line (hook chain) normally; switch to the spatial line (palace) when stuck — an "empty station" pinpoints the lost sentence instantly. Injected into all 30 plans.

**v2.7.0**: Review loop — plans now ship with a built-in sentence-level check-in widget: mark each sentence OK/stuck, stuck ones auto-join the **weak-sentence list** (click to jump to the text), graduate after 2 consecutive OK rounds; rounds settle with dates, progress persists in localStorage, controls hidden when printing. Built into all 30 plans — just open the file to track progress.

**v2.6.0**: Memory hooks upgraded to the **three-layer hook chain** — (1) paragraph hook: one vivid hook per paragraph; (2) sentence-hook chain: a 2–4 character micro-hook per sentence, linked by logic bridges (⇒ cause / ↔ contrast / → progression / ＋ parallel / : example); (3) English anchors: 2–3 anchor words from the original sentence after every hook (Chinese hook → anchor → sentence). Cover the text, follow the chain, speak one sentence per hook; wherever you get stuck is exactly the sentence to re-drill. All 30 plans upgraded: 124 chains / 423 hooks.

**v2.5.0**: Terminology IPA upgraded to three-accent annotation — US default, UK differences on a separate `UK:` line, Indian English per system rules on `IN:`; 189 terms fully annotated (57 UK/US contrasts, 68 Indian-English notes).

**v2.4.0**: phrase examples upgraded to authentic-corpus style (news / TED voice), collocations bolded inline, no translation — 728 examples rewritten across all 30 plans.

**v2.3.0**: ① phrase list upgraded to a 3-column table with life examples; ② all sections renumbered 1–13.

**v2.2.1**: fill-in-blank answers hidden behind per-section toggles; auto-hidden when printing.

**v2.2.0**: terminology — ① inline term highlighting in close reading; ② "6.5 Terminology" table (term / word-formation / IPA / Chinese / memory hook); all 30 existing plans upgraded.

**v2.1.1**: ① "7.5 Retelling Toolkit" — 10 universal techniques appended after memory hooks; ② multi-platform support — installer deploys to 16 agent platforms, with rule adapters for platforms without skills.

**v2.1**: sentence-by-sentence close reading — per-sentence translation (any language) + full connected-speech marking (⌒ linking / weak forms / flap t / h-dropping) with American IPA.

</details>

---

## 🎯 Use cases

CET-4/6, Kaoyan, IELTS/TOEFL intensive listening & recitation, adult self-study, AI-assisted language learning.
Companion methods (same series): the 5-step intensive-listening diagnosis, and the 4-step linked-speech breakdown.

## 📄 License

[MIT](LICENSE)

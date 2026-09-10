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

## 🧠 Why chains, not hooks

Isolated hooks = broken points: you must memorize the hooks, their order, AND their mapping to sentences — triple burden.
v2 welds hooks into chains: each link is *inferred* from the previous one — **whatever can be logically derived doesn't need to be memorized**.
See [SKILL.md](SKILL.md), sections 「核心理念」 and 「链式复述五级阶梯」 (Chinese).

## 📦 Install

- **Claude Code**: clone this repo, put `SKILL.md` in `~/.claude/skills/english-memory-method/`
- **OpenClaw / AutoClaw**: put it in `~/.openclaw-autoclaw/skills/english-memory-method/`
- Trigger: paste an English article + "出背诵方案"

## 🎯 Use cases

CET-4/6, Kaoyan, IELTS/TOEFL intensive listening & recitation, adult self-study, AI-assisted language learning.
Companion methods (same series): the 5-step intensive-listening diagnosis, and the 4-step linked-speech breakdown.

## 📄 License

[MIT](LICENSE)

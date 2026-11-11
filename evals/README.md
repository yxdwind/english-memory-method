# evals/ —— 生成质量评测集（v2.42.0）

对标 `RowanXB/academic-vocabulary-anki` 的 evals/ 思路：**结构完整性**由 verify-plan 六条硬规则把关（error 级，阻断交付），**生成质量**由本目录的 E 规则评测（advisory，输出发现 + 100 分制质量分）。

## 内容

- `cases/`：固定输入样本（手工构造的小型方案页，含「好样本」与三类人为缺陷样本）
  - `eval-good.html`：干净基线（钩子具体 / 译文长度比在带内 / 连读全覆盖 / IPA 无中文）→ 应得满分
  - `eval-bad-hooks.html`：泛化钩子（虚词 `the`、纯符号 `!!!`）→ E1 warn
  - `eval-bad-zh.html`：译文长度比 0.10 / 0.14（< 0.4）→ E2 warn
  - `eval-bad-ipa.html`：IPA 段含中文 `/音标写错了/` → E4 fail
- `expected.json`：每个样本的期望 E 规则状态与精确分数

## 运行

```bash
node bin/verify-plan.mjs evals/cases/eval-good.html --eval
node tests/evals.test.mjs        # 全部样本 vs expected.json（npm test 链内）
```

## E 规则口径（与方案页 ?check=1 完全一致）

| 规则 | 口径 | 级别 |
|---|---|---|
| E1 钩子具体性 | seg 非空、非纯符号、首词非虚词（虚词表见 bin/verify-plan.mjs E_GENERIC） | warn |
| E2 译文长度比 | zh（去空格）/ en（含空格）∈ [0.4, 1.8] | warn |
| E3 连读覆盖 | .pron 块数 / 句数 ≥ 50% | warn |
| E4 IPA 规范 | /…/ 音标段内不得含 CJK | fail |

分数 = 100 − warn×10 − fail×25（下限 0）。E 规则可在**任何** `*-memorization-plan.html` 上运行：
`node bin/verify-plan.mjs <方案.html> --eval`

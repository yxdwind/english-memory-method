# 端到端测试 · English Memory Method

> **目的**：在 jsdom 里完整跑一遍真实用户流程，确保 41 个 UI 功能 + 15 个版本锚点在「冷启动 → 评卡 → 结束 → 导出 → 重置 → 导入 → 跨页面」全链路上协同不破。
> **配套工具**：`bin/e2e-flow.mjs`（35 步独立可观察的子流程），`tests/e2e.test.mjs`（CI 校验入口）。
> **配套修复**：v2.28 揭示并修复 `endRound()` 中 `state = loadState()` 覆盖本轮 mutations 的持久化 bug。

---

## 1. 测试矩阵

| 样本 | 文件 | 句数 | 步骤数 | 状态 |
|---|---|---|---|---|
| `getty` | `tests/samples/getty-memorialization-plan.html` | 10 | 35/35 ✅ | 林肯葛底斯堡 |
| `ai` | `tests/samples/ai-education-plan.html` | 10 | 35/35 ✅ | AI 与教育议论文 |

---

## 2. 全链路 35 步

### A. 启动阶段（步骤 1-7）

```
[0] 样本文件存在                       ✅ 文件大小 100+ KB
[0b] verify-plan 跑成功（informational）✅ exit=0/1（不阻断）
[1] 复习条 rv-bar 已渲染               ✅ DOM 中含 .rv-bar
[2] 复习按钮 rv-round 已注入           ✅
[3] 方案含 ≥ 5 个 .sent 句             ✅ actual=10
[4] srMode 按钮已注入                  ✅
[5] export 按钮已注入                  ✅
[6] import 按钮已注入                  ✅
```

### B. 评卡阶段（步骤 8-19）

```
[7]  点 ▶ 开始本轮 → state.mode=true   ✅
[8]  按钮文本变为 "✅ 结束本轮"        ✅
[9]  评卡 #0 ok                        ✅
[10] 评卡 #1 ok                        ✅
[11] 评卡 #2 ok                        ✅
[12] 评卡 #3 bad                       ✅
[13] 4 张卡评完（done 应有 4 条）       ✅ actual=4
[14] SR 字段已写入（state.sr ≥ 4 条）  ✅
[15] 点 ✅ 结束本轮 → state.mode=false  ✅
[16] state.rounds.length 增加          ✅ 0 → 1
[17] 最近一轮有 ok + bad 数             ✅ ok=3, bad=1
[18] endRound 后 state.weak 至少 1 条   ✅ weak={3:true}
[19] 点 srMode → light → standard       ✅
```

### C. 仪表盘（步骤 20）

```
[20] standard 模式仪表盘含 SM-2 详情    ✅
```

### D. 导出/导入（步骤 21-29）

```
[21] 💾 导出触发 Blob 创建（JSON）      ✅ jsonCalls=1
[22] 下载文件名含 emm-progress- + 日期 ✅
[23] JSON 可解析                       ✅
[24] JSON 含 fingerprint 字段          ✅
[25] JSON 含 srMode 字段               ✅
[26] JSON 含 shadow / sr / weak / rounds ✅
[27] localStorage 已清空               ✅
[28] 导入后 state.rounds.length 恢复   ✅
[29] 导入后 state.weak 至少 1 条       ✅
[30] 导入后 state.sr 至少 4 条         ✅
[31] 导入后 fingerprint 一致           ✅
```

### E. 跨页面（步骤 32-33）

```
[32] library 页加载成功                 ✅
[33] library 检测到 ≥ 1 篇文章          ✅ cards=1
```

### F. 报告

```
[34] 步骤数 = 35 · 通过 = 35 · 失败 = 0  ✅
```

---

## 3. v2.28 揭示并修复的 bug

### 3.1 `endRound()` 持久化覆盖 bug

**症状**：
- 评完一轮后 `state.rounds` 没有增加
- `state.weak` 没有写入
- `state.mode` 仍为 `true`

**根因**（plan-template.html `endRound()` 原版）：
```js
function endRound(){
  state.mode = false;
  Object.keys(state.done).forEach(...);  // 写 state.weak
  state.rounds.push(round);              // 写 state.rounds
  __emmDispatch('endRound', ...);        // SR 通过 patchSr 写 state.sr
  state.done = {};
  state = loadState();                   // ⚠️ 此行把上面的 mutations 全部覆盖
  state.done = {};
  save(state);                           // 保存的是覆盖后的状态
  ...
}
```

问题：`state = loadState()` 从 localStorage 读回的是「main 上次 save 的状态 + SR 的 patchSr 写过的 sr 字段」。但 main 上次 save 是在 `judge()` 中（评卡时），那时 `mode=true` 且 `rounds.length=0`。本轮在 `endRound()` 内存里设的 `mode=false` / `rounds.push` / `state.weak` 全部被丢弃。

**修复**（v2.28）：
```js
function endRound(){
  var round = {...};
  var goal = state.streakToGoal || 3;
  // 1. 仅算 round 元数据（不动 state）
  Object.keys(state.done).forEach(function(k){
    if(state.done[k] === 'ok') round.ok++; else round.bad++;
  });
  // 2. SR 先写（patchSr）
  var doneSnapshot = Object.assign({}, state.done);
  __emmDispatch('endRound', round, doneSnapshot);
  // 3. reload 拿 SR 的 sr；再 apply 本轮 mutations
  state = loadState();
  state.mode = false;
  Object.keys(doneSnapshot).forEach(function(k){
    if(doneSnapshot[k] === 'ok'){
      if(state.weak[k]){ state.streak[k] = (state.streak[k] || 0) + 1; if(state.streak[k] >= goal){ delete state.weak[k]; delete state.streak[k]; delete state.done[k]; } }
    } else {
      state.weak[k] = true; state.streak[k] = 0;
    }
  });
  state.rounds.push(round);
  state.done = {};
  save(state);
  ...
}
```

关键改动：
- 把 `mode=false` / `rounds.push` / `weak[k]=true` 放在 `state = loadState()` **之后**
- `doneSnapshot` 用快照传给 SR，避免 SR IIFE 读到 main 已经清空的 `state.done`
- 旧测试 `sr-runtime.test.mjs` 通过：state.sr 仍由 SR IIFE 写入，state.rounds/weak 由 main 在 loadState 之后写入

### 3.2 `bin/build-samples.mjs` 多句插入 bug

**症状**：
- 重新生成的 `tests/samples/*.html` 只有 1 个 `.sent`（应是 10 个）
- `verify-plan.mjs` 报「句数=1」

**根因**：
原脚本用 `replace(sentBlockRe, ...)` 加计数器，只替换前 N 个匹配。但模板只有 1 个 `.sent` 占位，所以只命中 1 次。

**修复**（v2.28）：
```js
// 模板只含 1 个 .sent 占位，按 fillFirstN 复制替换
const sentBlockRe = /<div class="sent">[\s\S]*?<\/div>\s*<\/div>/;
const placeholderMatch = html.match(sentBlockRe);
if (placeholderMatch){
  const replacement = sents.slice(0, fillFirstN).join('\n');
  html = html.replace(sentBlockRe, replacement);
}
```

---

## 4. 何时跑 e2e

| 时机 | 命令 | 目的 |
|---|---|---|
| 本地开发 | `node bin/e2e-flow.mjs` | 快速验证用户流不破 |
| CI | `npm test`（自动跑） | 35/35 必绿 |
| 跨样本验证 | `node bin/e2e-flow.mjs --sample ai` | 跑议论文样本 |
| 调试单个断言 | 在 `bin/e2e-flow.mjs` 加 `console.log` | step 函数已分级打印 |
| 严格模式 | `node bin/e2e-flow.mjs --strict` | 任意步骤失败 → exit 1 |

---

## 5. 与其它测试的关系

| 测试 | 范围 | 数量 |
|---|---|---|
| `tests/smoke.test.js` | 静态/单步功能 | 144 |
| `tests/fold-runtime.test.mjs` | 首屏折叠 IIFE | 12 |
| `tests/shadow-runtime.test.mjs` | 影子跟读 IIFE | 24 |
| `tests/sr-runtime.test.mjs` | SM-2 算法 IIFE | 41 |
| `tests/research-schema.test.mjs` | 研究协议 JSON Schema | 74 |
| `tests/today-segment.test.mjs` | 今日任务段间切换 | 10 |
| `tests/export-import.test.mjs` | 导出/导入单步 | 20 |
| `tests/qa-v222.test.mjs` ... `qa-v226.test.mjs` | 各版本功能验证 | 23+17+9+18+8 = 75 |
| `tests/browser-compat.test.mjs` | 浏览器 API 矩阵 | 37 |
| **`tests/e2e.test.mjs`** | **完整用户流（35 步）** | **35** |
| **合计** | | **472** |

e2e 是唯一跑「多步交互序列」的测试，能在 PR 阶段发现 unit 测试漏掉的"按钮链式触发"型 bug（如 §3.1）。

---

## 6. 不在 e2e 范围内（已知边界）

| 不测 | 原因 | 替代验证 |
|---|---|---|
| 真实麦克风录音 | jsdom 不支持 `MediaRecorder` | v2.19 影子跟读单测（24 项） |
| 真实 TTS 朗读 | jsdom 不实现 `speechSynthesis.speak` | v2.19 单元测试覆盖 try/catch |
| 真实 localStorage 配额 | jsdom 内存无限 | v2.21 save 错误路径单元测试 |
| 跨浏览器差异 | jsdom 单内核 | `bin/check-browser-compat.mjs` 静态矩阵 |
| 真实 60s 倒计时 | jsdom 时间不真实 | v2.25 段落测试单测（18 项） |
| 完整 verify-plan content 校验 | e2e 是 JS runtime，不是 content | `npm run verify:fixture` |

---

## 7. 何时更新 e2e

| 触发 | 操作 |
|---|---|
| 新增 UI 按钮 | 在 `bin/e2e-flow.mjs` 加对应步骤 + `step()` 断言 |
| 新增 state 字段 | 在 §C 导出/导入节追加断言（JSON 必须含新字段） |
| 新增 IIFE 模块 | 加 `__emmDispatch` 钩子验证 + state 字段断言 |
| 端到端 bug 报告 | 先在 `bin/e2e-flow.mjs` 复现，再在主 IIFE 修复，最后更新本档 |

---

> **修订记录**
> - v0.1（2026-10-03）：初版 — v2.28 配套文档。揭示并修复 2 个 bug：endRound 持久化 + build-samples 多句插入。

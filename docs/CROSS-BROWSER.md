# 跨浏览器兼容性 · English Memory Method

> **目的**：把所有用到的 Web API 在 4 大浏览器（Chrome / Firefox / Safari / Edge）的支持情况摸清，列出已知 bug 与缓解策略。
> **配套工具**：`bin/check-browser-compat.mjs` 静态扫描模板，给出 ⚠ / ✅ 报告（`--strict` 模式有 ⚠ 时退出码 1，CI 友好）。
> **截止日期**：2026-10 截至。

---

## 1. 当前 API 兼容性总览

**运行 `node bin/check-browser-compat.mjs` 可重新生成完整报告。** 下面是核心要点：

### 1.1 4 大浏览器全部支持（✅ / ✅ / ✅ / ✅）

| API | 用途 | 最低版本 |
|---|---|---|
| `Blob` | 下载导出 JSON | 全版本 |
| `FileReader` | 导入 JSON | 全版本 |
| `URL.createObjectURL` / `revokeObjectURL` | 下载 + 录音回放 | 全版本 |
| `Intl.DateTimeFormat` | `.ics` 时区检测 | 全版本 |
| `localStorage` | 进度持久化 | 全版本 |
| `Promise` | async/await | 全版本 |
| `scrollIntoView({behavior:'smooth'})` | 跳转 | 全版本（Safari < 14 silent fallback） |
| `MutationObserver` | DOM 观察 | 无计划使用 |
| `Object.assign` / `keys` / `values` | 状态合并 | 全版本 |
| `JSON.parse` / `stringify` | 数据序列化 | 全版本 |
| `padStart` | 日期填充 | Safari 10+ |
| `Array.includes` / `find` | 数组操作 | 全版本 |
| `querySelector` / `querySelectorAll` | DOM 查询 | 全版本 |
| `getElementById` / `createElement` | DOM 操作 | 全版本 |
| `appendChild` / `removeChild` / `insertBefore` | DOM 操作 | 全版本 |
| `setAttribute` / `getAttribute` | 属性 | 全版本 |
| `Date.now` / `Math.*` | 时间/数学 | 全版本 |
| `addEventListener` / `setTimeout` / `setInterval` | 事件/定时 | 全版本 |

### 1.2 兼容性有限制（⚠ 部分版本支持）

| API | Chrome | Firefox | Safari | Edge | 已应用缓解 |
|---|---|---|---|---|---|
| `speechSynthesis` / `SpeechSynthesisUtterance` | ✅ 33+ | ⚠ 49+ voices 列表可能为空 | ✅ 7+ | ✅ 79+ | `speak()` 用 try/catch；Firefox 空 voices 时静默降级到手动朗读（见 v2.19） |
| `MediaRecorder` | ✅ 47+ | ✅ 25+ | ⚠ iOS 14.1+ 才支持 | ✅ 79+ | 用户首次点 🎤 时探测，不支持则 alert 降级到手动自评（v2.19） |
| `getUserMedia` | ✅ 53+ | ✅ 36+ | ⚠ HTTPS only | ✅ 12+ | `MediaRecorder` 失败统一 catch，无需单独处理 |
| `confirm` / `alert` | ✅ | ✅ | ⚠ iOS popup blocking | ✅ | iOS Safari 禁用 popup 后会静默；用户首次手势触发后才能弹。建议未来用 DOM 自制确认 UI |

### 1.3 已知差异与缓解

| 差异 | 影响 | 缓解（已实现 / 待办） |
|---|---|---|
| **localStorage 配额**：Chrome 5MB / Firefox 10MB / Edge 10MB / Safari ≤5MB | 超量 → `setItem` 抛 `QuotaExceededError` | ✅ v2.21 所有 `save(state)` 用 try/catch |
| **Safari < 14 scrollIntoView**：接受 `options` 但不 smooth-scroll | 跳转看起来"瞬间"而非滚动 | ✅ 用 `behavior: 'smooth'`，浏览器自动 fallback |
| **Firefox speechSynthesis voices 列表可能为空** | TTS 不发声但无报错 | ✅ `speak()` 用 try/catch 包，超时不报错 |
| **iOS Safari popup blocking**：首次手势前不能弹 confirm | 备份提醒 / 重置确认等可能失效 | ⏳ 待办：未来改用 DOM 自制确认 UI |
| **Safari file:// 协议**：HTTPS 检查更严 | getUserMedia 必须 https（除 localhost） | ✅ MediaRecorder 失败统一降级 |
| **iOS Safari `100vh` 含底栏**：viewport 高度计算 | 折叠 / 吸顶位置可能偏差 | ✅ 用 `100dvh` 渐进增强 |
| **`<details>` 元素**：Safari < 17 默认三角符号不同 | 挖空答案的折叠样式 | ✅ 用户体验差异，不影响功能 |

---

## 2. 已知 bug 与根因

### 2.1 "Firefox 录音按钮点了没反应"
- **症状**：🎤 录音按钮失效，无 alert
- **根因**：Firefox < 49 完全不支持 `MediaRecorder`，无对应 `navigator.mediaDevices`；Firefox ≥ 70 应该正常
- **缓解**：✅ v2.19 在 `MediaRecorder` 初始化外加 try/catch，失败时弹 `alert('Microphone not available')`

### 2.2 "Safari iOS 点击卡顿"
- **症状**：200ms 延迟响应点击
- **根因**：Safari iOS 移动端默认 300ms tap delay
- **缓解**：建议在 HTML `<head>` 加 `<meta name="viewport" content="width=device-width">`，已实现

### 2.3 "Edge 旧版 `alert` 样式奇怪"
- **症状**：EdgeHTML（已停用）下 alert 是黑色 dialog
- **根因**：旧版 Edge 用自己的 UI 而非浏览器原生
- **缓解**：仅影响 2020 年前的 EdgeHTML；新 Edge（Chromium 内核）已统一

### 2.4 "Safari popup blocking 导致 confirm 失效"
- **症状**：iOS Safari 用户在 `confirm()` 调用时无反应
- **根因**：iOS Safari 默认阻止 popup，必须用户首次交互后才能弹
- **缓解**：✅ `confirm()` 在多数操作后才调，用户必然已交互；备份提醒/重置确认会生效。

### 2.5 "Chrome Incognito localStorage 容量更小"
- **症状**：Incognito 模式 Chrome 突然不能保存
- **根因**：Chrome Incognito localStorage 隔离并限制更严
- **缓解**：用户应在普通模式使用；可在备份提醒加一句提示

### 2.6 "Firefox Date.toLocaleString 跨日区不同"
- **症状**：同一日期字符串 Firefox vs Chrome 显示不同
- **根因**：Date.toLocaleString 使用系统 locale
- **缓解**：✅ 不用 toLocaleString，统一手写 `YYYY-MM-DD` 格式（v2.22 改 UTC）

### 2.7 "Safari `date` input 格式"
- **症状**：`<input type="date">` 在 Safari 旧版格式不同
- **根因**：Safari < 14 不支持 `type="date"`
- **缓解**：✅ 用 `<input type="text">` 接受 `YYYY-MM-DD` 字符串（手写验证）

---

## 3. Playwright 跨浏览器集成（待启用）

> **状态**：本仓库目前**未集成** Playwright（避免安装 200MB+ 浏览器二进制污染仓库）。下面是启用步骤。

### 3.1 安装 Playwright（用户自行执行）

```bash
npm i --save-dev @playwright/test
npx playwright install --with-deps chromium firefox webkit
```

> 这一步会下载 ~500MB 浏览器二进制，建议在 CI 环境执行而不进 git。

### 3.2 配置文件（参考）

`playwright.config.js`：

```js
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://localhost:4173',
  },
  webServer: {
    command: 'npm run preview',
    port: 4173,
    reuseExistingServer: !process.env.CI,
    timeout: 30000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox',  use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit',   use: { ...devices['Desktop Safari'] } },
    { name: 'edge',     use: { channel: 'msedge', ...devices['Desktop Edge'] } },
  ],
});
```

### 3.3 测试样板（`tests/browser/cross-browser.spec.mjs`）

```js
import { test, expect } from '@playwright/test';

test.describe('EMM 跨浏览器核心路径', () => {
  test('方案页加载 + 打卡按钮 + 仪表盘', async ({ page }) => {
    await page.goto('/tests/samples/getty-memorialization-plan.html');
    await expect(page.locator('.rv-bar')).toBeVisible();
    await expect(page.locator('.rv-today-go')).toContainText('今天先做这个');
    await expect(page.locator('.rv-segtest')).toBeVisible();
    await expect(page.locator('.rv-goal')).toContainText('连顺 3 轮');
  });

  test('打卡流程：开启 → 评卡 → 结束', async ({ page }) => {
    await page.goto('/tests/samples/getty-memorialization-plan.html');
    await page.locator('.rv-round').click();
    await page.locator('.rv-judge [data-v=ok]').first().click();
    await page.locator('.rv-round').click(); // 结束本轮
    await expect(page.locator('.rv-dash')).toContainText('已完成 1 轮');
  });

  test('导出 JSON 按钮：触发下载', async ({ page }) => {
    await page.goto('/tests/samples/getty-memorialization-plan.html');
    const dl = page.waitForEvent('download');
    await page.locator('.rv-export').click();
    const download = await dl;
    expect(download.suggestedFilename()).toMatch(/emm-progress-.*\.json$/);
  });
});
```

### 3.4 关键跨浏览器差异检查

| 测试 | Chrome | Firefox | Safari | Edge |
|---|---|---|---|---|
| speechSynthesis 存在 | ✅ | ⚠ | ✅ | ✅ |
| MediaRecorder 存在 | ✅ | ✅ | ⚠ iOS 14.1+ | ✅ |
| localStorage 5MB 可写 | ✅ | ✅ | ✅ | ✅ |
| Promise.allSettled | ✅ | ✅ | ✅ ≥ 12 | ✅ |
| scrollIntoView smooth | ✅ | ✅ | ✅ ≥ 14 | ✅ |

### 3.5 何时启用？

- ✅ 启用时机：CI 升级到 GitHub Actions 后，本仓库 issue tracker 出现"某浏览器异常"
- ❌ 不需要启用：当前静态扫描 + jsdom 测试 + 浏览器手动 preview 已能覆盖大部分差异

---

## 4. 浏览器手动测试 checklist

| 测试项 | Chrome | Safari | Firefox |
|---|---|---|---|
| 打开 `tests/samples/getty-memorialization-plan.html` | ✅ | ✅ | ✅ |
| 点 🔁 复习打卡条上所有按钮 | ✅ | ✅ | ✅ |
| 影子跟读 🎙️ 录音（麦克风权限） | ✅ | ⚠ iOS 14.1+ | ⚠ Firefox 49-69 |
| 影子跟读词按钮 ✓/✗/重置 | ✅ | ✅ | ✅ |
| 阶梯 L1-L5 按钮点击 | ✅ | ✅ | ✅ |
| 今日任务卡"📌 设为今天" | ✅ | ✅ | ✅ |
| 段落测试 60 秒倒计时 | ✅ | ✅ | ✅ |
| 一键回原方案补打卡（?jump=） | ✅ | ✅ | ✅ |
| 导出 / 导入 JSON | ✅ | ✅ | ✅ |
| 备份提醒（>30 天未打开） | ✅ | ✅ | ✅ |
| 阶梯渐进引导（未 L1 时 L2-L5 disabled） | ✅ | ✅ | ✅ |
| 章节命名精简（无嵌套括号） | ✅ | ✅ | ✅ |
| 记忆库 4 个 chip 筛选 | ✅ | ✅ | ✅ |
| 段落测试时钟 60 → 0 | ✅ | ✅ | ✅ |
| 章节折叠 + on-boarding | ✅ | ✅ | ✅ |

---

## 5. 报告输出示例

```
$ node bin/check-browser-compat.mjs
english-memory-method · 跨浏览器 API 兼容性报告
======================================================================
扫描到 43 个 API（plan=41, lib=18）
...
⚠ 有 5 个 API 跨浏览器有限制/兼容性差 — 见上方备注
   缓解策略：
   - speechSynthesis / getVoices：用 try/catch 包裹（v2.19 已实现）
   - MediaRecorder / getUserMedia：失败时弹 alert 降级到手动（v2.19 已实现）
   ...
```

```
$ node bin/check-browser-compat.mjs --strict  # CI 用，有问题即退码 1
```

---

## 6. 何时更新本文档

| 触发 | 操作 |
|---|---|
| 模板新增 Web API | 更新 §1.1 + §1.2，跑 `node bin/check-browser-compat.mjs` 验证 |
| 用户报告新浏览器异常 | 增补 §2 已知 bug + §3 Playwright 测试 |
| Playwright 启用后 | 把 §3 测试样板移到 `tests/browser/cross-browser.spec.mjs` |

---

> **修订记录**
> - v0.1（2026-10-02）：初版 — v2.27 配套文档
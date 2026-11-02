
/* ===== v2.21 EMM_PROGRESS_V221: 进度导出/导入 + 段间切换 =====
   设计：exportProgress / importProgress / setAsToday 都嵌入 main IIFE（§v2.20 之前定义），
   本节仅作为锚点标记，不引入新代码。 */

/* ===== v2.22 EMM_QA_V222: 工程卫生大礼包 =====
   设计：所有改动嵌入 main IIFE（icsDate 增 UTC 格式、init() 备份提醒、renderToday 阶梯渐进引导），
   本节仅作为锚点标记，不引入新代码。 */

/* ===== v2.23 EMM_QUALITY_V223: 内容质量大礼包 =====
   设计：按段统计在 renderDash 加表格、?check=1 在 selfCheck 加 3 项可疑检查、模式向导在 SKILL.md Step 0。 */

/* ===== v2.25 EMM_ASSESS_V225: 评估优化 =====
   设计：startSegTest 60 秒倒计时 + finishSegTest 批改评分 + rv-goal 切换 2/3/4/5 + state.streakToGoal。 */

/* ===== v2.26 EMM_FIXTURE_V226: 工程卫生 =====
   设计：bin/sync-fixtures.mjs（独立工具）从真实生成方案回填 fixture-success.html。
   本节仅作为锚点标记，不引入新代码。 */

/* ===== v2.27 EMM_BROWSER_V227: 跨浏览器测试矩阵 =====
   设计：bin/check-browser-compat.mjs（独立工具）静态扫描模板用到的 Web API，
   对照 Chrome/Firefox/Safari/Edge 兼容性矩阵。docs/CROSS-BROWSER.md 配档。
   本节仅作为锚点标记，不引入新代码。 */

/* ===== v2.28 EMM_E2E_V228: 端到端测试 =====
   设计：bin/e2e-flow.mjs（独立工具）在 jsdom 里完整跑 35 步用户流。
   顺带修复 endRound() 持久化 bug + build-samples.mjs 多句插入 bug。
   配档 docs/E2E.md。
   本节仅作为锚点标记，不引入新代码。 */

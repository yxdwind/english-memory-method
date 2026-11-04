# Changelog · english-memory-method

> 本文件收录 `SKILL.md` 的版本来历、CI 自检标识(`EMM_*`)与历史 bug 修复记录。
> `SKILL.md` 正文已于 v2.28.2 后"剥离变更日志"——只保留行为规则,版本噪音迁出至此,以减少生成上下文占用。
> 章节编号以 `assets/plan-template.html` 的 h2 顺序为唯一真相源(记忆钩子=15 / 复述技巧包=16 / 记忆宫殿=17)。

## [2.35.0] (性能边界守护：100 句样本 · 2026-11-04)
- **100 句边界样本**：`bin/build-samples.mjs` 新增第三个样本 `boundary-100-plan.html`——确定性生成的 5 段 × 20 句合成文章（100 个 .sent 块 + 挖空节），幂等可重跑，纳入 qa-v222 幂等快照清单。
- **性能门禁** `tests/perf-boundary.test.mjs`（5 项）：结构完整（100 块）/ 体积上限（实测 178 KB，上限 1.5 MB）/ 构建职责内占位符零残留（装饰性占位符按 v2.28.2 约定保留）/ jsdom 全量渲染后 DOM 100 句齐全 / 渲染+脚本求值耗时阈值。真实浏览器实测：全页加载 357ms、1178 DOM 节点、TTFB 32ms，无病态行为。
- **测试**：总测试数 **647**（+5，22 套件）。

## [2.34.2] (readme.en 非功能表对齐 · 2026-11-02)
- 研究员全文比对后修正英文版 9 处历史漂移：顶部导语旧句残留拼接、触发语丢第二触发词、工作原理主表与演讲稿表 5 处细节丢失（逐句三层/先填后核对/逐句放行/6 问自问自答/朗读要点）、两个样例行（葛底斯堡链接 + 独立宣言尾注）、版本历史 6 处区间方向与中文相反、v2.8.0 宫殿路线方向、v2.17.0 丢轻刷括注。
- 删除英文版独有的两段过时残留（Quality gates/Memory-friendly，内容已由功能表覆盖且含 "core 4 sections only" 失实旧表述）与 1 个孤儿分组头。总测试数 **642**（不变）。

## [2.34.1] (行尾统一 LF · 2026-11-02)
- **产物行尾对齐仓库约定**：library 产物不再保留历史 CRLF——builder 去除 LF→CRLF 转换，src 与产物全链路 LF，与 `.gitattributes`（`* text=auto eol=lf`，v2.28.2 起）一致。此前磁盘 CRLF 仅因 git 只在 checkout 时改写工作副本而存在，任何新 clone 都会得到 LF 产物并触发 drift gate 误报；本次一并消除。
- samples/fixtures 由 build-samples + sync-fixtures 随模板行尾自然刷新，内容不变。总测试数 **642**（不变）。

## [2.34.0] (架构体检收官：library 接入进度存储契约 · 2026-11-02)
- **library 接入 EMMProgressStore**：`bin/build-template.mjs` 将 `src/plan/scripts/00-store.js` 内 `EMM_STORE_V232` 锚点字面量替换为 `EMM_STORE` 后注入 library 产物为第 1 个脚本块（锚点保持 plan 单点）；library 的 `progKey/readProgress` 改为字符串键形态（keyArg）委托——`readProgress = loadRaw(progKey(article))`，缺失/损坏返回 null 的语义不变。
- **行尾策略**：src/library 源码统一 LF（符合仓库 eol=lf 约定），builder 组装 library 产物时统一 LF→CRLF，历史产物行尾保持不变。
- **测试**：smoke 新增 3 项（library 双 script 块 / store 先于主脚本 / 锚点剥离），template-build 计数更新（library 2 块），总测试数 **642**。

## [2.33.0] (架构体检第五批：library-template 源码拆分 · 2026-11-02)
- **library-template 源码拆分（src/library/）**：40KB 单体源码变为 5 个模块——00-head.html、css/main.css、01-body.html、scripts/01-lib.js（主 IIFE + schema 注释，单词法作用域原样保留）、99-tail.html；`bin/build-template.mjs` 扩展为**双模板构建器**（plan + library 各自双写 assets/ 与 skills/ 副本，--check 同时校验两份）。纯机械拆分：build(源码) === 原 artifact 字节级一致（CRLF 行尾原样保留），断言零改动。其 progKey/readProgress 接入 EMMProgressStore（keyArg 字符串形态）与内部模块化（vocab/todayall 独立 module）留待行为性批次——单词法作用域拆分需先重构作用域链。
- **测试**：template-build 扩至 8 项（library 模块齐全/单 script 块/双副本），总测试数 **639**。

## [2.32.0] (架构体检第四批：进度存储契约收敛 · 2026-11-01)
- **新增 src/plan/scripts/00-store.js（EMM_STORE_V232）**：进度存储契约唯一实现——键派生（字面量全模板唯一）与 load/loadRaw/save/patch（参数双形态：doc 或完整键，library 批接入用）；main IIFE 的 keyOf/save/loadState 首行、SR IIFE 的 getH1/keyOf/loadProgress/patchSr/patchSrMode、shadow IIFE 的 getH1/keyOf/loadProgress/saveProgress 全部改为同签名薄委托，调用点零改动。此前同一契约在模板内复制 3 份（体检 #2 证据），漂移只能靠人肉比对。
- **块顺序**：store 块插为第 1 个脚本块（先于 main IIFE），产物 script 块 6→7；template-build 断言同步。
- **测试**：新增 qa-v232 10 项，总测试数 **636**。

## [2.31.0] (架构体检第三批：源码单体拆分 · 2026-11-01)
- **plan-template 源码拆分（src/plan/）**：单体的源码布局变为 10 个模块——00-head.html（doctype+用法注释+head 开）、css/main.css、01-body.html（17 节骨架+占位符）、scripts/01-main·02-sr·03-shadow·04-fold·05-onboard·06-markers.js、99-tail.html；`bin/build-template.mjs` 按序拼装并**双写 assets/ 与 skills/ 副本**（手动 Copy-Item 同步步骤退役）。Phase 1 为纯机械拆分：build(源码) === 原 artifact 字节级一致，621 项断言零改动全绿——交付物仍是单文件零依赖，产品承诺不变。
- **新增 tests/template-build.test.mjs 漂移 gate**：重建产物必须与已提交 artifact 逐字节一致——改 src/ 忘构建、或直接手改产物，都会被拦下。
- **测试**：新增 template-build 5 项，总测试数 **626**。
- library-template 拆分与 progress-store 整合（体检 #2）留待下一批，在新布局上进行。

## [2.30.3] (架构体检第二批：测试 harness 收敛 · 2026-11-01)
- **新增 tests/helpers/boot.mjs 共享 harness**：quietConsole / PLAN_TEMPLATE / LIB_TEMPLATE / scriptBlocks / evalAllScripts / tick / dstr / progKeyOfDoc / FakeSR+resetSR / fillLib / bootLib / bootCore（JSDOM 装配 + URL/TTS/SR/录音 mock + alert/confirm + 下载捕获 + preload + wrap 注入 + eval 策略参数化）——11 个 .mjs 套件的复制粘贴 harness 收敛为一个 deep module，各文件 boot() 退化为几行本地组装。行为保持型重构：断言零改动，通过数逐文件比对一致；smoke.test.js（CJS 旧套件）保留自带 harness 不迁移。
- **测试**：总测试数 **621**（不变，重构零新增断言）。

## [2.30.2] (架构体检第一批：锚点清单自动生成 + 文档一致性 gate · 2026-10-31)
- **version-check 锚点清单改为扫描生成**：删除 23 条手写 ANCHOR_TABLE（与模板构成两条真相，10-31 体检险情：改 library 头部注释时 EMM_UX_V224 唯一出现被误删）——现扫描两个模板中的 EMM_*_V\d{3}（兼容 EMM_V215_STABLE 式后缀），版本号从锚点名解析（V213→2.13.0），"每个锚点恰好 1 次"与"锚点版本 ≤ package.json"由扫描结果直接执行，新特性零注册。**上线即抓获历史悬案**：EMM_UX_V224 在 plan-template 残留化石标记（v2.28.2 手工改映射时遗留），已清除。
- **新增 tests/docs-sync.test.mjs 文档一致性 gate**：双语功能表行数一致、双语测试数一致且等于 CHANGELOG 最新条目、已知局限测试数一致、版本徽章 = package.json、章节徽章一致——双语 readme seam 首次有机器检查（10-16 曾实测 3 处漂移）。
- **测试**：新增 docs-sync 8 项，总测试数 **621**。

## [2.30.1] (在线样例 + 英文文档对齐 · 2026-10-16)
- **GitHub Pages 在线样例站**：新增 `bin/build-pages.mjs`（从 tests/samples 生成自包含落地页 + 复制样例，确定性输出，两次构建逐字一致）与 `.github/workflows/deploy-pages.yml`（push main 自动部署，workflow_dispatch 可手动触发）；双语 readme「快速开始」与功能表加在线体验入口。首次启用需在仓库 Settings → Pages 把 Source 设为 GitHub Actions。
- **readme.en 功能表对齐**：补齐与中文版差异的 10 行（长文模式 / SM-2 / 影子跟读 / 个人记忆库 / 自测三档 / 薄弱快刷 / 进度指纹 / 今日任务卡 / 自动化测试数 / 交付硬门禁），并同步新增「🌐 在线样例」行。
- **测试**：新增 tests/pages-build.test.mjs（8 项产物级断言，总测试数 613）。

## [2.30.0] (教学纵深三件套 · 2026-10-16)
- **发音自动评分（EMM_SPEECH_V230）**：影子跟读面板新增「🤖 自动评分」——浏览器 SpeechRecognition（Chrome/Edge，en-US）听用户朗读，转写与原句 LCS 逐词对齐后自动填 ✓/✗ 标注（复用现有词标注/保存/薄弱 ≥25% 通路，可手动修正后保存）；不支持时 alert 降级手动自评；能力横幅补「语音识别不可用」行。修复 v2.19 潜伏 bug：影子跟读保存最后一句时「全篇完成」分支引用未定义的 bar 导致报错（历史测试从未覆盖末句保存）。
- **记忆库「今日全局」排期条（EMM_TODAYALL_V230）**：书架上方聚合条——每篇显示 ▶ 新学中 Day x/y / 🔁 到期 n 句（读 state.sr.due）/ 🎯 薄弱数，预估单篇与总时长；按到期句数排序，>3 篇给错峰建议；精确到段的排期仍在各方案页今日任务卡。
- **跨方案生词本（EMM_VOCAB_V230）**：从各篇薄弱句的英文锚词提取候选，逐词确认入本（emm-vocab:v1），每词独立 SM-2 调度（与方案组件 srNext 同参数，✓=q4/✗=q2）；reps≥2 且 interval≥7 自动毕业；完成「句（方案）→ 篇（书架）→ 词（生词本）」粒度闭环。
- **测试与矩阵**：新增 tests/qa-v230.test.mjs（62 项运行时断言，总测试数 605）；check-browser-compat 矩阵新增 SpeechRecognition（⚠ Chrome/Edge 需网络，其余降级），已知警告 5→6；docs/CROSS-BROWSER.md 补条目。

## [2.29.1] (质量门禁收口 · 2026-10-16)
- **verify-plan 写入生成硬门禁**：`bin/verify-plan.mjs`（六条硬规则，qa-v222 已验证正向全绿/负向拦截）此前存在于 bin/ 但 SKILL.md「内容校验」0 次引用——生成端校验只靠人工逐条；现列为交付前**第 0 步**：退出码非 0 不得交付；无 node 环境降级 `?check=1` + 人工复核，不得静默省略。
- **跨浏览器进度隔离入档**：localStorage 按浏览器/Profile 隔离——换浏览器打开方案进度显示为空，不是丢失；官方迁移路径 = 方案页「💾 导出/📥 导入」JSON。readme 中英「已知局限」+ docs/CROSS-BROWSER.md §1.3/§2.8 新增条目 + 记忆库页头加固定提示行。
- **徽章与文档对齐**：readme.md / readme.en.md / README.md 徽章 `skill_sections-13` → **15**（章节早已 15/16/17 节，徽章停留在 13 节时代）；readme.en.md 版本历史分组排序修正（v2.28.2 先于 v2.28.1）、功能表「14-section」→ 15-section。

## [2.29.0] (入门减负 + L2/L3 兜底 · 2026-10-12)
- **3 步快背入口（EMM_QUICK3_V229）**：HTML 方案首屏（header 之后）自动注入「🚀 3 步快背」卡——听读 3 遍 → 钩子链过 2 轮 → 复述打卡毕业，每步带跳转按钮；回应评估 B.2「17 节认知门槛吓退新手」。
- **能力探测横幅（EMM_CAP_V229）**：加载时检测 speechSynthesis / MediaRecorder / getUserMedia / 安全上下文 / localStorage，不可用项以橙色横幅显式列出「受影响功能 + 替代做法」（听写→自读+挖空验证；影子跟读→手机录音+第 16 节录音自查法；存储→导出/导入 JSON），可按设备持久化关闭；取代此前的静默 try/catch 降级。
- **Anki/CSV 导出（EMM_ANKI_V229）**：复习条新增「🗂 Anki」按钮，导出挖空卡（带空句→答案）+ 复述卡（中文提示→英文原句）为带 Anki 头（#separator:Tab / #notetype:Basic）的 CSV；`buildCloze` 给输入框加 `data-ans` 属性供导出读取。
- **记忆宫殿路线引导（EMM_PALACE_V229）**：首次打开自动引导定义个人 25 站动线（每行一站名，存 localStorage，之后所有方案自动套用），第 17 节常驻「重新定义路线」入口，可一键恢复模板默认；回应评估 B.2「宫殿本身是前置元技能」。
- **L2/L3 Markdown 精简版规范**：SKILL.md 新增「平台能力分级与 Markdown 精简版」章节——L2/L3 环境禁交残缺 HTML，改交精简版（3 步快背 + 逐句钩子表 + 三层钩子链 + 复述阶梯 + 挖空 + 三遍法/艾宾浩斯表），交互类组件给口头替代法；platforms/README.md 加能力差异声明。回应评估 A.2「29% 平台体验缩水」。
- **离线发布包（可审计安装闭环）**：新增 `bin/build-release.mjs`（`npm run build:release`）——白名单收集 40 个发布文件，过发布门禁（版本一致性 + 副本同一性）后产出确定性 ZIP（store 模式 + Unix 权限位，同输入同字节）+ **双层 SHA256SUMS**（包内文件级 + dist 级 zip 哈希）；install.sh / install.ps1 新增**本地模式**（检测到自身位于发布包内即 `cp` 本地文件，全程不联网，`--remote` / `-Remote` 可强制联网）——readme 承诺过的「tarball 离线安装」路径此前实际断裂（安装器只会 curl），本次真正接通。回应评估 A.2 安全安装 + GFW。
- **图例补逻辑桥符号**：原文区图例条与 SKILL.md 标注规范同步加入 ⇒因果 / ↔转折 / →递进 / ＋并列 / :举例，降低非语言学用户的门槛。
- **修复**：v2.18 首屏折叠/on-boarding CSS 被误嵌套在 v2.16 的 `max-width:720px` 媒体查询内（桌面端折叠按钮与引导卡实际无样式）；模板页脚新增自动版本戳注入（JS，`v2.29.0`，RELEASE-CHECKLIST「版本水印」落地）。
- **工程卫生**：`skills/english-memory-method/SKILL.md` 漏同步造成 version-check「主副本一致性」失败（双源真相分叉，v2.28.3 restructure 引入）——已同步；CHANGELOG 条目格式统一为 `## [X.Y.Z]`（此前 version-check 与 e2e 的格式校验实际失效）；version-check 锚点表登记 EMM_QUICK3_V229 / EMM_CAP_V229 / EMM_ANKI_V229 / EMM_PALACE_V229（现 20 组锚点）；新增 `tests/qa-v229.test.mjs`（38 项运行时断言）；fold-runtime 改按锚点定位脚本块（不再假设"最后一个 script 块"——v2.29.0 追加新块曾致其失效，已修）；移除 `bin/_probe.mjs`（6300a48 restructure 遗留的一次性计数脚本，零引用，不再进发布包——发布包 41→40 项）。

## [2.28.3] (working-tree restructure · 未发布 / unreleased)
- **SKILL.md 章节编号统一**：补齐「方案章节权威顺序（唯一真相源）」表（对齐 `assets/plan-template.html` 的 h2 顺序）；修正三处陈旧硬编码章节号（记忆钩子 12/13→15、记忆宫殿 14→17、金句句型库 12→14、专业词汇 11→13、复述技巧包 7.5→16），消除「同文多次生成结构不一致」风险。
- **长文触发阈值统一**：Step 0 表与正文统一为 `>15 句 或 ≥3 段`；修正 Step 0 长文模式错挂的「4. 演讲骨架」→「3. 分段进度仪表」。
- **剥离变更日志**：删除 SKILL.md 内 `(v2.x.0)` 版本戳与 `生成自查:EMM_*` CI 自检尾注、历史溯源注，迁至本文件，减少生成上下文噪声。
- **readme 对齐**：「工作原理」主表章节号修正为 9–17（与演讲稿/长文表及模板一致）；新增「已知局限与适用边界」章节；本文件指针。
- **ANALYSIS.md 修正**：`13. 记忆钩子` → `15. 记忆钩子`（陈旧引用）。

## [2.28.2] (current)
- 当前线上版本。完整 17 节方案结构 + 21 平台分发。

## [2.28.1]
- 修复"双源真相破裂"——npm 用户曾拿到旧组件(多源分发版本漂移事故)。
- 加固 `</script` 截断检查(`memory-library.html` 中 `</script` 必须恰好出现 1 次,数据串内 `</` 一律写成 `<\/`)。

## [2.28.0] · 端到端测试
- `bin/e2e-flow.mjs` 在 jsdom 跑 35 步用户流,双样本均 35/35 全绿。
- 修复 2 bug:① `endRound()` 中 `state = loadState()` 在 mutations 之后导致丢失;② `build-samples.mjs` 只命中 1 个 `.sent` 占位。
- 配档 `docs/E2E.md`。**CI 自检标识:`EMM_E2E_V228`**(恰好一次,`npm run e2e` 双样本 35/35)。

## [2.27.0] · 跨浏览器测试矩阵
- `bin/check-browser-compat.mjs` 静态扫描 43 个 Web API,对照 4 浏览器兼容性矩阵。
- 配档 `docs/CROSS-BROWSER.md`(Firefox TTS 静默、iOS<14.1 禁录音、Safari `file://` 下 `getUserMedia` 失败等已知 bug)。
- **CI 自检标识:`EMM_BROWSER_V227`**(退出码 0 且警告数=5)。

## [2.26.0] · Fixture 同步
- `bin/sync-fixtures.mjs` 把真实生成方案同步到 `tests/fixtures/fixture-success.html`。
- **CI 自检标识:`EMM_FIXTURE_V226`**(`sync-fixtures --check` 退出码 0)。

## [2.25.0] · 评估优化
- 段落测试 60 秒 + 毕业阈值配置(连顺 N 轮 2/3/4/5)。
- **CI 自检标识:`EMM_ASSESS_V225`**(复习条 6 个新按钮齐全)。

## [2.24.0] · 学习路径优化
- 轻刷一键回原方案补打卡 + 记忆库状态筛选 chip + 「★ 今天先做这个」按钮。
- **CI 自检标识:`EMM_UX_V224`**。

## [2.23.0] · 内容质量大礼包
- Step 0 模式识别前置 + 按段统计 + `?check=1` 内容可疑项(IPA 含中文 / 连读覆盖率<50%)。
- **CI 自检标识:`EMM_QUALITY_V223`**(`?check=1` 自检含「─ 内容可疑项」节)。

## [2.22.0] · 工程卫生大礼包
- `bin/tag.mjs` 自动打 annotated tag + `.ics` 时区修复 + 备份提醒 + 章节命名精简 + 阶梯渐进引导。
- **CI 自检标识:`EMM_QA_V222`**(`npm run tag --dry-run` 返回正确 git 命令预览)。

## [2.21.0] · 进度迁移 + 段间切换
- 导出/导入进度(JSON)+ 段间切换「设为今天新学」+ `tests/samples/` 样例 + `bin/preview.mjs` 本地预览服务器。

## [2.20.0] · SM-2 算法升级
- 用 Wozniak 1990 SM-2 替代"连顺 2 轮毕业"固定阈值;轻量/标准模式切换。
- **CI 自检标识:`EMM_SR_V220`**(`__emmDispatch` 在 `judge()` 与 `endRound()` 各调用一次)。

## [2.19.0] · 影子跟读
- 对接"50 遍传统":TTS 播放 → `MediaRecorder` 录音 → 逐词自评;`try/catch` 包裹,不支持麦克风时降级。
- **CI 自检标识:`EMM_SHADOW_V219`**。

## [2.18.0] · 首屏折叠 + 首次访问 on-boarding
- 首屏 4 节核心,其余 h2≥9 折叠;`≡ 进阶内容` 浮动按钮;60 秒 5 步引导。
- **CI 自检标识:`EMM_FOLD_V218`**(localStorage 键名固定)。

## [2.17.0] · 个人记忆库
- `memory-library.html`(书架/搜索/轻刷/实时进度)。
- **CI 自检标识:`EMM_LIBRARY_V217`**。

## [2.16.0] · 移动端自适应
- 窄屏(≤720px)表格横向滚动、任务卡堆叠、工具条吸顶;桌面/打印零变化。
- **CI 自检标识:`EMM_MOBILE_V216`**。

## [2.15.0] · 稳健性补丁
- 进度内容指纹(重新生成检测变化)+ 宫殿 `data-sents` 标注 + 排期唯一归今日任务卡 + `npm test` 冒烟测试。
- **CI 自检标识:`EMM_V215_STABLE`**。

## [2.14.0] · 快刷与交互挖空
- 薄弱句快刷 + 挖空交互化(`______` 运行时转输入框,复用听写比对算法)。
- **CI 自检标识:`EMM_DRILL_CLOZE_V214`**(`emm-clz` 样式在)。

## [2.13.0] · 自测与排期套件
- 自测模式(遮译文/全遮)+ 📅 今日任务卡 + 复述阶梯追踪 + 亲手改造留白(生成效应)。
- **CI 自检标识:`EMM_TODAY_V213`**(`emm-quiz1` 样式在,`node --check` 通过)。

## [2.12.0] · 长文模式
- 500~2000 词或 >15 句自动启用,方案变 17 节:全局框架 + 按段展开(`4.1~4.N` 段落单元 + 分段进度仪表 + 跨段总链 + 宫殿跨段连续)。
- **样例:`declaration-memorization-plan.html`(独立宣言,5 段/21 句/~830 词)。**

## [2.11.0] · 演讲稿模式
- 演讲稿自动启用,新增第 3 节「演讲骨架(三幕结构)」,方案变 16 节。
- **样例:`gettysburg-memorization-plan.html`(葛底斯堡演说,三幕结构 + 三连否定 + 三介词排比)。**

## [2.10.0] · 金句句型库
- 每篇精选 5~8 条可复用句型(四列表格)。插在"专业词汇"之后,章节顺延。

## [2.9.0] · 听写验证模式
- 第 3 节逐句区顶部「🎧 听写模式」,浏览器 TTS 朗读 + 逐词比对(LCS)。
- **自检:组件脚本含 `v2.9.0 dictation` 标识、`buildDict` 恰好 2 处、`.rv-dict` 样式在。**

## [2.8.0] · 记忆宫殿层
- 第 17 节「记忆宫殿映射」,给钩子链加独立空间位置线索(25 站生活动线)。
- v2.8.1:修复「结束本轮」结算时同步标红/毕业同步取消、打开文件按存档恢复标红。

## [2.7.0] · 复习闭环
- 自包含复习组件(注入 `</body>` 前):句级打卡 + 薄弱句清单 + 轮次结算 + localStorage `emm-progress:<篇名>`。
- 自检:组件脚本恰好出现一次(`emm-progress` 标识)、`node --check` 语法通过。

## [2.6.0] · 三层钩子链
- 第 15 节「记忆钩子」= 文内语言钩 + 三层钩子链(段钩 / 句钩链+逻辑桥 / 英文锚点)。
- 生成自查四条:每段有链、每句有钩、每钩有桥、每钩有锚。

## [2.5.0] · 音标三地差异标注法
- 美式 IPA 默认;英音 `UK:`、印度英语 `IN:` 按系统特征标注。

## [2.2.0] · 专业词汇标记与梳理
- 判定标准(领域术语/超纲难词/AWL),行内 `<span class="term">`,章节梳理(构词拆解/音标/中文/记忆钩子)。

## v2.1 · 逐句翻译与全现象连读标注规范
- 三层块(.sent-en / .sent-zh / .pron)+ 行内标记体系(连读 ⌒ / 弱读 / flap t / h 击穿 / 缩读)+ 存疑不标。

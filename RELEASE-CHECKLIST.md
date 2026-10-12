# 发布检查单 / RELEASE-CHECKLIST

> 目的:根治 v2.28.1「双源真相破裂」类事故(多源分发下 `assets/` 与 `plugin.json` 版本不一致、npm 用户拿到旧组件),确保「一次构建、处处发布」时每份产物都带可识别版本戳,且 21 平台 / npm / 插件市场 / jsDelivr 多源一致。
> Goal: prevent multi-source version-drift incidents (e.g. v2.28.1) by enforcing a single-source-of-truth release gate with a visible version watermark on every artifact.

---

## 发版前必查(每次发布)

- [ ] **版本号六处同改且一致**
  - [ ] `SKILL.md` 顶部描述 / `description`
  - [ ] `assets/plan-template.html` 顶部版本注释(如 `v2.28.1 当前生效`)
  - [ ] `assets/library-template.html`(如适用)
  - [ ] `package.json`(npm 发版)
  - [ ] `plugin.json`(插件市场)
  - [ ] `readme.md` / `readme.en.md` 版本徽章
- [ ] **每份生成方案页脚渲染版本戳**(与模板顶部版本一致,如 `v2.28.2`),用户打开即见"我跑的是哪版"。
- [ ] **`version-check`(9 组一致性检查)全绿**:含 `plugin.json` 与主副本比对、`assets/` 与 SKILL 版本比对、记忆库 `EMM_*` 锚点比对。
- [ ] **多源产物比对**:`git` 主副本、`npm` 发布包、`插件市场` 包三者的 `SKILL.md` + `assets/` 字节一致(建议扩展 `bin/verify-plan.mjs` 做产物 diff)。
- [ ] **离线发布附件**:`npm run build:release` 产出 `dist/english-memory-method-vX.Y.Z.zip` + `dist/SHA256SUMS`(门禁不过会拒绝打包),两者作为附件上传 GitHub Release;抽查 `sha256sum -c` 双层校验通过、包内 `install.sh` 权限 0755。
- [ ] **变更日志**:本次改动已写入 `CHANGELOG.md`(保留历史 bug 修复记录与 `EMM_*` 自检锚点,便于回溯)。
- [ ] **国内可达性**:安装脚本源(jsDelivr / raw.githubusercontent)在目标网络下可下载;否则提供镜像或离线包。

## 安全敏感环境勾选

- [ ] 随包发布 `SHA256SUMS`,安装前可 `sha256sum -c SHA256SUMS` 校验完整性与来源。
- [ ] 文档含「先下载脚本 → 审阅 → 再运行」的可审计安装路径(见 readme 安装章节)。

## 回滚预案

- [ ] 保留上一版 git tag;发现版本漂移可 `git revert` + 重新发布,并同步通知 npm / 插件市场。

---

## 关联修复(已落地)

- SKILL.md「内容校验」新增第 7 项:**版本戳与 `</script` 截断防护**(方案页脚版本戳 + 记叙文裸 `</` 须落在 HTML 正文区、数据串中 `</` 写成 `<\/`)。
- SKILL.md 所有 `node --check` / `npm test` / `node -e` 校验均标注「无 node 环境」的浏览器 / 正则降级路径,避免"强制执行"形同虚设。
- `CHANGELOG.md` 已承接被剥离的版本史与 `EMM_*` 自检锚点。
- 演讲稿识别由"举例式"改为"规则式"(开场钩→论点展开→升华收尾三幕结构,或用户自述演讲稿/发言稿)。

# 验收报告 — dsh-left-sidebar 0.1.0

- 日期：2026-11-08
- 被测实例：`http://127.0.0.1:3199`（第二实例，pid 9588 起，独立于用户在用的 3179）
- DSH 版本：`0.2.2-rc.1`
- 插件加载方式：`bin.js plugin --profile web add link:C:\dsh\plugins\dsh-left-sidebar` + 手动写入 `dsh.profile.bundles`
- 构建产物：`client.js` 7993 B，SHA256 前 16 位 `5E7C5D24FCD4CBE9`
- 单测：`node --test test/` → **20 pass / 0 fail**

所有断言的取数方式均为浏览器内 `getComputedStyle` / `getBoundingClientRect` / `localStorage` / 文件系统读取，非目测。

## 逐项结论

| 项 | 内容 | 结果 | 实测证据 |
| --- | --- | --- | --- |
| V1 | 展开态插件区 5 列 | 通过 | `display:"grid"`、`gridTemplateColumns:"49.5938px 49.5938px 49.5938px 49.5938px 49.5938px"`、`navHeight:302 → 72`、`navWidth:264` |
| V2 | 单元格尺寸与不拉伸 | 通过 | 8 格全部 `50×34`；`left` 依次 8/62/115/169/222，第 2 行回到 8/62/115；两行 `top` 144 与 182（间距 38）；第 8 格仍为原始宽度，未被拉伸 |
| V3 | 悬停标题 | 通过 | `::after` 的 `content` 解析为带引号 `aria-label`（`"插件"`、`"更多"` 等）；`font-size:12px`、`background:rgb(44,44,46)`、`display:block`、默认 `opacity:0`；首列格 `left:"0px"`、末列格 `right:"0px"`（气泡不出界） |
| V4 | 收起态零影响 | 通过 | 收起后 `display:"flex"`、`navWidth:36`、`navHeight:372`、每格 `36×36`、`panelTitle` 不存在；`wide → rail → wide` 往返后无需刷新自动回到 `display:"grid"` / `navHeight:72` |
| V5 | 三层结构 | 通过 | `localStorage["dsh.workspace.view.v5"].groupBy === "workspace-tree"`；DOM 出现 `groupSection` 嵌套：`dsh_workdir` 的 `childSections:2`，子节 `dida-task-local` / `plugins` 的 `--dsh-workspace-indent:12px`，顶层为 `0px` |
| V6 | 默认全折叠 | 通过 | 清 `dsh-left-sidebar.seeded` + 重置 `groupBy:"workspace"`、`groupExpansion:{}` 后 reload 2.5s：`groupExpansion` 7 个键全部 `false`、`expandedCount:0`、`collapsedCount:7`、可见行 4 个项目行 + **0 个会话行** |
| V7 | 不覆盖用户选择 | 通过 | 手动展开 `dsh_workdir` → 键变 `true` → reload 后仍 `true`，`seeded` 保持 `"1"`（不再播种） |
| V8 | 每层 `...` | 通过 | 工作区行按钮 `aria-label='工作区"X"的操作'`、会话行 `aria-label='会话"X"的操作'`；点击后新增 1 个 `[role="menu"]`，工作区菜单含 `重命名/在文件夹显示/删除工作区`，会话菜单含 `置顶会话/重命名/分叉会话/复制 Session ID/在文件夹显示/归档会话/记忆参与`；未分组行无 `...`（官方行为） |
| V9 | 拖拽排序并持久化 | 通过 | 对 `groupSection` 派发 `dragenter/dragover/drop`：`dsh_workdir` 拖到 `默认工作区` 之前 → DOM 顺序改变；`workspace.json` 的 `global.workspaceIds` 同步改变；reload 后 DOM 顺序与文件一致。测完已把顺序拖回原始状态 |
| V10 | 降级不炸页面 | 通过 | 把注入 CSS 里的 `nav[class*="panelList"]` 改成 `nav[class*="panelListBROKEN"]` → `display:"flex"`、`navHeight:302`、页面 `pageBlank:false`、无报错；写回原文立即恢复 `grid` / 72 |

## 与设计文档的偏差

1. **`groupBy` 与折叠只在首次启用时播种一次**（用户选定的 A 方案）。之后用户在 View options 里改回 `WorkSpace` 不会被插件纠正。
2. **首次播种后当前会话也不可见**。官方有个 effect 会强制展开「当前会话所在组」，但它的条件是 `!Object.hasOwn(groupExpansion, currentGroup)` —— 我们把每个键都写成了 `false`，所以该 effect 不再触发。这是 G3（第一屏只有项目行）的直接代价，登记为已裁定的取舍，不作修复。
3. **单元测试数量**：计划里写「10 个用例」，实际 20 个（implementer 补了 view 相关 5 例 + lead 补了 Task 4 的 3 个选择器断言 + 1 例相对选择器）。以「全部 PASS」为验收标准。
4. **`esbuild` 版本**：计划写 `^0.25.0`，实际装到 `0.26.0`，API 无差异。
5. **`pnpm why` 对 `link:` 依赖不可达**（输出 0 字节），改用 `client.js` 产物哈希 + 页面内 style 标签存在性作为安装验证。

## 未覆盖 / 已知风险

- **桌面壳（DshDesktop）未实测**。`dsh.compatibility.profiles` 只声明 `web`。桌面壳走 Windows titlebar 分支，其收起态官方 CSS 是 `display:none`，本插件用 `:not([class*="collapsed"])` 作用域能避开，但无实测证据。
- **依赖两个未公开接口**：`ctx.get("uiWorkspace").view.setGroupBy` / `setGroupExpanded`。DSH 升级后若移除，插件 `console.warn` 一次并跳过多层与折叠，5 列网格照常工作（降级路径已在单测里覆盖）。
- **`localStorage` 键名带版本号**（`dsh.workspace.view.v5`）。DSH 升到 v6 时读不到，播种会降级为「不写折叠」；需要同步改 `src/view.js` 的常量。
- **第二层只认已注册工作区**：`owningParentFolder` 大小写敏感，跳过未注册的中间目录（深度被压缩，但不会塌成两层）。

## 终态复跑（提交 `1d6f5f7` 之后，干净状态）

把 `localStorage["dsh.workspace.view.v5"]` 重置为 `{groupBy:"workspace",groupExpansion:{},orderBy:"updated",sessionOrderByAccount:{},archivedFilter:"default"}`、删掉 `dsh-left-sidebar.seeded`，然后 reload：

- `groupBy:"workspace-tree"`、`seeded:"1"`、`groupExpansion` 7 个键全部 `false`；
- 侧边栏（需先点开，因为刷新后回到 rail 态）展开到 280px 后，可见行 **4 个项目行 + 0 个会话行**，全部 `aria-expanded:"false"`；
- 面板列表 `display:"grid"`、`gridTemplateColumns:49.5938px ×5`、`navWidth:264`、`navHeight:72`、`childCount:8`；
- 8 格全部 `50×34`，`left` 依次 8/62/115/169/222/8/62/115，两行 `top` 144 与 182；
- 第 8 格 `tag:"SPAN"`（label「更多」），其 `::after` 也正常（`content:"更多"`、`display:block`、`left:24.7969px`）；
- 首列格 `::after { left:"0px" }`、末列格 `::after { right:"0px" }` —— 气泡不出界。

→ V1/V2/V3/V5/V6 在最终代码上再次通过。拖拽排序测完后已把 `global.workspaceIds` 恢复成原始顺序（`dsh → 知识学习 → dida-task-local → default-workspace → dsh_workdir → plugins`）。

## 修掉的误报（`src/client.js` + `src/selectors.js`）

第一次干净复跑时控制台在**侧边栏收起态**（默认态）打下一条启动期告警：

```
[dsh-left-sidebar] 未找到侧边栏面板列表（可能仍处于收起态或 DSH 版本已变更）。
```

原因：探针用的是带折叠作用域的选择器 `SEL.navList`（含 `:not([class*="collapsed"])`），而侧边栏刷新后默认就是收起态，必然命中不了；同时插件 `apply` 又早于官方侧边栏挂载，同步探测本身就不可靠。

修法两处：

1. 新增不带折叠作用域的探针选择器 `SEL.navListAny = '[data-slot="sidebar"] nav[class*="panelList"]'`，只用于「侧边栏是否已挂载」判断，不参与任何样式规则。
2. `warnIfMissing()` 改为按 `PROBE_DELAYS_MS = [0, 300, 1000, 2500]` 延迟重试，命中即停；四档全落空才 warn 一次。`ctx.effect` 清理时 `clearTimeout` 掉所有待触发的定时器。

补 `test/probe.test.js` 5 例（覆盖首帧命中 / 第 2 次命中 / 末次命中 / 始终不命中 / 延迟表上限）。

复测（重新 build 后 reload，等 4 秒让四档探针跑完）：控制台 **只剩 meow-memory 自身的 `settings.section` 报错与 Canvas2D 性能提示，本插件零告警**；展开后 `display:"grid"`、5 列、`navH:72`、8 格。单测 25 pass / 0 fail，`client.js` 8431 B / SHA256 前 16 位 `2741067D84BC75CC`。

## 层级缩进兼容层（皮肤冲突，2026-11-08 追加）

用户反馈：三层数据成立，但**看不出上下级**——父行与子行的文字左边界完全重合。

定量实测（3179 实例，逐行 `getComputedStyle`）：

| 行 | `--dsh-workspace-indent` | `padding-inline-start` | 文字 `left` |
|---|---|---|---|
| 顶层项目 `workspace:882654ae` | `0px` | `10px` | 45 |
| 子层项目 `workspace:02037240` | `12px` | `10px`（应 22px） | 45 |
| 顶层会话 `session:session-0688` | `0px` | `24px` | 38 |
| 子层会话 `session:session-8762` | `12px` | `24px`（应 36px） | 38 |

→ 缩进变量本身是对的（0 / 12px），但从未进入 `padding-inline-start`。

根因：皮肤 `@smalltailqwq/dsh-client-ui-skin-maid-atelier` 的两条规则
`body[data-dsh-maid-atelier] [data-maid-workspace-row]{ padding: ... 10px ... }` 与
`[data-maid-session-row]{ padding: 0px 8px 0px 24px }`
用 **`padding` 简写**覆盖了官方
`.YDXeBa_projectRow, .YDXeBa_sessionRow { padding-inline-start: calc(var(--dsh-sidebar-row-padding) - var(--dsh-sidebar-paint-inset) + var(--dsh-workspace-indent,0px)) }`
（`@deepseek-ai/dsh-client-ui-workspace/lib/client.js:1955`）。皮肤选择器是「属性 + 属性」，特异性高于单个类选择器，因此简写胜出。

修法（`src/selectors.js` 的 `indentFallbackCss` + `src/client.js` 的探测）：
- **不抢 `padding`**，改用 `margin-inline-start: var(--dsh-workspace-indent, 0px)`，并把 `width` 扣掉同样长度，避免右边缘被 `overflow:hidden` 裁掉。变量为 0 时是 no-op，所以不给皮肤写死基准留白。
- 只在**探测确认丢失**时生效：`indentLostFrom(rows)` 按行类型比较 `indent=0` 与 `indent>0` 两类的 `padding-inline-start`，相同即判丢失；`watchIndent()` 用 `MutationObserver`（120ms 防抖 + 400ms 首判）持续观察，命中后给 `<html>` 打 `data-dsh-left-sidebar-indent`。默认全折叠时没有子行、判不出来，所以必须持续观察。官方无皮肤环境下不触发，不会双倍缩进。
- 缩进只有 12px，单靠横向位移仍不够醒目，额外给嵌套分组画 2px 竖引导线（`background: currentColor; opacity: .35`，只作用于 `div[class*="groupSection"] div[class*="groupSection"]`，顶层分组不画）。

复测（reload 后展开侧边栏，展开 `dsh` 与 `dsh_workdir`，共 17 行）：

- `<html data-dsh-left-sidebar-indent="lost">`，样式表长度 3590（原 3024）；
- 子层项目 `margin-inline-start:12px`、文字 `left 57`；顶层项目 `0px` / `left 45`；
- 子层会话 `margin-inline-start:12px`、文字 `left 50`；顶层会话 `0px` / `left 38`；
- 嵌套 `groupSection` 3 个，`::before` 计算值 `width:2px`、`background:rgb(248, 243, 232)`；
- 5 列网格无回归：`display:"grid"`、`navH:72`；
- 单测 **32 pass / 0 fail**（新增 `test/indent.test.js` 7 例），`client.js` 11628 B / SHA256 前 16 位 `AE361D18A0420138`。
## 复现方式

```powershell
# 1. 构建
cd C:\dsh\plugins\dsh-left-sidebar
pnpm install; pnpm build; pnpm test

# 2. 安装到 profile
node C:\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js plugin --profile web add link:C:\dsh\plugins\dsh-left-sidebar
# 再把 "dsh-left-sidebar" 加进 ~/.dsh/profiles/web/package.json 的 dsh.profile.bundles

# 3. 另开一个实例验收（不要动正在用的那个）
Start-Process node -ArgumentList 'C:\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js','web','--port','3199','--no-open' -WindowStyle Hidden
# 从 stdout 取 token URL 打开

# 4. 重测 V6 需要先清状态
#    localStorage.removeItem("dsh-left-sidebar.seeded")
#    并把 dsh.workspace.view.v5 的 groupBy 还原为 "workspace"、groupExpansion 清空
```

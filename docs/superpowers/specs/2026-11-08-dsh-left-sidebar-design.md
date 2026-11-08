# dsh-left-sidebar 设计文档

日期：2026-11-08
状态：待用户批准（批准前不写任何产品代码）

## 1. 意图与为什么

DSH 左侧边栏现在把「插件入口」和「工作区/会话浏览」竖着堆在 280px 宽的列里，两者抢同一块垂直空间：

- 实测（本机 `http://127.0.0.1:3179`，展开态 280px）：`.panelList` 是单列 `flex-direction:column`，8 个插件图标各占一行 36px，整块 **302px** 高；剩下给会话树的 `regionArea` 只有 295px。
- 工作区浏览默认 `groupBy:"workspace"`，只做到「工作区 → 会话」两层；用户心里的结构是「项目 → 工作目录 → 会话」三层，而目前三层要靠手动去 View options 里切 `workspace-tree`，且切过去以后**叶子默认展开**，第一屏仍然是一堆展开的会话行。

目标是把垂直空间还给内容：插件入口压成 2 行网格（约 72px），省下的 230px 交给三层结构；三层结构默认全部折叠，第一屏只看到项目。

## 2. 目标 / 非目标 / 反目标

**目标**

- G1 展开态侧边栏里，插件图标以 5 列网格排列（5 × n），悬停时显示该图标标题。
- G2 工作区浏览呈三层：项目 → 工作目录 → 会话。
- G3 首次启用时三层全部折叠（项目、目录、会话都不展开）。
- G4 项目与工作目录支持拖拽改变排序。
- G5 每一层右侧都有 `...`，点开是该层的可操作项。
- G6 插件以标准 DSH 插件形式交付（可 `dsh plugin add link:` 安装），源码进个人 GitHub 仓。

**非目标**

- N1 不接管 `sidebar.workspaces` 这个 single 槽，不重写官方工作区浏览器组件。
- N2 不新增自定义面板/页面（不注册新的 `main` 面板）。
- N3 不修改 DSH 源码，不修改 `node_modules` 里的官方包。
- N4 不改收起态（rail，56px）的布局；那里放不下 5 列，保持单列。
- N5 不改官方「新建会话」「Add workspace…」「搜索」等既有入口。

**反目标**（技术上做到了也算失败）

- A1 让日常操作变慢：打开一个会话不能比现在多点一次。
- A2 每次启动把用户手动展开的组重新折叠回去。
- A3 DSH 升级后整块侧边栏变成空白或报错；应该降级回官方外观。

## 3. 现状约束（全部实测，构成设计边界）

**槽位**

- `sidebar.panellist`（kind=list, owner `{size,active}`）**只提供图标**；行结构（`button.panelRow` + `span.panelGlyph` + 展开态 `span.panelTitle`）由壳渲染，插件改不了。→ 5 列只能靠覆盖 CSS。
- `sidebar.workspaces`（kind=single）被 `@deepseek-ai/dsh-client-ui-workspace@0.2.2-rc.1` 独占；包内无源码，替换它等于重写整个浏览器。→ 不接管（N1）。

**视图 store（三层的开关所在）**

- 视图 store 由 `createWorkspaceViewStore()` 创建，持久化键 `dsh.workspace.view.v5`，默认 `{groupBy:"workspace", orderBy:"updated", groupExpansion:{}, sessionOrderByAccount:{}, archivedFilter:"default"}`。
- `apply(ctx)` 里 `viewHandle` / `viewInstance` 是函数内局部变量，**没有 `ctx.set` 暴露**；唯一可达路径是 `ctx.get("uiWorkspace").view`（`UiWorkspaceService` 构造第 5 参赋给 `this.view`，字段声明在类里但在 `navigation.d.ts` 的 `interface UiWorkspace` 中**未公开**）。
- 该对象上的写方法：`setGroupBy`、`setOrderBy`、`setGroupExpanded(d,key,expanded)`、`setSessionOrder`、`pinSessionOrder`、`setArchivedFilter`、`retainAccountKeys`、`syncSessionOrders`。**没有批量折叠方法**。
- 折叠判定：`[...workspaces.map(w=>w.workspaceId), ""].filter(key => groupExpansion[key] ?? ancestorKeys.has(key))`。→ 显式 `false` 可以压掉「有子工作区的父级默认展开」。
- 另有一个 effect 会在打开会话时强制展开当前组：`if (... || Object.hasOwn(groupExpansion, currentGroup)) return; setGroupExpanded(currentGroup,true)`。→ **只要 `groupExpansion` 里已存在该 key（哪怕值是 false），它就不会被强制展开**，所以写 false 是安全的。
- 还有一条 reveal 路径会主动展开：`for (let key = revealGroup; ...) if (groupExpansion[key] === false || (key === revealGroup && groupExpansion[key] !== true)) setGroupExpanded(key,true)` —— 这是用户主动跳转时的一次性展开，属于期望行为，不阻止。

**三层**

- 三层 = `groupBy: "workspace-tree"`（内部 `nestWorkspaces === true`）。嵌套关系由 `owningParentFolder(path, parents)` 算出：**只认已注册工作区的祖先目录，路径比较大小写敏感**。→ 第二层是「已注册为工作区的子目录」，不是一个目录能被凭空虚拟出来。

**拖拽与 `...`（已存在，不改）**

- `ProjectRow` 整行 `draggable`（`access.reorder` 为真时），`onDragStart` 写 `dataTransfer.setData("text/plain", row.key)`，落点调用 `insertWorkspaceBefore(workspaceId, anchor)`。浏览器实测页面里 `div.YDXeBa_projectRow` 已是 draggable。
- `ProjectRow` 的 `rowActions` 里已有 `IconEllipsisOutlineRegular` → `openWorkspaceMenu(workspaceId, path, label, {x,y}, "toggle")`；会话行 `SessionNodeItem` 也有一个 → `openSessionMenu(...)`。**每层右侧的 `...` 官方三档都有**（项目与工作目录都是 ProjectRow，共用同一实现）。

**侧边栏壳**

- 结构链：`nav.hHd-Xa_panelList[aria-label="全局面板"]` → `div.hHd-Xa_root` → `div[data-slot="sidebar"]` → `div.pI_x6G_sidebarCol` → `div.pI_x6G_frame` → `div[data-slot="root"]`。
- class 哈希前缀 `hHd-Xa_` 随版本变；`[data-slot="sidebar"]` / `[class*="panelList"]` 更稳。
- 收起态标记在 `div.hHd-Xa_root` 的 `hHd-Xa_collapsed` class 上，`body` 上**没有** `data-sidebar-collapsed`。
- 祖先链 `div[data-slot=sidebar]`、`.pI_x6G_sidebarCol`、`.pI_x6G_frame` 全是 `overflow:hidden` → 悬停气泡不能横向超出侧边栏宽度。
- `[data-windows-titlebar]` 下，收起态会 `display:none` 掉 `panelList`，注入的 CSS 不该把这条规则覆盖成可见。

## 4. 方案（Approaches）

**方案 A（选定）— 纯注入**：不改结构，只用两种手段：注入一段 CSS 把 `panelList` 变成 5 列 grid；启动时通过 `ctx.get("uiWorkspace").view` 把 `groupBy` 设为 `workspace-tree`、把尚未记录过的组键写成 `false`。三层、拖拽、`...` 全部复用官方实现。

- 代价：依赖 `uiWorkspace.view` 这个未公开字段；它一旦被移除，三层默认失效（降级为「用户自己去 View options 点一次」）。
- 好处：代码量最小（预计 < 500 行），不碰 React 管理的 DOM，不跟官方组件抢槽位。

**方案 B — 接管 `sidebar.workspaces` 单槽**：注册自己实现的浏览器组件，完全按三层重画（含自定义 `...` 菜单、自定义拖拽）。

- 代价：要重写搜索、Add workspace、目录选择洞、rename/delete 对话框、归档过滤、pin、hover card、快捷键……等于接手 285KB 组件的全部行为；官方每次升级都要跟。
- 否决理由：需求里没有任何一条是官方结构做不到的，重写换不来新能力，只换来维护成本。

**方案 C — 只注入 CSS，三层与默认折叠交给用户手动在 View options 里点**：零风险。

- 否决理由：`workspace-tree` 默认是叶子展开的，用户每次装完还要手动点两次，违背 G3；把「配置」当交付，不算实现需求。

用户已经在对话里选定：需求 1 选 A（5 列只在展开态生效）；需求 2 选 A（不接管单槽，写默认值 + 注入 CSS）。

## 5. 设计细节

### 5.1 插件骨架

源码目录：`C:\dsh\plugins\dsh-left-sidebar`（独立 git 仓，见 §6）。

```
dsh-left-sidebar/
  package.json
  cordis.patch.yml
  index.js          # node 半：只导出 name / Config / 空 apply
  client.js         # 浏览器半：注入 CSS + 写视图默认值
  locale/zh.json
  locale/en.json
  icon.svg
  README.md
  CHANGELOG.md
  docs/superpowers/specs/2026-11-08-dsh-left-sidebar-design.md
```

`package.json` 关键字段（照 `dsh-settings-nav-manager@1.4.5` 的形态）：

```json
{
  "name": "dsh-left-sidebar",
  "version": "0.1.0",
  "type": "module",
  "main": "index.js",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./package.json": "./package.json",
    "./locale/*.json": "./locale/*.json"
  },
  "dependencies": { "@deepseek-ai/schemastery": "^3.18.4" },
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "immediately": true },
    "compatibility": {
      "dsh": ">=0.2.1-rc.2 <0.3.0",
      "node": ">=20.18",
      "profiles": ["web", "desktop"]
    }
  }
}
```

`cordis.patch.yml`：`- insert:` + `- id: left-sidebar` + `name: 'dsh-left-sidebar'`。

`client.js` 入口必须是：

```js
window.__ModuleLoader__.load({
  id: "dsh-left-sidebar",
  factory: function (require) { var module = { exports: {} }; var exports = module.exports; /* ... */ },
});
```

末尾 `exports.apply = apply; exports.inject = ["slots", "remote"];`。**不要** `import` 任何 `@deepseek-ai/dsh-client-*`（运行期由 `require()` 供给，profile 里没有这些包）。

`index.js`（node 半）保持最小：

```js
export const name = "dsh-left-sidebar";
export const NS = "left-sidebar";
export const Config = z.object({ ... }).volatile();
export function apply() {}
```

Config 只是为将来留口子（见 §8），本期插件不读它做业务。

### 5.2 F1：5 × n 插件图标网格

只在展开态生效（`:not(.hHd-Xa_collapsed)`）。CSS 全文（已在真实页面注入验证过，随后移除）：

```css
/* 作用域：用 data-slot 锚点 + 哈希 class 兜底 */
/* 哈希前缀 hHd-Xa_ 会随版本变，所以每条规则都写「data-slot 锚点精确版 + 哈希通配兜底版」两份 */
[data-slot="sidebar"] .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_panelList,
[data-slot="sidebar"] div[class*="root"]:not([class*="collapsed"]) nav[class*="panelList"] {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 4px;
  flex-direction: unset;
}

[data-slot="sidebar"] .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_panelRow {
  width: auto;
  min-width: 0;
  min-height: 34px;
  height: 34px;
  padding: 0;
  border-inline: 0;
  justify-content: center;
  position: relative;
}

/* 5 列下隐藏壳自己渲染的行内标题 */
[data-slot="sidebar"] .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_panelTitle {
  display: none;
}

/* 悬停标题：纯 CSS 伪元素，读 aria-label，不写 React 管的 DOM */
[data-slot="sidebar"] .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_panelRow::after {
  content: attr(aria-label);
  position: absolute;
  top: calc(100% + 4px);
  left: 50%;
  transform: translateX(-50%);
  background: var(--dsw-alias-tooltip-bg, #2c2c2e);
  color: #fff;
  font-size: 12px;
  line-height: 18px;
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
  pointer-events: none;
  opacity: 0;
  transition: opacity 0.12s;
  z-index: 60;
}

[data-slot="sidebar"] .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_panelRow:hover::after {
  opacity: 1;
}

/* 首列左对齐、末列右对齐，避免气泡被 overflow:hidden 的祖先裁掉 */
[data-slot="sidebar"] .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_panelRow:nth-child(5n + 1)::after {
  left: 0;
  transform: none;
}

[data-slot="sidebar"] .hHd-Xa_root:not(.hHd-Xa_collapsed) .hHd-Xa_panelRow:nth-child(5n)::after {
  left: auto;
  right: 0;
  transform: none;
}
```

实测数据：`gridTemplateColumns` = 5 × 49.59px，`panelList` 高度 302px → 72px，单元格 50×34，8 个插件排 2 行，`::after` 的 `content` 解析为对应 `aria-label`。

边界情形：

- 插件数量不是 5 的整数倍时，最后一行左对齐、留空（grid 默认行为），不拉伸。
- 收起态不套用以上任何一条，rail 仍是原生 36×36 单列。
- 第 4、5 列的悬停气泡会贴近侧边栏右缘；因为祖先是 `overflow:hidden`，气泡必须 `translateX(-50%)` 居中且 `max-width` 受限。若实测仍被裁，退化为只对第 1 列用 `left:0`、第 5 列用 `right:0`（用 `:first-child` / `:nth-child(5n)` 定位）。

### 5.3 F2：三层 + 默认折叠

启动时（client 半，`apply(ctx)` 内，等 `uiWorkspace` 可用的时机）执行：

```
view = ctx.get("uiWorkspace")?.view          // 拿不到则跳过，只保留 CSS（降级）
if (!view) return degrade("three-level")

if (view.setGroupBy && 当前不是 workspace-tree) view.setGroupBy("workspace-tree")

// 幂等折叠播种：只写「从未记录过」的键，绝不覆盖用户的选择
ids = 所有已注册 workspaceId.concat([""])   // "" 是 Ungrouped 组
for (id of ids) if (!(id in groupExpansion)) view.setGroupExpanded(d, id, false)
```

要点：

- **只写不存在的键**。用户手动展开过的组，`groupExpansion[key] === true`，插件永远不碰 → 满足 A2。
- `""`（Ungrouped）也要写 false，否则未归属会话那块会默认展开。
- 不设 `orderBy`：保持用户当前设置（默认 `updated`）。拖拽排序由 Host 的 `insertWorkspaceBefore` 落盘，与 `orderBy` 无关。
- 该播种**每次启动都会跑**，但只对新出现的组键生效 —— 新项目第一次出现时也是折叠的，符合「默认归档」。
- 若后续发现 `setGroupBy` 写入被官方 action 层忽略（例如要求参数形状不同），降级方案：写 `localStorage["dsh.workspace.view.v5"]` 的 `groupBy` 字段后 reload。**降级也要保留**，写在 README 的 troubleshooting 里。

「归档」的解释（我的判断，请确认）：需求原文「构建初始默认归档项目/目录/会话」理解为**折叠/收起**，不是 DSH 的 `archived` 状态（那个会隐藏会话、需要 unarchive 才能打开，语义完全不同）。文档按「折叠」实现。

### 5.4 每层右侧的 `...`

不改代码，属于验证项：项目行与工作目录行都渲染 `ProjectRow`（`rowActions` 里有 `IconEllipsisOutlineRegular` → `openWorkspaceMenu`），会话行有 `openSessionMenu`。官方默认 hover 才显示（`rowActions` 在悬停时出现）。

我的取舍：保持官方 hover 行为，不强行常显（常显会让每行右侧多一个常驻按钮，反而挤占标题宽度）。如果验收时用户要求常显，再追加一条 CSS 把 `rowActions` 的 `opacity` 固定为 1 —— 属于 §8 的开放项。

### 5.5 拖拽排序

不改代码，验证项：三层结构下拖动项目行到另一个项目附近 → 触发 `insertWorkspaceBefore` → 顺序写入 Host。已知限制（写进 README）：

- 只能在同一父级内改变顺序；把子目录拖到另一个项目下会改父级归属，官方只做排序、不做 reparent（`insertWorkspaceBefore` 只调顺序）。跨层移动仍要「删除工作区 + 在目标目录重新添加」。
- 未注册为工作区的普通子目录不会出现在第二层（`owningParentFolder` 只认已注册祖先）。

### 5.6 降级与错误处理

- 选择器命中不到 `panelList` → 不抛错，静默不生效（用户看到官方外观），并把原因写到 `console.warn` 一次。
- `ctx.get("uiWorkspace")` 为 undefined 或 `view.setGroupBy` 不存在 → 只做 5 列 CSS，三层默认不生效；在 UI 上不做弹窗（A3），只在 console 记一条。
- CSS 注入用 `document.head.appendChild(<style data-dsh-left-sidebar>)`，清理时按该属性移除；不依赖任何 `data-*` 全局属性（皮肤插件会往 `body` 上写自己的属性，不可依赖）。

### 5.7 生命周期

`ctx.effect(() => { ensureStyles(); return () => { removeStyles(); }})`，与 `dsh-settings-nav-manager` 同款；不注册任何 DOM 事件监听（纯 CSS + 一次性写 store），所以没有事件解绑负担。

## 6. 落地与交付

- 源码仓：`C:\dsh\plugins\dsh-left-sidebar`，`git init`，远程 `git@github.com:xyh-2012/dsh-left-sidebar.git`，**公开仓**（`gh repo create --public --source . --push`）。这是用户的账号 `xyh-2012`（`gh auth status` 已登录，scope 含 `repo`）。
- 安装验证：`dsh plugin --profile web add link:C:\dsh\plugins\dsh-left-sidebar`，然后重启 `dsh web`（或按本机既有方式重启桌面壳），在 `http://127.0.0.1:3179` 上验收。
- 本设计文档随仓提交（`docs/superpowers/specs/`）。

## 7. 验收（每条都要有实测证据）

| # | 检查 | 判据 |
|---|---|---|
| V1 | 展开态插件区 | `panelList` 计算样式 `display:grid`，列数 5，高度约 72px |
| V2 | 单元格尺寸 | 每格约 50×34，8 个图标 2 行，最后一行不拉伸 |
| V3 | 悬停标题 | hover 任一格，`::after` 内容等于该格 `aria-label` |
| V4 | 收起态不受影响 | 收起后恢复单列 36×36，`display:flex` |
| V5 | 三层结构 | 侧边栏出现「项目 → 子目录 → 会话」嵌套；`localStorage["dsh.workspace.view.v5"].groupBy === "workspace-tree"` |
| V6 | 默认折叠 | 首次加载后所有组（含 Ungrouped）`expanded === false`，第一屏只有项目行 |
| V7 | 不覆盖用户选择 | 手动展开某项目 → 刷新 → 该项目仍展开 |
| V8 | 每层 `...` | 项目行、目录行、会话行 hover 后右侧出现 `...`，点击弹出对应菜单 |
| V9 | 拖拽排序 | 拖项目 A 到 B 位置 → 顺序改变且刷新后保持 |
| V10 | 降级 | 临时改错选择器 → 页面仍是官方外观，不报错、不空白 |

## 8. 留给构建者的

- §5.2 的 `max-width:240px` 与第 4/5 列气泡定位，若被 `overflow:hidden` 裁剪，按 §5.2 末尾的退化策略处理。
- `--dsw-alias-tooltip-bg` 已实测存在于本机主题：解析值 `#2c2c2e`（浅色主题下是深色气泡，符合预期）。`--dsw-alias-tooltip-fg` 未核实，取不到时用硬编码 `#fff`（已是 fallback）。
- `Config` 的字段集合（预留 `columns: 5`、`hoverTitle: true`、`seedCollapsed: true`）本期不接 UI，字段命名可调整。
- `...` 是否常显（§5.4 的取舍）留给验收时按用户反馈决定。
- 是否需要「三列布局改为 4 列/6 列」等可配置项 —— 本期不做。
- README 需写明：依赖 `uiWorkspace.view` 未公开字段（DSH 升级可能失效）、跨层移动工作区的限制、以及降级后的恢复步骤。

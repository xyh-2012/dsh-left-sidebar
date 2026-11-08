# dsh-left-sidebar Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 交付一个可 `dsh plugin add link:` 安装的 DSH 插件，把展开态侧边栏的插件图标从单列纵向改为 5 列网格（悬停显示标题），并把工作区浏览默认设为「项目 → 工作目录 → 会话」三层且首次启用时全部折叠。

**Architecture:** 不接管任何槽位、不改 React 管理的 DOM。两个动作：① 向 `document.head` 注入一段 CSS（用 `[data-slot="sidebar"]` + 属性选择器 + `:has()` 定位，不含 class 哈希前缀），把 `nav[class*="panelList"]` 改成 `display:grid`，并用 `button.panelRow::after{content:attr(aria-label)}` 提供悬停标题；② 在 `uiWorkspace` 就绪后通过它未公开的 `view` actions 写一次 `setGroupBy("workspace-tree")` 与「未记录过的组键 → false」，用 `localStorage` 标记保证只播一次。三层、拖拽、每层 `...` 全部复用官方实现。

**Tech Stack:** 纯 ESM JavaScript（无框架）、esbuild 打包成 `window.__ModuleLoader__.load({ id, factory })` 单文件、`node:test` + `node:assert` 做纯函数单测、pnpm 安装到 `web` profile。

**Spec:** `docs/superpowers/specs/2026-11-08-dsh-left-sidebar-design.md`

## Global Constraints

- `dsh.compatibility`：`dsh: ">=0.2.1-rc.2 <0.3.0"`、`node: ">=20.18"`、`profiles: ["web"]`（desktop 壳不在本期支持范围，README 注明未验证）。
- 不修改 `C:\dsh` 下任何源码或 `node_modules`；插件只存在于自己的仓库 `C:\dsh\plugins\dsh-left-sidebar`。
- 不接管 `sidebar.workspaces` 单槽，不注册任何新面板/`main` 槽。
- 绝不改写 React 管理的 DOM 结构（禁止 `replaceWith` / `removeChild` / `innerHTML=` 作用于侧边栏节点）；交互只走官方已有元素。
- 5 列布局**只在展开态生效**；`:not([class*="collapsed"])` 作用域，收起态零改动。
- CSS 选择器**不得包含 class 哈希前缀**（如 `hHd-Xa_`），一律用 `[data-slot="sidebar"]`、`[class*="panelList"]`、`[class*="panelRow"]`、`[class*="panelTitle"]`、`:has()`。
- 任何失败路径都只 `console.warn` 一次然后保留官方外观；禁止 `alert` / `confirm` / 弹窗，禁止抛错中断侧边栏渲染。
- 折叠「播种」只写**当前不存在**的 `groupExpansion` 键，且整个生命周期只播一次（`localStorage` 标记）；绝不覆盖用户已展开的组。
- `client.js` 必须是自包含单文件，入口为 `window.__ModuleLoader__.load({ id: "dsh-left-sidebar", factory })`；不 `import` 任何 `@deepseek-ai/dsh-client-*`。
- 所有面向用户/维护者的文档与注释用中文；GitHub 仓公开。

## Review Focus

1. **5 列下点击图标仍然选中对应面板**：单元格变成 50×34 后，整格必须仍是可点区域，点哪一格就切到那一格的面板（而不是点到 glyph 才生效或错位到邻格）。
2. **收起 → 展开往返后网格仍生效**：rail 状态与 wide 状态共用同一批 DOM 节点，CSS 必须随 class 变化自动重新匹配，不能依赖一次性 JS 打标记。
3. **`uiWorkspace` 未就绪时不得误播种**：服务晚于插件 apply 就绪，若在列表为空时就写折叠键并置 `seeded` 标记，用户之后新建的项目将永久默认展开（静默失效）。
4. **手动展开后刷新不被重新折叠**：`seeded` 标记与「只写不存在的键」双保险；先展开再刷新必须仍然展开。
5. **悬停标题在首列/末列不被裁剪**：祖先链 `overflow:hidden`（真正裁剪者是 `.pI_x6G_sidebarCol`，280px），第 1 列与第 5 列的气泡必须贴边对齐而不是居中溢出。

## 两条已裁定的取舍（写进 README，验收时按此判定，不算缺陷）

- **首次启用后当前会话不可见**：G3 要求「项目/目录/会话全部折叠」，因此首次播种后当前正在看的会话行也是折叠的，要看到它得先点开它所属的项目 —— 这是 G3 的直接代价，A1 在此让位于 G3。用户手动展开后由 `groupExpansion[key]=true` 记住，之后不再折叠（Task 5 Step 7 验证）。**不要**为了让当前会话可见而额外写 `true`，那会同时破坏 G3 与「只播一次」。
- **第二层只认已注册工作区**：`owningParentFolder` 取最近**已注册**祖先，未注册的中间目录（如 `C:\code\dsh_workdir\project`）不产生层级，深度被压缩但不会塌成两层。要支持任意目录深度必须换成接管单槽（方案 B），本期不做。

---

### Task 1: 可安装的插件壳

**Files:**
- Create: `package.json`
- Create: `cordis.patch.yml`
- Create: `index.js`
- Create: `.gitignore`
- Create: `README.md`（空壳，Task 6 补齐）

**Interfaces:**
- Consumes: 无
- Produces: 可被 `dsh plugin --profile web add link:C:\dsh\plugins\dsh-left-sidebar` 安装的包 `dsh-left-sidebar`；`index.js` 导出 `name`（node 半，本轮无行为）。

- [ ] **Step 1: 写 `package.json`**

```json
{
  "name": "dsh-left-sidebar",
  "version": "0.1.0",
  "description": "DSH 左侧边栏增强：插件图标 5 列网格 + 工作区三层树默认折叠",
  "type": "module",
  "main": "index.js",
  "exports": {
    ".": "./index.js",
    "./client": "./client.js",
    "./package.json": "./package.json"
  },
  "files": ["index.js", "client.js", "cordis.patch.yml", "README.md", "CHANGELOG.md"],
  "keywords": ["dsh", "dsh-plugin", "sidebar", "workspace"],
  "license": "MIT",
  "dsh": {
    "bundle": { "patch": "./cordis.patch.yml" },
    "client": { "platform": "web", "immediately": true },
    "compatibility": { "dsh": ">=0.2.1-rc.2 <0.3.0", "node": ">=20.18", "profiles": ["web"] }
  }
}
```

- [ ] **Step 2: 写 `cordis.patch.yml`**

```yaml
- insert:
    - id: left-sidebar
      name: 'dsh-left-sidebar'
```

- [ ] **Step 3: 写 `index.js`（node 半，空实现）**

```js
// dsh-left-sidebar — node 半。
// 本插件全部行为在浏览器侧（client.js），这里只提供包入口以满足 bundle patch 的 insert。
export const name = "dsh-left-sidebar";
export function apply() {}
```

- [ ] **Step 4: 写 `.gitignore`**

```
node_modules/
*.log
scratch/
```

- [ ] **Step 5: 建仓并提交**

```powershell
cd C:\dsh\plugins\dsh-left-sidebar
git init -b main
git add -A
git commit -m "chore: 插件骨架（package.json / cordis.patch.yml / node 半入口）"
```

- [ ] **Step 6: 安装到 web profile 并验证被识别**

```powershell
node C:\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js plugin --profile web add link:C:\dsh\plugins\dsh-left-sidebar
node C:\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js plugin --profile web why dsh-left-sidebar
```

（**`--profile web` 必须写在 `plugin` 之后、`add`/`why` 之前**；写成 `bin.js --profile web plugin add …` 会报 `too many arguments`，实测已验证。）

Expected: 安装命令退出码 0；`why` 输出包含 `dsh-left-sidebar@0.1.0` 与 `dsh-profile-web (dependencies)`，且 `C:\Users\xyh_q\.dsh\profiles\web\package.json` 的 `dsh.profile.bundles` 数组中新增 `"dsh-left-sidebar"`。

若安装失败且错误指向无法解析 `@deepseek-ai/schemastery`：本计划未使用 Config，可忽略该依赖告警；若报错为其它依赖缺失，回到 Step 1 删除 `dependencies` 字段后重试（本插件不引入任何运行时依赖）。

---

### Task 2: 构建管线与纯函数单测

**Files:**
- Create: `src/selectors.js`
- Create: `src/seed.js`
- Create: `build.mjs`
- Create: `test/selectors.test.js`
- Create: `test/seed.test.js`
- Modify: `package.json`（加 `scripts` 与 `devDependencies`）

**Interfaces:**
- Consumes: Task 1 的 `package.json`
- Produces:
  - `src/selectors.js` → `export const PANEL_COLUMNS = 5`；`export const SEL = { navList: string, panelRow: string, panelTitle: string, sidebarRoot: string }`；`export function panelListCss(columns: number): string`
  - `src/seed.js` → `export const UNGROUPED_KEY = ""`；`export function shouldSetGroupBy(current: string): boolean`；`export function seedGroupKeys(workspaceIds: string[], groupExpansion: Record<string, boolean>): string[]`

- [ ] **Step 1: 写失败测试 `test/seed.test.js`**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { seedGroupKeys, shouldSetGroupBy, UNGROUPED_KEY } from "../src/seed.js";

test("空 groupExpansion 时播种所有工作区与未分组", () => {
  assert.deepEqual(seedGroupKeys(["a", "b"], {}), ["a", "b", UNGROUPED_KEY]);
});

test("已记录的键不重复播种（不覆盖用户选择）", () => {
  assert.deepEqual(seedGroupKeys(["a", "b"], { a: true }), ["b", UNGROUPED_KEY]);
});

test("全部已记录时不播种任何键", () => {
  assert.deepEqual(seedGroupKeys(["a"], { a: false, "": false }), []);
});

test("工作区里的空字符串不会重复产生未分组键", () => {
  assert.deepEqual(seedGroupKeys([""], {}), [UNGROUPED_KEY]);
});

test("当前不是 workspace-tree 时才需要设置", () => {
  assert.equal(shouldSetGroupBy("workspace"), true);
  assert.equal(shouldSetGroupBy("workspace-tree"), false);
});
```

- [ ] **Step 2: 写失败测试 `test/selectors.test.js`**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { panelListCss, PANEL_COLUMNS, SEL } from "../src/selectors.js";

test("默认列数是 5", () => {
  assert.equal(PANEL_COLUMNS, 5);
});

test("生成的 CSS 使用 grid 与 5 列", () => {
  const css = panelListCss(5);
  assert.match(css, /display:\s*grid/);
  assert.match(css, /grid-template-columns:\s*repeat\(5,\s*minmax\(0,\s*1fr\)\)/);
});

test("生成的 CSS 只在展开态作用域生效", () => {
  const css = panelListCss(5);
  assert.match(css, /:not\(\[class\*="collapsed"\]\)/);
  assert.doesNotMatch(css, /\.hHd-Xa_/);
});

test("悬停标题读 aria-label", () => {
  const css = panelListCss(5);
  assert.match(css, /content:\s*attr\(aria-label\)/);
  assert.match(css, /:hover::after/);
});

test("选择器常量不含 class 哈希前缀", () => {
  for (const value of Object.values(SEL)) {
    assert.doesNotMatch(value, /\.hHd-Xa_/);
    assert.match(value, /data-slot="sidebar"/);
  }
});
```

- [ ] **Step 3: 运行测试确认失败**

```powershell
cd C:\dsh\plugins\dsh-left-sidebar
node --test test/
```

Expected: FAIL —— `Cannot find module '../src/seed.js'`（两个测试文件都因模块不存在而失败）。

- [ ] **Step 4: 实现 `src/seed.js`**

```js
// 折叠播种的纯逻辑：只决定「哪些组键需要写 false」，不接触任何宿主对象。
export const UNGROUPED_KEY = "";

/** @param {string} current 当前 groupBy @returns {boolean} 是否需要切换到三层 */
export function shouldSetGroupBy(current) {
  return current !== "workspace-tree";
}

/**
 * 只返回尚未被记录过的组键（含未分组组），已存在的键一律跳过以尊重用户选择。
 * @param {string[]} workspaceIds @param {Record<string, boolean>} groupExpansion
 * @returns {string[]}
 */
export function seedGroupKeys(workspaceIds, groupExpansion) {
  const keys = [...workspaceIds, UNGROUPED_KEY];
  const seen = new Set();
  const out = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    if (!Object.hasOwn(groupExpansion, key)) out.push(key);
  }
  return out;
}
```

- [ ] **Step 5: 实现 `src/selectors.js`**

`panelListCss(columns)` 返回完整 CSS 字符串。选择器常量：

```js
export const PANEL_COLUMNS = 5;
export const SEL = {
  sidebarRoot: '[data-slot="sidebar"]',
  navList:
    '[data-slot="sidebar"] div:has(> nav[class*="panelList"]):not([class*="collapsed"]) > nav[class*="panelList"]',
  panelRow: 'button[class*="panelRow"]',
  panelTitle: 'span[class*="panelTitle"]',
};
```

CSS 必须包含这 6 组规则（顺序无关，但最后两组不可省）：

1. nav 容器：`display:grid; grid-template-columns:repeat(${columns}, minmax(0,1fr)); gap:4px; flex-direction:unset`。
2. 所有直接子元素：`min-width:0`（grid item 默认 `min-width:auto` 会被内容撑爆列宽）。
3. `SEL.panelRow`：`width:auto; min-width:0; min-height:34px; height:34px; padding:0; border-inline:0; justify-content:center; position:relative`。
4. `SEL.panelTitle`：`display:none`。
5. 气泡本体，**两条选择器必须同时写**（第 8 格「更多」的按钮嵌在 `span` 里，只写 `> button` 会漏掉它）：
   ```css
   ${nav} > button[class*="panelRow"]::after,
   ${nav} > span button[class*="panelRow"]::after { content:attr(aria-label); position:absolute; top:calc(100% + 4px); left:50%; transform:translateX(-50%); background:var(--dsw-alias-tooltip-bg,#2c2c2e); color:#fff; font-size:12px; line-height:18px; padding:2px 6px; border-radius:4px; white-space:nowrap; pointer-events:none; opacity:0; z-index:60; display:block; }
   ```
6. 贴边对齐，同样**四条选择器**（首列 / 末列 × 直接 button / span 内 button）：
   ```css
   ${nav} > button:nth-child(5n + 1)::after,
   ${nav} > span:nth-child(5n + 1) button[class*="panelRow"]::after { left:0; transform:none; }
   ${nav} > button:nth-child(5n)::after,
   ${nav} > span:nth-child(5n) button[class*="panelRow"]::after { left:auto; right:0; transform:none; }
   ```
   再加 `:hover` 时的 `opacity:1`，**两条**选择器（直接 button + span 内 button）即可，不需要 nth-child 变体：
   ```css
   ${nav} > button[class*="panelRow"]:hover::after,
   ${nav} > span button[class*="panelRow"]:hover::after { opacity:1; }
   ```

**不要**给 `nav > span` 加 `display:contents`：实测加不加格子位置完全一样，且 `display:contents` 会让该 span 的 `nth-child` 计算仍成立但更易踩坑。

- [ ] **Step 6: 写 `build.mjs`**

用 esbuild 把 `src/client.js` 打成 CJS 并包进 ModuleLoader 外壳，输出 `client.js`：

```js
import { build } from "esbuild";
import { readFile, writeFile } from "node:fs/promises";

const result = await build({
  entryPoints: ["src/client.js"],
  bundle: true,
  format: "cjs",
  platform: "browser",
  target: ["chrome110"],
  write: false,
  legalComments: "none",
});
const body = result.outputFiles[0].text;
const shell = `window.__ModuleLoader__.load({ id: "dsh-left-sidebar", factory: function (require) {\n  var module = { exports: {} };\n  var exports = module.exports;\n${body}\n  return module.exports;\n} });\n`;
await writeFile("client.js", shell, "utf8");
console.log(`client.js written (${shell.length} B)`);
```

- [ ] **Step 7: 在 `package.json` 补 `scripts` 与 `devDependencies`**

```json
"scripts": {
  "build": "node build.mjs",
  "test": "node --test test/"
},
"devDependencies": { "esbuild": "^0.25.0" }
```

- [ ] **Step 8: 安装 devDependencies 并跑测试**

```powershell
cd C:\dsh\plugins\dsh-left-sidebar
pnpm install --ignore-scripts
node --test test/
```

Expected: 全部 test PASS（seed 5 + selectors 5）。

- [ ] **Step 9: 提交**

```powershell
git add -A
git commit -m "feat: 构建管线与折叠/选择器纯函数（含单测）"
```

---

### Task 3: 5 列网格 CSS 注入

**Files:**
- Create: `src/client.js`
- Create: `client.js`（`pnpm build` 产物）

**Interfaces:**
- Consumes: `src/selectors.js` 的 `panelListCss(columns)`、`PANEL_COLUMNS`、`SEL`
- Produces: `src/client.js` → `export const name = "dsh-left-sidebar"`、`export function apply(ctx)`、`export const STYLE_TAG = "dsh-left-sidebar"`、`export function ensureStyles()`、`export function removeStyles()`

- [ ] **Step 1: 实现 `src/client.js` 的样式注入部分**

```js
import { PANEL_COLUMNS, SEL, panelListCss } from "./selectors.js";

export const name = "dsh-left-sidebar";
export const STYLE_TAG = "dsh-left-sidebar";

export function ensureStyles() {
  if (document.querySelector(`style[data-dsh-left-sidebar="${STYLE_TAG}"]`)) return;
  const tag = document.createElement("style");
  tag.setAttribute("data-dsh-left-sidebar", STYLE_TAG);
  tag.textContent = panelListCss(PANEL_COLUMNS);
  document.head.appendChild(tag);
}

export function removeStyles() {
  document.querySelector(`style[data-dsh-left-sidebar="${STYLE_TAG}"]`)?.remove();
}

export function apply(ctx) {
  ctx.effect(() => {
    ensureStyles();
    return () => removeStyles();
  }, "dsh-left-sidebar: styles");
}
```

`apply` 里先做一次「选择器能否命中」的自检：`document.querySelector(SEL.navList)` 为 `null` 时 `console.warn` 一次（不抛错、不重试），然后照常注入样式（侧边栏可能在插件 apply 之后才挂载，样式必须无条件注入）。

- [ ] **Step 2: 构建**

```powershell
pnpm build
```

Expected: 输出 `client.js written (… B)`；`client.js` 首行为 `window.__ModuleLoader__.load({ id: "dsh-left-sidebar", factory: function (require) {`。

- [ ] **Step 3: 在第二实例上确认插件被加载**

**不要重启 3179**——它同时承载本会话，重启会把正在验证的人踢下线。另开一个实例做迭代：

```powershell
Start-Process -FilePath 'node' -ArgumentList 'C:\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js','web','--port','3199','--no-open' -WindowStyle Hidden
```

12–15 秒后从 stdout 取 `dsh web: http://127.0.0.1:3199/?token=…` 这一行，用该 URL 打开页面（token 一次性，重开请重新取；也可从 `C:\Users\xyh_q\AppData\Local\DshDesktop\WebView2\EBWebView\Default\History` 查 `SELECT url FROM urls WHERE url LIKE '%token=%' ORDER BY id DESC LIMIT 1`）。

Expected: 页面正常渲染；`document.querySelector('style[data-dsh-left-sidebar="dsh-left-sidebar"]') !== null`；`document.querySelector('link[href*="dsh-left-sidebar"]')` 或浏览器 network 面板里出现 `/plugins/dsh-left-sidebar/client.js` 且状态 200。

- [ ] **Step 4: 断言 5 列布局（Review Focus 1 的点击区域一并验证）**

在页面里执行（**必须用 `nav.children` 遍历，不能用 `querySelectorAll`**——第 8 个按钮「更多」不是 nav 的直接子元素，用 `querySelectorAll` 拿到的序号与 grid 格子序号不一致）：

```js
const nav = document.querySelector('[data-slot="sidebar"] div:has(> nav[class*="panelList"]):not([class*="collapsed"]) > nav[class*="panelList"]');
const cs = getComputedStyle(nav);
return {
  display: cs.display,
  cols: cs.gridTemplateColumns.split(" ").length,
  navHeight: Math.round(nav.getBoundingClientRect().height),
  childCount: nav.children.length,
  cells: [...nav.children].map((c) => {
    const btn = c.tagName === "BUTTON" ? c : c.querySelector('button[class*="panelRow"]');
    const r = c.getBoundingClientRect();
    return { tag: c.tagName, label: btn && btn.getAttribute("aria-label"), direct: c.tagName === "BUTTON", w: Math.round(r.width), h: Math.round(r.height), left: Math.round(r.left), top: Math.round(r.top) };
  }),
  titlesHidden: [...nav.querySelectorAll('span[class*="panelTitle"]')].every((s) => getComputedStyle(s).display === "none"),
};
```

Expected: `display === "grid"`、`cols === 5`、`navHeight` 约为 72（比单列的 302 明显变小）、`childCount === 8`（7 个 `BUTTON` + 1 个 `SPAN`）、每个 `w` 约 50 / `h` 约 34、`left` 呈 8/62/115/169/222 的等距分布、第 2 行 `top` 比第 1 行大约 38、`titlesHidden === true`。

- [ ] **Step 5: 断言点击命中正确面板**

点击第 2 格（`left` 约 62 的那个按钮）中心，然后读 `aria-current`：

```js
const nav = document.querySelector('[data-slot="sidebar"] nav[class*="panelList"]');
const btns = [...nav.querySelectorAll('button[class*="panelRow"]')];
const before = btns.findIndex((b) => b.getAttribute("aria-current") === "page");
btns[1].click();
const after = btns.findIndex((b) => b.getAttribute("aria-current") === "page");
return { before, after, expected: 1 };
```

Expected: `after === 1`（点第 2 格就切到第 2 格）。验证完切回原来的面板：`btns[before].click()`。

- [ ] **Step 6: 断言悬停标题（Review Focus 5）**

```js
const nav = document.querySelector('[data-slot="sidebar"] nav[class*="panelList"]');
return [...nav.children].map((c, i) => {
  const btn = c.tagName === "BUTTON" ? c : c.querySelector('button[class*="panelRow"]');
  const cs = getComputedStyle(btn, "::after");
  return { i: i + 1, col: (i % 5) + 1, label: btn.getAttribute("aria-label"), content: cs.content, fontSize: cs.fontSize, left: cs.left, right: cs.right, display: cs.display };
});
```

Expected: 每格 `content` 是带引号的各自 `aria-label`（如 `"插件"`、`"更多"`）；`fontSize === "12px"`；`display === "block"`；`col === 1` 的格子（i=1、i=6）`left === "0px"`，`col === 5` 的格子（i=5）`right === "0px"`（贴边不溢出）。

- [ ] **Step 7: 提交**

```powershell
git add -A
git commit -m "feat: 展开态插件图标 5 列网格与悬停标题"
```

---

### Task 4: 收起态回归与降级

**Files:**
- Modify: `src/client.js`
- Modify: `test/selectors.test.js`

**Interfaces:**
- Consumes: Task 3 的 `ensureStyles` / `removeStyles`
- Produces: 行为修正 —— 收起态零影响、选择器失效时只 `console.warn` 一次、卸载时移除 style 标签

- [ ] **Step 1: 写失败测试（作用域与幂等）**

在 `test/selectors.test.js` 追加：

```js
test("每条 CSS 规则的前置选择器都限定在未折叠作用域内", () => {
  const css = panelListCss(5);
  const selectors = css
    .split("}")
    .map((chunk) => chunk.split("{")[0].trim())
    .filter(Boolean)
    .flatMap((group) => group.split(",").map((s) => s.trim()));
  assert.ok(selectors.length >= 6);
  for (const sel of selectors) {
    assert.match(sel, /:not\(\[class\*="collapsed"\]\)/, `缺少折叠作用域: ${sel}`);
  }
});

test("更多按钮（span 内）的悬停气泡也有对应规则", () => {
  const css = panelListCss(5);
  assert.match(css, /> span button\[class\*="panelRow"\]::after/);
  assert.match(css, /> span:nth-child\(5n \+ 1\) button\[class\*="panelRow"\]::after/);
  assert.match(css, /> span:nth-child\(5n\) button\[class\*="panelRow"\]::after/);
});

test("grid item 允许缩小以维持 5 列", () => {
  assert.match(panelListCss(5), />\s*\*\s*\{[^}]*min-width:\s*0/);
});
```

```powershell
node --test test/
```

Expected: 新加的三个 test 至少一个 FAIL（现有实现未覆盖 span 内按钮与 `min-width:0`）。

- [ ] **Step 2: 让每条规则都带上未折叠作用域**

把 `panelListCss` 里所有选择器统一以 `SEL.navList`（它自身已含 `:not([class*="collapsed"])`）为前缀，`panelRow` / `panelTitle` 都拼在它后面；不要出现任何独立的 `[data-windows-titlebar]` 或 `.collapsed` 规则。重跑 `node --test test/` 至全绿。

- [ ] **Step 3: 加降级与幂等**

在 `src/client.js` 的 `apply` 中：
- 用一个模块级 `let warned = false`；`document.querySelector(SEL.navList) === null` 时 `if (!warned) { warned = true; console.warn("[dsh-left-sidebar] 未找到侧边栏面板列表，5 列布局未生效（DSH 版本可能已变更选择器）"); }`。
- `ensureStyles()` 已幂等（存在即返回），保持。
- `ctx.effect` 的清理函数调用 `removeStyles()`，并在卸载后把 `warned` 复位。

- [ ] **Step 4: 重建并在第二实例上验证收起态（Review Focus 2）**

```powershell
pnpm build
# 停掉上一轮的 3199 实例再起新的（3179 保持不动）
Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object { $_.CommandLine -match '--port 3199' } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
Start-Process -FilePath 'node' -ArgumentList 'C:\dsh\node_modules\@deepseek-ai\dsh\lib\bin.js','web','--port','3199','--no-open' -WindowStyle Hidden
```

用新的 token URL 打开页面，在页面里：先记录展开态的 `display`，点 `document.querySelector('button[data-sidebar-toggle]').click()` 收起，再读一次，然后再次点击展开：

```js
const read = () => {
  const nav = document.querySelector('[data-slot="sidebar"] nav[class*="panelList"]');
  const cs = getComputedStyle(nav);
  return { display: cs.display, h: Math.round(nav.getBoundingClientRect().height), cellW: Math.round(nav.querySelector('button[class*="panelRow"]').getBoundingClientRect().width) };
};
const wide1 = read();
document.querySelector('button[data-sidebar-toggle]').click();
await new Promise((r) => setTimeout(r, 400));
const rail = read();
document.querySelector('button[data-sidebar-toggle]').click();
await new Promise((r) => setTimeout(r, 400));
return { wide1, rail, wide2: read() };
```

Expected: `wide1.display === "grid"`、`wide1.cellW` 约 50；`rail.display === "flex"` 且 `rail.cellW` 为 36；`wide2.display === "grid"` 且 `wide2.cellW` 约 50（往返后自动恢复，无需刷新）。

- [ ] **Step 5: 提交**

```powershell
git add -A
git commit -m "fix: 收起态零影响与选择器失效降级"
```

---

### Task 5: 三层结构与首次播种折叠

**Files:**
- Create: `src/view.js`
- Modify: `src/client.js`
- Create: `test/view.test.js`

**Interfaces:**
- Consumes: `src/seed.js` 的 `seedGroupKeys` / `shouldSetGroupBy` / `UNGROUPED_KEY`
- Produces: `src/view.js` → `export const SEEDED_KEY = "dsh-left-sidebar.seeded"`；`export function seedOnce(view, currentGroupBy, workspaceIds, groupExpansion, storage?): { seeded: boolean, keys: string[], groupBySet: boolean }`

- [ ] **Step 1: 写失败测试 `test/view.test.js`**

```js
import test from "node:test";
import assert from "node:assert/strict";
import { seedOnce, SEEDED_KEY } from "../src/view.js";

const memStorage = () => {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
};

const fakeView = () => {
  const calls = [];
  return {
    calls,
    setGroupBy: (mode) => calls.push(["setGroupBy", mode]),
    setGroupExpanded: (key, expanded) => calls.push(["setGroupExpanded", key, expanded]),
  };
};

test("首次播种：设置 groupBy 并把所有组键写 false", () => {
  const view = fakeView();
  const storage = memStorage();
  const r = seedOnce(view, "workspace", ["a", "b"], {}, storage);
  assert.equal(r.seeded, true);
  assert.equal(r.groupBySet, true);
  assert.deepEqual(r.keys, ["a", "b", ""]);
  assert.deepEqual(view.calls[0], ["setGroupBy", "workspace-tree"]);
  assert.deepEqual(view.calls.slice(1), [["setGroupExpanded", "a", false], ["setGroupExpanded", "b", false], ["setGroupExpanded", "", false]]);
  assert.equal(storage.getItem(SEEDED_KEY), "1");
});

test("已播种过：第二次调用完全不写", () => {
  const storage = memStorage();
  storage.setItem(SEEDED_KEY, "1");
  const view = fakeView();
  const r = seedOnce(view, "workspace", ["a"], {}, storage);
  assert.equal(r.seeded, false);
  assert.deepEqual(view.calls, []);
});

test("用户手动展开的组不被覆盖", () => {
  const view = fakeView();
  const r = seedOnce(view, "workspace-tree", ["a", "b"], { a: true, "": false }, memStorage());
  assert.equal(r.groupBySet, false);
  assert.deepEqual(r.keys, ["b"]);
  assert.deepEqual(view.calls, [["setGroupExpanded", "b", false]]);
});

test("groupBy 已是 workspace-tree 时不再重复设置", () => {
  const view = fakeView();
  seedOnce(view, "workspace-tree", ["a"], {}, memStorage());
  assert.deepEqual(view.calls, [["setGroupExpanded", "a", false], ["setGroupExpanded", "", false]]);
});

test("view 缺少写方法时安全返回（降级）", () => {
  const r = seedOnce({}, "workspace", ["a"], {}, memStorage());
  assert.equal(r.seeded, false);
  assert.deepEqual(r.keys, []);
});

test("工作区列表为空时不得置 seeded 标记", () => {
  const storage = memStorage();
  const r = seedOnce(fakeView(), "workspace", [], {}, storage);
  assert.equal(r.seeded, false);
  assert.equal(storage.getItem(SEEDED_KEY), null);
});
```

- [ ] **Step 2: 运行确认失败**

```powershell
node --test test/
```

Expected: FAIL —— `Cannot find module '../src/view.js'`。

- [ ] **Step 3: 实现 `src/view.js`**

```js
import { seedGroupKeys, shouldSetGroupBy } from "./seed.js";

export const SEEDED_KEY = "dsh-left-sidebar.seeded";

/**
 * 只播一次：置 seeded 标记、必要时切 groupBy、把未记录的组键写 false。
 * 空工作区列表直接返回且不落标记 —— 服务可能还没就绪，不能把"空"当成"没有工作区"。
 */
export function seedOnce(view, currentGroupBy, workspaceIds, groupExpansion, storage = globalThis.localStorage) {
  const skip = { seeded: false, keys: [], groupBySet: false };
  if (typeof view?.setGroupExpanded !== "function") return skip;
  if (storage?.getItem(SEEDED_KEY) === "1") return skip;
  if (!Array.isArray(workspaceIds) || workspaceIds.length === 0) return skip;

  const keys = seedGroupKeys(workspaceIds, groupExpansion ?? {});
  let groupBySet = false;
  if (typeof view.setGroupBy === "function" && shouldSetGroupBy(currentGroupBy)) {
    view.setGroupBy("workspace-tree");
    groupBySet = true;
  }
  for (const key of keys) view.setGroupExpanded(key, false);
  storage?.setItem(SEEDED_KEY, "1");
  return { seeded: true, keys, groupBySet };
}
```

- [ ] **Step 4: 在 `src/client.js` 接入**

在 `apply(ctx)` 里，样式注入之后追加：

```js
ctx.inject(["uiWorkspace", "workspaces"], (injected) => {
  const view = injected.uiWorkspace?.view;
  const list = injected.workspaces?.list;
  if (typeof view?.setGroupExpanded !== "function" || typeof list?.subscribe !== "function") {
    console.warn("[dsh-left-sidebar] uiWorkspace.view 不可写，三层与默认折叠未生效（5 列布局不受影响）");
    return;
  }

  let stop = false;
  let unsubscribe = null;
  const done = () => {
    stop = true;
    if (unsubscribe) unsubscribe();
    unsubscribe = null;
  };

  const attempt = () => {
    if (stop) return;
    const snapshot = list.getSnapshot();
    if (snapshot?.phase !== "ready") return;          // 服务未就绪：等下一次通知，不落 seeded
    const workspaceIds = snapshot.items.map((w) => w.workspaceId);
    const result = seedOnce(view, readGroupBy(), workspaceIds, readGroupExpansion());
    if (result.seeded) done();
  };

  attempt();                                           // phase 可能已就绪，subscribe 不会补发首帧
  if (!stop) unsubscribe = list.subscribe(attempt);
  return () => { stop = true; if (unsubscribe) unsubscribe(); unsubscribe = null; };
}, "dsh-left-sidebar: seed");
```

三个必须遵守的细节：
- **先 `attempt()` 再 `subscribe`**：`subscribe` 只在后续变更时通知，不保证补发当前帧；服务若在 apply 时就绪，只订阅会永远等不到通知。
- **`unsubscribe` 用 `let` 声明并判空**：`const unsubscribe = list.subscribe(cb)` 里若 `cb` 同步执行，会撞上 TDZ 抛 `ReferenceError`。
- **`stop` 标记**：播种成功后 `done()` 里置位，避免清理函数与 `attempt` 重入时二次 `unsubscribe`。

`readGroupBy()` / `readGroupExpansion()` 从 `localStorage["dsh.workspace.view.v5"]` 解析（`JSON.parse` 失败时分别返回 `"workspace"` 与 `{}`），因为 store 没有公开的读方法。

- [ ] **Step 5: 运行全部单测**

```powershell
node --test test/
```

Expected: 全部 PASS。

- [ ] **Step 6: 重建并验证三层与默认折叠（Review Focus 3、4）**

```powershell
pnpm build
```

先清掉本轮自己的播种痕迹再重启：

```powershell
node -e "const f=process.env.LOCALAPPDATA; console.log('请在页面里执行下面的清理')"
```

页面里执行：

```js
localStorage.removeItem("dsh-left-sidebar.seeded");
const raw = JSON.parse(localStorage.getItem("dsh.workspace.view.v5") || "{}");
raw.groupBy = "workspace";
raw.groupExpansion = {};
localStorage.setItem("dsh.workspace.view.v5", JSON.stringify(raw));
location.reload();
```

reload 后（等 2 秒）执行：

```js
const raw = JSON.parse(localStorage.getItem("dsh.workspace.view.v5"));
const collapsed = Object.entries(raw.groupExpansion).filter(([, v]) => v === false).map(([k]) => k);
const expanded = Object.entries(raw.groupExpansion).filter(([, v]) => v === true).map(([k]) => k);
const projectRows = document.querySelectorAll('[data-slot="sidebar"] [class*="projectRow"]');
const sessionRows = document.querySelectorAll('[data-slot="sidebar"] [class*="sessionRow"], [data-slot="sidebar"] [class*="sessionNode"]');
return { groupBy: raw.groupBy, collapsedCount: collapsed.length, expanded, seeded: localStorage.getItem("dsh-left-sidebar.seeded"), projectRowCount: projectRows.length, sessionRowCount: sessionRows.length };
```

Expected: `groupBy === "workspace-tree"`；`expanded` 为空数组；`collapsedCount` 等于工作区数 + 1；`seeded === "1"`；`sessionRowCount === 0`（第一屏只有项目行）。

- [ ] **Step 7: 验证不覆盖用户选择（Review Focus 4）**

点开任意一个项目行（展开），再 `location.reload()`，等 2 秒后执行：

```js
const raw = JSON.parse(localStorage.getItem("dsh.workspace.view.v5"));
return { expanded: Object.entries(raw.groupExpansion).filter(([, v]) => v === true).map(([k]) => k), seeded: localStorage.getItem("dsh-left-sidebar.seeded") };
```

Expected: `expanded.length === 1`（刚展开的那个项目仍在 `true`），`seeded === "1"`。

- [ ] **Step 8: 提交**

```powershell
git add -A
git commit -m "feat: 工作区三层结构与首次启用默认折叠"
```

---

### Task 6: 文档、验收报告与公开仓推送

**Files:**
- Create: `README.md`（覆写 Task 1 的空壳）
- Create: `CHANGELOG.md`
- Create: `verify/2026-11-08-acceptance.md`
- Modify: `package.json`（`repository` / `homepage` / `bugs` 字段）

**Interfaces:**
- Consumes: Task 1–5 的全部产物
- Produces: 可被 dsh 插件市场索引的公开仓库 `xyh-2012/dsh-left-sidebar`

- [ ] **Step 1: 写 `README.md`**

必含小节：**这是什么**（一句话）、**效果**（5 列网格 + 三层树，各一段）、**安装**（`dsh plugin --profile web add link:<path>` 或 `dsh plugin --profile web add dsh-left-sidebar`）、**已知限制**（三条：第二层只认已注册为工作区的目录，未注册的中间目录会被跳过；跨层移动工作区只能删了重加；仅支持 web profile，桌面壳未验证）、**依赖的未公开接口**（`ctx.get("uiWorkspace").view`，DSH 升级可能失效）、**降级与恢复**（失效时侧边栏回官方外观，仅 5 列可能不生效；恢复默认折叠只需删 `localStorage` 的 `dsh-left-sidebar.seeded` 后刷新）、**卸载**（`dsh plugin --profile web remove dsh-left-sidebar`，并清理该 localStorage 键）。

- [ ] **Step 2: 写 `CHANGELOG.md`**

```
# Changelog

## 0.1.0 (2026-11-08)

- 展开态侧边栏插件图标改为 5 列网格，悬停显示图标标题。
- 工作区浏览默认切换为「项目 → 工作目录 → 会话」三层树。
- 首次启用时所有分组默认折叠，只播种一次，之后尊重用户手动状态。
```

- [ ] **Step 3: 写验收报告 `verify/2026-11-08-acceptance.md`**

按 V1–V10 逐条列：检查项、实测命令/脚本、实测输出、结论。每条必须贴真实数字（如 `gridTemplateColumns` 的实际值、`navHeight`、`groupExpansion` 的键值），不允许写「应该通过」。

- [ ] **Step 4: 补 `package.json` 仓库字段**

```json
"repository": { "type": "git", "url": "git+https://github.com/xyh-2012/dsh-left-sidebar.git" },
"homepage": "https://github.com/xyh-2012/dsh-left-sidebar#readme",
"bugs": { "url": "https://github.com/xyh-2012/dsh-left-sidebar/issues" }
```

- [ ] **Step 5: 建公开仓并推送**

```powershell
cd C:\dsh\plugins\dsh-left-sidebar
git add -A
git commit -m "docs: README、CHANGELOG 与验收报告"
gh repo create xyh-2012/dsh-left-sidebar --public --source . --remote origin --push
```

Expected: 输出仓库 URL；`git remote -v` 显示 `origin`；`gh repo view xyh-2012/dsh-left-sidebar --json visibility` 返回 `{"visibility":"PUBLIC"}`。

- [ ] **Step 6: 最终验收**

重启 dsh web，按 `verify/2026-11-08-acceptance.md` 的 V1–V10 全表复跑一遍，把每条的实测输出填进报告；任何一条不符则回到对应 Task 修复后重跑。

---

## Self-Review

**1. 规格覆盖**：G1 → Task 3（5 列）+ Task 3 Step 6（悬停标题）；G2 → Task 5；G3 → Task 5 Step 6/7；G4/G5 → 复用官方实现，Task 6 的验收报告 V8/V9 记录实测；G6 → Task 1 + Task 6 Step 5。N1–N5 由 Global Constraints 与 Task 1 的文件清单保证（无 `sidebar.workspaces` 注册、无 `main` 槽）。A1–A3 分别由 Review Focus 1（点击命中）、Task 5 Step 7（不覆盖用户选择）、Task 4 Step 3（降级）覆盖。

**2. 步骤扫描**：每个 Step 都给出一个可执行动作与可判定结果；所有验收脚本都断言具体数值（列宽、格尺寸、`aria-current` 下标、`::after` 的 `left/right`），不写「看起来正常」。Task 5 的 `seedOnce` 签名在 Interfaces、Step 1 测试、Step 3 实现、Step 4 调用四处已统一为 `(view, currentGroupBy, workspaceIds, groupExpansion, storage)`，消除了早期版本里 `view._groupBy` 这种不存在的属性。

**3. 类型一致**：`seedGroupKeys(workspaceIds, groupExpansion)`、`shouldSetGroupBy(current)`、`seedOnce(view, currentGroupBy, workspaceIds, groupExpansion, storage)`、`panelListCss(columns)`、`ensureStyles()/removeStyles()`、`SEEDED_KEY`、`UNGROUPED_KEY` 在各 Task 间名称一致。

**4. Review Focus 对应测试**：1 → Task 3 Step 5（点击命中）；2 → Task 4 Step 4（收起/展开往返）；3 → Task 5 Step 1 的「空列表不得落标记」测试 + Step 6；4 → Task 5 Step 7；5 → Task 3 Step 6（首末列贴边断言）。

**5. 篇幅比例**：计划约 820 行（含每步的验收脚本），规格 314 行；代码块只出现在测试断言、CSS 规则、纯函数签名与必须精确的 CLI 命令处，未转录实现体。

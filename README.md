# dsh-left-sidebar

> DSH 左侧边栏增强：插件图标改成 5 列网格，工作区改成「项目 → 工作目录 → 会话」三层树并默认折叠。

[![powered by dsh](https://img.shields.io/badge/powered%20by-dsh-6E56CF)](https://github.com/deepseek-ai/dsh)

## 这是什么

一个纯 CSS + 少量 Host API 调用的 DSH Web 插件，不替换任何官方 React 组件，只做两件事：

1. 把侧边栏里那一列插件图标铺成 **5 × n 网格**，鼠标悬停显示图标标题。
2. 把工作区浏览区默认切到 **三层树（项目 → 工作目录 → 会话）**，并在首次启用时把所有层级**默认折叠**。

## 效果

### 插件图标 5 列网格

展开态（侧边栏 280px）下，原本 302px 高的单列图标列表压缩成 72px 的两行网格，每个格子 50×34。鼠标悬停时在图标下方浮出该图标的标题气泡。收起态（rail，56px）完全保持官方单列外观，不做任何改动。

实测：`display: grid`、`grid-template-columns: repeat(5, minmax(0, 1fr))`、`navHeight` 302 → 72、每格 50×34。

### 三层树与默认折叠

第一层是项目（工作区），第二层是工作目录（子工作区），第三层是会话。首次启用时写入一次默认折叠，让所有项目/目录/会话都处于收起状态，侧边栏一眼看到全部项目。

实测：`groupBy: "workspace-tree"`、`groupExpansion` 里 7 个键全部为 `false`、可见行仅 4 个项目行、0 个会话行。

每一层的右侧都有官方自带的 `...` 操作菜单（工作区行是「工作区"X"的操作」，会话行是「会话"X"的操作」），本插件没有另造菜单，直接复用。

## 安装

从本地目录（开发）：

```powershell
node <dsh>/lib/bin.js plugin --profile web add link:C:\path\to\dsh-left-sidebar
```

从 npm（发布后）：

```powershell
dsh plugin --profile web add dsh-left-sidebar
```

安装后需要把包名加进 profile 的 `dsh.profile.bundles`（`plugin add` 只会写 `dependencies`）：

```jsonc
// ~/.dsh/profiles/web/package.json
{
  "dsh": {
    "profile": {
      "bundles": [ /* ... */, "dsh-left-sidebar" ]
    }
  }
}
```

然后重启 `dsh web`。

## 已知限制

1. **第二层只认「已注册为工作区」的目录。** 三层树的父子关系由 DSH 官方的 `owningParentFolder` 计算，它只匹配那些本身已被注册成工作区的祖先路径，并且路径比较大小写敏感。像 `C:\code\dsh_workdir\project\dida-task-local` 这种中间目录 `project` 没被注册的，会被跳过（深度被压缩，但不会塌成两层）。
2. **跨层移动工作区只能删了重加。** 拖拽只能在同层内改顺序（官方 `insertWorkspaceBefore` 的行为），把某个工作区从「项目」挪成另一个项目的「工作目录」需要先删除再在目标位置重新添加。
3. **仅支持 web profile，桌面壳未验证。** `package.json` 的 `dsh.compatibility.profiles` 只声明了 `web`。桌面壳用的是 Windows titlebar 分支，侧边栏收起态官方行为是直接隐藏面板列表，本插件的样式作用域能避开，但没有实测过。

## 依赖的未公开接口

三层切换与首次播种用到了 `ctx.get("uiWorkspace").view`：

- `view.setGroupBy("workspace-tree")`
- `view.setGroupExpanded(key, false)`

这两个方法来自 `@deepseek-ai/dsh-client-ui-workspace` 内部 store 的 actions，**没有出现在 `UiWorkspace` 的公开类型声明里**。DSH 升级后如果它们被移除或改名，插件会：

- 捕获不到写方法 → `console.warn` 一次，**跳过三层与折叠**，5 列网格照常工作。
- 已存在的用户状态不会被破坏（插件从不删除 `groupExpansion` 里的键，只写 `false`）。

另外，读当前状态（`groupBy` / `groupExpansion`）走的是 `localStorage["dsh.workspace.view.v5"]` 的只读解析——因为 store 没有公开 getter。该键名随 DSH 版本变（现在是 v5），解析失败时降级为官方默认值。

## 降级与恢复

- **样式失效**：如果 DSH 改了面板列表的 class 前缀，5 列网格会静默不生效（`console.warn` 一次），侧边栏回退到官方外观。此时改 `src/selectors.js` 里的 `SEL` 常量表即可，该文件是全部选择器的唯一来源。
- **恢复默认展开**：删掉 `localStorage` 里的 `dsh-left-sidebar.seeded` 键再刷新，插件会重新播种一次折叠状态。或者在侧边栏里手动展开想要的项目，插件不会覆盖。
- **回到官方视图**：View options 里把 Group by 改回 `WorkSpace` 即可，插件只在首次播种时设置一次 `groupBy`，之后不强制。

## 卸载

```powershell
dsh plugin --profile web remove dsh-left-sidebar
```

并从 profile 的 `dsh.profile.bundles` 里删掉 `"dsh-left-sidebar"`。最后在浏览器控制台清理本地状态：

```js
localStorage.removeItem("dsh-left-sidebar.seeded");
```

（`dsh.workspace.view.v5` 是官方键，不要删——它同时保存着你在官方 UI 里的其它偏好。）

## 开发

```powershell
pnpm install
pnpm build   # esbuild 打包 src/client.js -> client.js（包进 __ModuleLoader__ 外壳）
pnpm test    # node --test test/
```

源码结构：

| 文件 | 职责 |
| --- | --- |
| `src/selectors.js` | 全部 DOM 选择器常量 + 生成 5 列网格 CSS 的纯函数 |
| `src/seed.js` | 折叠播种的纯函数（`seedGroupKeys` / `shouldSetGroupBy`） |
| `src/view.js` | 一次性播种编排 + localStorage 只读解析 |
| `src/client.js` | 插件入口：注入/移除 `<style>`、等 workspaces 就绪后播种 |
| `build.mjs` | esbuild 打包，把产物包进 `window.__ModuleLoader__.load({ id, factory })` |

设计约束（不可违反）：

- **绝不改写 React 管理的 DOM。** 只注入 `<style>`，不加节点、不加属性、不搬 DOM。
- 选择器只用 `data-slot` 和 `class*="..."` 片段，**不含任何 CSS module 哈希前缀**。
- 每条规则都限定在 `:not([class*="collapsed"])` 作用域内，收起态零影响。

## License

MIT

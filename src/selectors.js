// 侧边栏 DOM 选择器与 5 列网格 CSS 的唯一来源。
// 全部选择器只用 data-slot 与 class*="..." 片段，不含任何 hash 前缀
// （官方 CSS module 的哈希会随版本变），升级断链时只改这一个文件。

export const PANEL_COLUMNS = 5;

export const SEL = {
  sidebarRoot: '[data-slot="sidebar"]',
  // 仅用于「侧边栏是否已挂载」的探测：不带折叠作用域，收起态也能命中。
  navListAny: '[data-slot="sidebar"] nav[class*="panelList"]',
  navList:
    '[data-slot="sidebar"] div:has(> nav[class*="panelList"]):not([class*="collapsed"]) > nav[class*="panelList"]',
  panelRow: 'button[class*="panelRow"]',
  panelTitle: 'span[class*="panelTitle"]',
};

/**
 * 生成把面板列表变成 columns 列网格的完整 CSS。
 * 只在展开态生效：收起态（rail）宽 36px，放不下网格，保持官方单列。
 * @param {number} columns
 * @returns {string}
 */
export function panelListCss(columns) {
  const nav = SEL.navList;
  return `
/* 1. 容器：单列 flex -> columns 列 grid */
${nav} {
  display: grid;
  grid-template-columns: repeat(${columns}, minmax(0, 1fr));
  gap: 4px;
  flex-direction: unset;
  margin-bottom: 8px;
}

/* 2. 格子：grid item 默认 min-width:auto，会被内容撑爆列宽 */
${nav} > * {
  min-width: 0;
}

/* 3. 行：铺满格子、去掉侧边留白 */
${nav} ${SEL.panelRow} {
  width: auto;
  min-width: 0;
  min-height: 34px;
  height: 34px;
  padding: 0;
  border-inline: 0;
  justify-content: center;
  position: relative;
}

/* 4. 标题：网格里放不下文字，悬停气泡代替 */
${nav} ${SEL.panelTitle} {
  display: none;
}

/* 5. 悬停气泡本体。两条选择器缺一不可：
      第 ${columns} 格「更多」按钮嵌在 span 里，不在 nav 直接子级。 */
${nav} > button[class*="panelRow"]::after,
${nav} > span button[class*="panelRow"]::after {
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
  z-index: 60;
  display: block;
}

/* 6. 贴边对齐：首列左对齐、末列右对齐，避免被侧边栏 overflow 裁掉 */
${nav} > button:nth-child(${columns}n + 1)::after,
${nav} > span:nth-child(${columns}n + 1) button[class*="panelRow"]::after {
  left: 0;
  transform: none;
}

${nav} > button:nth-child(${columns}n)::after,
${nav} > span:nth-child(${columns}n) button[class*="panelRow"]::after {
  left: auto;
  right: 0;
  transform: none;
}

/* 7. 悬停显形。无需 nth-child 变体。 */
${nav} > button[class*="panelRow"]:hover::after,
${nav} > span button[class*="panelRow"]:hover::after {
  opacity: 1;
}
`;
}

/**
 * 层级缩进兼容层。
 *
 * 官方用行上的 `padding-inline-start: ... + var(--dsh-workspace-indent)` 表达层级。
 * 但皮肤插件（如 @smalltailqwq/dsh-client-ui-skin-maid-atelier）用 `padding` 简写
 * 重写了整条行规则，把 padding-inline-start 一起覆盖掉，缩进变量就失效了：
 * 父行与子行的文字左边界完全重合，三层结构退化成看不见的平铺列表。
 *
 * 这里不去跟皮肤抢 `padding`（简写的特异性更高，且各行 padding 基准值由皮肤决定，
 * 硬写基准值会把皮肤自己的左留白改掉），改成叠加 `margin-inline-start`：
 * 它与 padding 互不干扰、不依赖基准值，变量为 0 时是 no-op；同时把宽度扣掉缩进量，
 * 避免右边缘被侧边栏的 overflow:hidden 裁掉。
 *
 * 只应在探测确认「缩进被吃掉」时生效（调用方把标记打到 <html> 上），
 * 否则官方环境下会变成双倍缩进。
 *
 * @param {string} flagAttr 打标记用的属性名，如 data-dsh-left-sidebar-indent
 * @returns {string}
 */
export function indentFallbackCss(flagAttr) {
  return `
/* 行 padding 被第三方样式覆盖时，用 margin 把层级缩进补回来 */
html[${flagAttr}] ${SEL.sidebarRoot} [data-row-key] {
  margin-inline-start: var(--dsh-workspace-indent, 0px);
  width: calc(100% - var(--dsh-workspace-indent, 0px));
}

/* 缩进量只有 12px，单靠横向位移在窄侧边栏里仍不够醒目，
   再给嵌套分组画一条竖引导线：子的列对齐父的列，一眼看出归属。
   用 currentColor + 低透明度，深浅主题都不用另配颜色。 */
html[${flagAttr}] ${SEL.sidebarRoot} div[class*="groupSection"] div[class*="groupSection"] {
  position: relative;
}

html[${flagAttr}] ${SEL.sidebarRoot} div[class*="groupSection"] div[class*="groupSection"]::before {
  content: "";
  position: absolute;
  top: 4px;
  bottom: 4px;
  left: 2px;
  width: 2px;
  border-radius: 1px;
  background: currentColor;
  opacity: 0.35;
  pointer-events: none;
  z-index: 3;
}
`;
}

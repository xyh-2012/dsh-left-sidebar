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

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
    assert.doesNotMatch(value, /_[a-zA-Z0-9]{5}_\d/);
  }
});

test("锚点选择器以 data-slot 为根，行/标题是相对选择器", () => {
  assert.match(SEL.sidebarRoot, /data-slot="sidebar"/);
  assert.match(SEL.navList, /data-slot="sidebar"/);
  // panelRow / panelTitle 在 CSS 里永远嵌套在 navList 之下，写成相对选择器
  // 才能同时命中「直接子级按钮」和「span 内的更多按钮」。
  assert.doesNotMatch(SEL.panelRow, /data-slot=/);
  assert.doesNotMatch(SEL.panelTitle, /data-slot=/);
});

/** 抽出 CSS 里每一条前置选择器（先去注释，再按 } 切块、按 , 拆组）。 */
function selectorsOf(css) {
  return css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("}")
    .map((chunk) => chunk.split("{")[0].trim())
    .filter(Boolean)
    .flatMap((group) => group.split(",").map((s) => s.trim()))
    .filter(Boolean);
}

test("每条 CSS 规则的前置选择器都限定在未折叠作用域内", () => {
  const selectors = selectorsOf(panelListCss(5));
  assert.ok(selectors.length >= 6, `规则条数过少: ${selectors.length}`);
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

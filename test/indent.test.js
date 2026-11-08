import test from "node:test";
import assert from "node:assert/strict";
import { indentFallbackCss, panelListCss } from "../src/selectors.js";
import { indentLostFrom } from "../src/client.js";

const FLAG = "data-dsh-left-sidebar-indent";

test("父行与子行左边界重合时判定为缩进丢失", () => {
  const rows = [
    { kind: "workspace", indent: 0, padStart: 10 },
    { kind: "workspace", indent: 12, padStart: 10 }, // 被皮肤 padding 简写压平
  ];
  assert.equal(indentLostFrom(rows), true);
});

test("父行与子行左边界不同则判定正常", () => {
  const rows = [
    { kind: "workspace", indent: 0, padStart: 10 },
    { kind: "workspace", indent: 12, padStart: 22 },
    { kind: "session", indent: 0, padStart: 24 },
    { kind: "session", indent: 12, padStart: 36 },
  ];
  assert.equal(indentLostFrom(rows), false);
});

test("只有父行、没有子行时判不出来（默认全折叠）", () => {
  assert.equal(indentLostFrom([{ kind: "workspace", indent: 0, padStart: 10 }]), false);
  assert.equal(indentLostFrom([]), false);
});

test("行类型各自比较，会话行正常不掩盖项目行丢失", () => {
  const rows = [
    { kind: "workspace", indent: 0, padStart: 10 },
    { kind: "workspace", indent: 12, padStart: 10 },
    { kind: "session", indent: 0, padStart: 24 },
    { kind: "session", indent: 12, padStart: 36 },
  ];
  assert.equal(indentLostFrom(rows), true);
});

test("缩进兼容层挂在 html 标记上，且不改 padding", () => {
  const css = indentFallbackCss(FLAG);
  assert.match(css, new RegExp(`html\\[${FLAG}\\]`));
  assert.match(css, /margin-inline-start:\s*var\(--dsh-workspace-indent,\s*0px\)/);
  assert.doesNotMatch(css, /(^|[^-])padding:/);
});

test("嵌套分组带竖引导线，且只画在子层", () => {
  const css = indentFallbackCss(FLAG);
  assert.match(css, /div\[class\*="groupSection"\]\s+div\[class\*="groupSection"\]::before/);
  assert.match(css, /background:\s*currentColor/);
  assert.match(css, /pointer-events:\s*none/);
  // 引导线不能画在顶层分组上（顶层没有父缩进，画了会贴着侧边栏边框）
  const preludes = css
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .split("}")
    .map((chunk) => chunk.split("{")[0].trim())
    .filter(Boolean)
    .flatMap((group) => group.split(",").map((s) => s.trim()));
  const single = preludes.filter((p) => p.endsWith('::before'));
  for (const p of single) {
    assert.equal(
      p.match(/groupSection/g)?.length ?? 0,
      2,
      `引导线只应对嵌套分组生效，实际出现：${p}`,
    );
  }
});

test("兼容层与 5 列样式是两段独立 CSS，互不污染", () => {
  const grid = panelListCss(5);
  const fallback = indentFallbackCss(FLAG);
  assert.doesNotMatch(grid, /margin-inline-start:\s*var\(--dsh-workspace-indent/);
  assert.doesNotMatch(fallback, /grid-template-columns/);
});

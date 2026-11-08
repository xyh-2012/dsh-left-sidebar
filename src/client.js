// dsh-left-sidebar — client 半（浏览器）。
//
// 设计约束（与 dsh-settings-nav-manager 同源）：
//   1. 绝不改写 React 管理的 DOM 结构。只注入 <style>，交互全部交给官方组件。
//   2. 选择器只写在 selectors.js 里，不含 class 哈希前缀。
//   3. 侧边栏可能在插件 apply 之后才挂载，所以样式无条件注入；
//      「选择器命中不了」只 warn 一次，不抛错、不重试、不阻断。
import { PANEL_COLUMNS, SEL, panelListCss } from "./selectors.js";

export const name = "dsh-left-sidebar";
export const STYLE_TAG = "dsh-left-sidebar";

let warned = false;

/** 注入展开态 5 列网格样式（幂等）。 */
export function ensureStyles() {
  if (document.querySelector(`style[data-dsh-left-sidebar="${STYLE_TAG}"]`)) return;
  const tag = document.createElement("style");
  tag.setAttribute("data-dsh-left-sidebar", STYLE_TAG);
  tag.textContent = panelListCss(PANEL_COLUMNS);
  document.head.appendChild(tag);
}

/** 移除本插件注入的样式；其它插件的 <style> 不受影响。 */
export function removeStyles() {
  document.querySelector(`style[data-dsh-left-sidebar="${STYLE_TAG}"]`)?.remove();
}

/** 只在第一次命中失败时提示，避免每帧刷屏。 */
function warnIfMissing() {
  if (warned) return;
  if (typeof document === "undefined") return;
  if (document.querySelector(SEL.navList)) return;
  warned = true;
  console.warn(
    "[dsh-left-sidebar] 未找到侧边栏面板列表（可能仍处于收起态或 DSH 版本已变更）。样式已注入，命中后自动生效。",
  );
}

export function apply(ctx) {
  ctx.effect(() => {
    ensureStyles();
    warnIfMissing();
    return () => removeStyles();
  }, "dsh-left-sidebar: styles");
}

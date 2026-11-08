// dsh-left-sidebar — client 半（浏览器）。
//
// 设计约束（与 dsh-settings-nav-manager 同源）：
//   1. 绝不改写 React 管理的 DOM 结构。只注入 <style>，交互全部交给官方组件。
//   2. 选择器只写在 selectors.js 里，不含 class 哈希前缀。
//   3. 侧边栏可能在插件 apply 之后才挂载，所以样式无条件注入；
//      「选择器命中不了」只 warn 一次，不抛错、不重试、不阻断。
//   4. 三层结构与默认折叠只在首次启用时播种一次；之后用户的手动状态优先。
import { PANEL_COLUMNS, SEL, indentFallbackCss, panelListCss } from "./selectors.js";
import { readGroupBy, readGroupExpansion, seedOnce } from "./view.js";

export const name = "dsh-left-sidebar";
export const STYLE_TAG = "dsh-left-sidebar";
/** 挂在 <html> 上：检测到层级缩进被第三方样式吃掉时置为 "lost"。 */
export const INDENT_FLAG_ATTR = "data-dsh-left-sidebar-indent";

let warned = false;

/** 注入展开态 5 列网格样式（幂等）。 */
export function ensureStyles() {
  if (document.querySelector(`style[data-dsh-left-sidebar="${STYLE_TAG}"]`)) return;
  const tag = document.createElement("style");
  tag.setAttribute("data-dsh-left-sidebar", STYLE_TAG);
  tag.textContent = panelListCss(PANEL_COLUMNS) + indentFallbackCss(INDENT_FLAG_ATTR);
  document.head.appendChild(tag);
}

/** 移除本插件注入的样式；其它插件的 <style> 不受影响。 */
export function removeStyles() {
  document.querySelector(`style[data-dsh-left-sidebar="${STYLE_TAG}"]`)?.remove();
  document.documentElement.removeAttribute(INDENT_FLAG_ATTR);
}

/**
 * 面板列表是官方侧边栏组件挂载后才有的，而插件 apply 早于它。
 * 所以这里不能同步判断，要延后重试若干次；确实一直没有才 warn 一次。
 */
const PROBE_DELAYS_MS = [0, 300, 1000, 2500];

/** @returns {number[]} 需要清理的定时器 */
function warnIfMissing() {
  if (typeof document === "undefined") return [];
  const timers = [];
  const probe = (index) => {
    if (warned) return;
    if (document.querySelector(SEL.navListAny)) return;
    if (index >= PROBE_DELAYS_MS.length) {
      warned = true;
      console.warn(
        "[dsh-left-sidebar] 未找到侧边栏面板列表（DSH 版本可能已变更）。样式已注入，命中后自动生效。",
      );
      return;
    }
    timers.push(globalThis.setTimeout(() => probe(index + 1), PROBE_DELAYS_MS[index]));
  };
  probe(0);
  return timers;
}

/**
 * 判断层级缩进是否被第三方样式吃掉了（纯函数，便于单测）。
 *
 * 官方靠行上的 `padding-inline-start: ... + var(--dsh-workspace-indent)` 表达层级。
 * 若某个缩进 > 0 的行，其 padding-inline-start 与同类中缩进为 0 的行完全相同，
 * 说明那条规则被覆盖了（皮肤常用 padding 简写覆盖整行）。
 *
 * 需要同时存在父行与子行才能判断；判不出来时返回 false（宁可不补，也不要双倍缩进）。
 *
 * @param {{kind: string, indent: number, padStart: number}[]} rows
 * @returns {boolean}
 */
export function indentLostFrom(rows) {
  const bases = new Map();
  for (const row of rows) {
    if (row.indent === 0 && !bases.has(row.kind)) bases.set(row.kind, row.padStart);
  }
  for (const row of rows) {
    if (row.indent <= 0) continue;
    const base = bases.get(row.kind);
    if (base === undefined) continue;
    if (Math.abs(row.padStart - base) < 1) return true;
  }
  return false;
}

/**
 * 从真实 DOM 采样后交给 indentLostFrom 判断。
 * 默认全折叠时没有子行、判不出来，所以调用方要反复探（见 watchIndent）。
 */
export function indentIsLost(root = document) {
  const rows = [...root.querySelectorAll(`${SEL.sidebarRoot} [data-row-key]`)];
  if (rows.length === 0) return false;
  return indentLostFrom(
    rows.map((row) => {
      const style = getComputedStyle(row);
      return {
        kind: row.getAttribute("data-row-key").split(":")[0],
        indent: parseFloat(style.getPropertyValue("--dsh-workspace-indent")) || 0,
        padStart: parseFloat(style.paddingInlineStart) || 0,
      };
    }),
  );
}

/**
 * 持续观察侧边栏：一旦出现「父行与子行左边界重合」就把标记打到 <html> 上，
 * 样式表里那条 margin 兜底规则随即生效。
 * 默认全折叠时没有子行、判不出来，所以不能只探一次；用 MutationObserver 在树变化时重判。
 */
function watchIndent() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {};
  let queued = false;
  const check = () => {
    queued = false;
    if (document.documentElement.hasAttribute(INDENT_FLAG_ATTR)) return;
    if (indentIsLost()) document.documentElement.setAttribute(INDENT_FLAG_ATTR, "lost");
  };
  const observer = new MutationObserver(() => {
    if (queued) return;
    queued = true;
    globalThis.setTimeout(check, 120);
  });
  observer.observe(document.body, { childList: true, subtree: true });
  const timer = globalThis.setTimeout(check, 400);
  return () => {
    observer.disconnect();
    globalThis.clearTimeout(timer);
  };
}

export function apply(ctx) {
  ctx.effect(() => {
    ensureStyles();
    const timers = warnIfMissing();
    const stopWatching = watchIndent();
    return () => {
      for (const id of timers) globalThis.clearTimeout(id);
      stopWatching();
      removeStyles();
      warned = false;
    };
  }, "dsh-left-sidebar: styles");

  // 三层结构与默认折叠：等 workspaces 列表就绪后播种一次。
  ctx.inject(["uiWorkspace", "workspaces"], (injected) => {
    const view = injected.uiWorkspace?.view;
    const list = injected.workspaces?.list;
    if (typeof view?.setGroupExpanded !== "function" || typeof list?.subscribe !== "function") {
      console.warn(
        "[dsh-left-sidebar] uiWorkspace.view 不可写，三层与默认折叠未生效（5 列布局不受影响）。",
      );
      return;
    }

    let stop = false;
    let unsubscribe = null;

    const attempt = () => {
      if (stop) return;
      const snapshot = list.getSnapshot();
      if (snapshot?.phase !== "ready") return; // 未就绪：等下一次通知，不落 seeded 标记
      const workspaceIds = snapshot.items.map((w) => w.workspaceId);
      const result = seedOnce(view, readGroupBy(), workspaceIds, readGroupExpansion());
      if (!result.seeded) return;
      stop = true;
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    };

    // 先 attempt 再 subscribe：subscribe 只在后续变更时通知，不补发当前帧。
    attempt();
    if (!stop) unsubscribe = list.subscribe(attempt);

    return () => {
      stop = true;
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    };
  }, "dsh-left-sidebar: seed");
}

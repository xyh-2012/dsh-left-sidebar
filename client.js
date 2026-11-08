window.__ModuleLoader__.load({ id: "dsh-left-sidebar", factory: function (require) {
  var module = { exports: {} };
  var exports = module.exports;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name2 in all)
    __defProp(target, name2, { get: all[name2], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/client.js
var client_exports = {};
__export(client_exports, {
  INDENT_FLAG_ATTR: () => INDENT_FLAG_ATTR,
  STYLE_TAG: () => STYLE_TAG,
  apply: () => apply,
  ensureStyles: () => ensureStyles,
  indentIsLost: () => indentIsLost,
  indentLostFrom: () => indentLostFrom,
  name: () => name,
  removeStyles: () => removeStyles
});
module.exports = __toCommonJS(client_exports);

// src/selectors.js
var PANEL_COLUMNS = 5;
var SEL = {
  sidebarRoot: '[data-slot="sidebar"]',
  // 仅用于「侧边栏是否已挂载」的探测：不带折叠作用域，收起态也能命中。
  navListAny: '[data-slot="sidebar"] nav[class*="panelList"]',
  navList: '[data-slot="sidebar"] div:has(> nav[class*="panelList"]):not([class*="collapsed"]) > nav[class*="panelList"]',
  panelRow: 'button[class*="panelRow"]',
  panelTitle: 'span[class*="panelTitle"]'
};
function panelListCss(columns) {
  const nav = SEL.navList;
  return `
/* 1. \u5BB9\u5668\uFF1A\u5355\u5217 flex -> columns \u5217 grid */
${nav} {
  display: grid;
  grid-template-columns: repeat(${columns}, minmax(0, 1fr));
  gap: 4px;
  flex-direction: unset;
  margin-bottom: 8px;
}

/* 2. \u683C\u5B50\uFF1Agrid item \u9ED8\u8BA4 min-width:auto\uFF0C\u4F1A\u88AB\u5185\u5BB9\u6491\u7206\u5217\u5BBD */
${nav} > * {
  min-width: 0;
}

/* 3. \u884C\uFF1A\u94FA\u6EE1\u683C\u5B50\u3001\u53BB\u6389\u4FA7\u8FB9\u7559\u767D */
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

/* 4. \u6807\u9898\uFF1A\u7F51\u683C\u91CC\u653E\u4E0D\u4E0B\u6587\u5B57\uFF0C\u60AC\u505C\u6C14\u6CE1\u4EE3\u66FF */
${nav} ${SEL.panelTitle} {
  display: none;
}

/* 5. \u60AC\u505C\u6C14\u6CE1\u672C\u4F53\u3002\u4E24\u6761\u9009\u62E9\u5668\u7F3A\u4E00\u4E0D\u53EF\uFF1A
      \u7B2C ${columns} \u683C\u300C\u66F4\u591A\u300D\u6309\u94AE\u5D4C\u5728 span \u91CC\uFF0C\u4E0D\u5728 nav \u76F4\u63A5\u5B50\u7EA7\u3002 */
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

/* 6. \u8D34\u8FB9\u5BF9\u9F50\uFF1A\u9996\u5217\u5DE6\u5BF9\u9F50\u3001\u672B\u5217\u53F3\u5BF9\u9F50\uFF0C\u907F\u514D\u88AB\u4FA7\u8FB9\u680F overflow \u88C1\u6389 */
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

/* 7. \u60AC\u505C\u663E\u5F62\u3002\u65E0\u9700 nth-child \u53D8\u4F53\u3002 */
${nav} > button[class*="panelRow"]:hover::after,
${nav} > span button[class*="panelRow"]:hover::after {
  opacity: 1;
}
`;
}
function indentFallbackCss(flagAttr) {
  return `
/* \u884C padding \u88AB\u7B2C\u4E09\u65B9\u6837\u5F0F\u8986\u76D6\u65F6\uFF0C\u7528 margin \u628A\u5C42\u7EA7\u7F29\u8FDB\u8865\u56DE\u6765 */
html[${flagAttr}] ${SEL.sidebarRoot} [data-row-key] {
  margin-inline-start: var(--dsh-workspace-indent, 0px);
  width: calc(100% - var(--dsh-workspace-indent, 0px));
}

/* \u7F29\u8FDB\u91CF\u53EA\u6709 12px\uFF0C\u5355\u9760\u6A2A\u5411\u4F4D\u79FB\u5728\u7A84\u4FA7\u8FB9\u680F\u91CC\u4ECD\u4E0D\u591F\u9192\u76EE\uFF0C
   \u518D\u7ED9\u5D4C\u5957\u5206\u7EC4\u753B\u4E00\u6761\u7AD6\u5F15\u5BFC\u7EBF\uFF1A\u5B50\u7684\u5217\u5BF9\u9F50\u7236\u7684\u5217\uFF0C\u4E00\u773C\u770B\u51FA\u5F52\u5C5E\u3002
   \u7528 currentColor + \u4F4E\u900F\u660E\u5EA6\uFF0C\u6DF1\u6D45\u4E3B\u9898\u90FD\u4E0D\u7528\u53E6\u914D\u989C\u8272\u3002 */
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

// src/seed.js
var UNGROUPED_KEY = "";
function shouldSetGroupBy(current) {
  return current !== "workspace-tree";
}
function seedGroupKeys(workspaceIds, groupExpansion) {
  const keys = [...workspaceIds, UNGROUPED_KEY];
  const seen = /* @__PURE__ */ new Set();
  const out = [];
  for (const key of keys) {
    if (seen.has(key)) continue;
    seen.add(key);
    if (!Object.hasOwn(groupExpansion, key)) out.push(key);
  }
  return out;
}

// src/view.js
var SEEDED_KEY = "dsh-left-sidebar.seeded";
var SKIP = { seeded: false, keys: [], groupBySet: false };
function seedOnce(view, currentGroupBy, workspaceIds, groupExpansion, storage = globalThis.localStorage) {
  if (typeof view?.setGroupExpanded !== "function") return SKIP;
  if (storage?.getItem(SEEDED_KEY) === "1") return SKIP;
  if (!Array.isArray(workspaceIds) || workspaceIds.length === 0) return SKIP;
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
var VIEW_STORAGE_KEY = "dsh.workspace.view.v5";
function readPersisted() {
  try {
    const raw = globalThis.localStorage?.getItem(VIEW_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}
function readGroupBy() {
  const value = readPersisted().groupBy;
  return typeof value === "string" ? value : "workspace";
}
function readGroupExpansion() {
  const value = readPersisted().groupExpansion;
  return value && typeof value === "object" ? value : {};
}

// src/client.js
var name = "dsh-left-sidebar";
var STYLE_TAG = "dsh-left-sidebar";
var INDENT_FLAG_ATTR = "data-dsh-left-sidebar-indent";
var warned = false;
function ensureStyles() {
  if (document.querySelector(`style[data-dsh-left-sidebar="${STYLE_TAG}"]`)) return;
  const tag = document.createElement("style");
  tag.setAttribute("data-dsh-left-sidebar", STYLE_TAG);
  tag.textContent = panelListCss(PANEL_COLUMNS) + indentFallbackCss(INDENT_FLAG_ATTR);
  document.head.appendChild(tag);
}
function removeStyles() {
  document.querySelector(`style[data-dsh-left-sidebar="${STYLE_TAG}"]`)?.remove();
  document.documentElement.removeAttribute(INDENT_FLAG_ATTR);
}
var PROBE_DELAYS_MS = [0, 300, 1e3, 2500];
function warnIfMissing() {
  if (typeof document === "undefined") return [];
  const timers = [];
  const probe = (index) => {
    if (warned) return;
    if (document.querySelector(SEL.navListAny)) return;
    if (index >= PROBE_DELAYS_MS.length) {
      warned = true;
      console.warn(
        "[dsh-left-sidebar] \u672A\u627E\u5230\u4FA7\u8FB9\u680F\u9762\u677F\u5217\u8868\uFF08DSH \u7248\u672C\u53EF\u80FD\u5DF2\u53D8\u66F4\uFF09\u3002\u6837\u5F0F\u5DF2\u6CE8\u5165\uFF0C\u547D\u4E2D\u540E\u81EA\u52A8\u751F\u6548\u3002"
      );
      return;
    }
    timers.push(globalThis.setTimeout(() => probe(index + 1), PROBE_DELAYS_MS[index]));
  };
  probe(0);
  return timers;
}
function indentLostFrom(rows) {
  const bases = /* @__PURE__ */ new Map();
  for (const row of rows) {
    if (row.indent === 0 && !bases.has(row.kind)) bases.set(row.kind, row.padStart);
  }
  for (const row of rows) {
    if (row.indent <= 0) continue;
    const base = bases.get(row.kind);
    if (base === void 0) continue;
    if (Math.abs(row.padStart - base) < 1) return true;
  }
  return false;
}
function indentIsLost(root = document) {
  const rows = [...root.querySelectorAll(`${SEL.sidebarRoot} [data-row-key]`)];
  if (rows.length === 0) return false;
  return indentLostFrom(
    rows.map((row) => {
      const style = getComputedStyle(row);
      return {
        kind: row.getAttribute("data-row-key").split(":")[0],
        indent: parseFloat(style.getPropertyValue("--dsh-workspace-indent")) || 0,
        padStart: parseFloat(style.paddingInlineStart) || 0
      };
    })
  );
}
function watchIndent() {
  if (typeof document === "undefined" || typeof MutationObserver === "undefined") return () => {
  };
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
function apply(ctx) {
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
  ctx.inject(["uiWorkspace", "workspaces"], (injected) => {
    const view = injected.uiWorkspace?.view;
    const list = injected.workspaces?.list;
    if (typeof view?.setGroupExpanded !== "function" || typeof list?.subscribe !== "function") {
      console.warn(
        "[dsh-left-sidebar] uiWorkspace.view \u4E0D\u53EF\u5199\uFF0C\u4E09\u5C42\u4E0E\u9ED8\u8BA4\u6298\u53E0\u672A\u751F\u6548\uFF085 \u5217\u5E03\u5C40\u4E0D\u53D7\u5F71\u54CD\uFF09\u3002"
      );
      return;
    }
    let stop = false;
    let unsubscribe = null;
    const attempt = () => {
      if (stop) return;
      const snapshot = list.getSnapshot();
      if (snapshot?.phase !== "ready") return;
      const workspaceIds = snapshot.items.map((w) => w.workspaceId);
      const result = seedOnce(view, readGroupBy(), workspaceIds, readGroupExpansion());
      if (!result.seeded) return;
      stop = true;
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    };
    attempt();
    if (!stop) unsubscribe = list.subscribe(attempt);
    return () => {
      stop = true;
      if (unsubscribe) unsubscribe();
      unsubscribe = null;
    };
  }, "dsh-left-sidebar: seed");
}

  return module.exports;
} });

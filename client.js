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
  STYLE_TAG: () => STYLE_TAG,
  apply: () => apply,
  ensureStyles: () => ensureStyles,
  name: () => name,
  removeStyles: () => removeStyles
});
module.exports = __toCommonJS(client_exports);

// src/selectors.js
var PANEL_COLUMNS = 5;
var SEL = {
  sidebarRoot: '[data-slot="sidebar"]',
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

// src/client.js
var name = "dsh-left-sidebar";
var STYLE_TAG = "dsh-left-sidebar";
var warned = false;
function ensureStyles() {
  if (document.querySelector(`style[data-dsh-left-sidebar="${STYLE_TAG}"]`)) return;
  const tag = document.createElement("style");
  tag.setAttribute("data-dsh-left-sidebar", STYLE_TAG);
  tag.textContent = panelListCss(PANEL_COLUMNS);
  document.head.appendChild(tag);
}
function removeStyles() {
  document.querySelector(`style[data-dsh-left-sidebar="${STYLE_TAG}"]`)?.remove();
}
function warnIfMissing() {
  if (warned) return;
  if (typeof document === "undefined") return;
  if (document.querySelector(SEL.navList)) return;
  warned = true;
  console.warn(
    "[dsh-left-sidebar] \u672A\u627E\u5230\u4FA7\u8FB9\u680F\u9762\u677F\u5217\u8868\uFF08\u53EF\u80FD\u4ECD\u5904\u4E8E\u6536\u8D77\u6001\u6216 DSH \u7248\u672C\u5DF2\u53D8\u66F4\uFF09\u3002\u6837\u5F0F\u5DF2\u6CE8\u5165\uFF0C\u547D\u4E2D\u540E\u81EA\u52A8\u751F\u6548\u3002"
  );
}
function apply(ctx) {
  ctx.effect(() => {
    ensureStyles();
    warnIfMissing();
    return () => removeStyles();
  }, "dsh-left-sidebar: styles");
}

  return module.exports;
} });

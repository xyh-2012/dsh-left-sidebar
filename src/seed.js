// 折叠播种的纯逻辑：只决定「哪些组键需要写 false」，不接触任何宿主对象。
// 拆成纯函数的原因：播种规则要能不启动浏览器就回归测试。

export const UNGROUPED_KEY = "";

/**
 * 决定是否需要把视图切到三层树。
 * 只判断 `current`，不判断「是否已经播种过」——后者由调用方的标记负责，
 * 因为「用户后来手动改回按工作区」必须被尊重。
 * @param {string} current 当前 groupBy
 * @returns {boolean} 是否需要切换到 workspace-tree
 */
export function shouldSetGroupBy(current) {
  return current !== "workspace-tree";
}

/**
 * 只返回尚未被记录过的组键（含未分组组）。已存在的键一律跳过，
 * 这样用户手动展开过的组不会被插件重新折叠。
 * @param {string[]} workspaceIds
 * @param {Record<string, boolean>} groupExpansion
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

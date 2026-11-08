import { seedGroupKeys, shouldSetGroupBy } from "./seed.js";

export const SEEDED_KEY = "dsh-left-sidebar.seeded";

const SKIP = { seeded: false, keys: [], groupBySet: false };

/**
 * 只播一次：置 seeded 标记、必要时切 groupBy、把未记录的组键写 false。
 *
 * 三条不可省的判断：
 *   - view 没有 setGroupExpanded → 宿主 API 变了，静默降级（5 列布局不受影响）。
 *   - 已置 seeded 标记 → 用户之后的任何手动展开/收起都不再被覆盖。
 *   - 工作区列表为空 → 服务可能还没就绪，不能把「空」当成「没有工作区」，更不能落标记。
 *
 * @param {{setGroupBy?:Function,setGroupExpanded?:Function}} view
 * @param {string} currentGroupBy 当前 groupBy（从 localStorage 读，store 无公开 getter）
 * @param {string[]} workspaceIds
 * @param {Record<string, boolean>} groupExpansion
 * @param {{getItem(k:string):string|null,setItem(k:string,v:string):void}} [storage]
 * @returns {{seeded: boolean, keys: string[], groupBySet: boolean}}
 */
export function seedOnce(
  view,
  currentGroupBy,
  workspaceIds,
  groupExpansion,
  storage = globalThis.localStorage,
) {
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

export const VIEW_STORAGE_KEY = "dsh.workspace.view.v5";

/** 只读解析视图 store 的持久化快照；坏数据降级为官方默认值。 */
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

export function readGroupBy() {
  const value = readPersisted().groupBy;
  return typeof value === "string" ? value : "workspace";
}

export function readGroupExpansion() {
  const value = readPersisted().groupExpansion;
  return value && typeof value === "object" ? value : {};
}

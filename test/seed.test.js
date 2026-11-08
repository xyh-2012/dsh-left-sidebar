import test from "node:test";
import assert from "node:assert/strict";
import { seedGroupKeys, shouldSetGroupBy, UNGROUPED_KEY } from "../src/seed.js";

test("空 groupExpansion 时播种所有工作区与未分组", () => {
  assert.deepEqual(seedGroupKeys(["a", "b"], {}), ["a", "b", UNGROUPED_KEY]);
});

test("已记录的键不重复播种（不覆盖用户选择）", () => {
  assert.deepEqual(seedGroupKeys(["a", "b"], { a: true }), ["b", UNGROUPED_KEY]);
});

test("全部已记录时不播种任何键", () => {
  assert.deepEqual(seedGroupKeys(["a"], { a: false, "": false }), []);
});

test("工作区里的空字符串不会重复产生未分组键", () => {
  assert.deepEqual(seedGroupKeys([""], {}), [UNGROUPED_KEY]);
});

test("当前不是 workspace-tree 时才需要设置", () => {
  assert.equal(shouldSetGroupBy("workspace"), true);
  assert.equal(shouldSetGroupBy("workspace-tree"), false);
});

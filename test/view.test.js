import test from "node:test";
import assert from "node:assert/strict";
import { seedOnce, SEEDED_KEY } from "../src/view.js";

const memStorage = () => {
  const m = new Map();
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
  };
};

const fakeView = () => {
  const calls = [];
  return {
    calls,
    setGroupBy: (mode) => calls.push(["setGroupBy", mode]),
    setGroupExpanded: (key, expanded) => calls.push(["setGroupExpanded", key, expanded]),
  };
};

test("首次播种：设置 groupBy 并把所有组键写 false", () => {
  const view = fakeView();
  const storage = memStorage();
  const r = seedOnce(view, "workspace", ["a", "b"], {}, storage);
  assert.equal(r.seeded, true);
  assert.equal(r.groupBySet, true);
  assert.deepEqual(r.keys, ["a", "b", ""]);
  assert.deepEqual(view.calls[0], ["setGroupBy", "workspace-tree"]);
  assert.deepEqual(view.calls.slice(1), [
    ["setGroupExpanded", "a", false],
    ["setGroupExpanded", "b", false],
    ["setGroupExpanded", "", false],
  ]);
  assert.equal(storage.getItem(SEEDED_KEY), "1");
});

test("已播种过：第二次调用完全不写", () => {
  const storage = memStorage();
  storage.setItem(SEEDED_KEY, "1");
  const view = fakeView();
  const r = seedOnce(view, "workspace", ["a"], {}, storage);
  assert.equal(r.seeded, false);
  assert.deepEqual(view.calls, []);
});

test("用户手动展开的组不被覆盖", () => {
  const view = fakeView();
  const r = seedOnce(view, "workspace-tree", ["a", "b"], { a: true, "": false }, memStorage());
  assert.equal(r.groupBySet, false);
  assert.deepEqual(r.keys, ["b"]);
  assert.deepEqual(view.calls, [["setGroupExpanded", "b", false]]);
});

test("groupBy 已是 workspace-tree 时不再重复设置", () => {
  const view = fakeView();
  seedOnce(view, "workspace-tree", ["a"], {}, memStorage());
  assert.deepEqual(view.calls, [
    ["setGroupExpanded", "a", false],
    ["setGroupExpanded", "", false],
  ]);
});

test("view 缺少写方法时安全返回（降级）", () => {
  const r = seedOnce({}, "workspace", ["a"], {}, memStorage());
  assert.equal(r.seeded, false);
  assert.deepEqual(r.keys, []);
});

test("工作区列表为空时不得置 seeded 标记", () => {
  const storage = memStorage();
  const r = seedOnce(fakeView(), "workspace", [], {}, storage);
  assert.equal(r.seeded, false);
  assert.equal(storage.getItem(SEEDED_KEY), null);
});

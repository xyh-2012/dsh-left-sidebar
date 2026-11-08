// 探针逻辑的纯函数版本：与 src/client.js 里的 warnIfMissing 保持同一套延迟表。
// 这里只测「什么时候该报」这个判断，不测 DOM 与定时器（jsdom 无关，纯数组推演）。
import test from "node:test";
import assert from "node:assert/strict";

// 与 src/client.js 的 PROBE_DELAYS_MS 一致；改了要同步。
const PROBE_DELAYS_MS = [0, 300, 1000, 2500];

/**
 * 推演探针：在每一次探测时，如果 found() 为真就停；全部延迟耗尽仍为假才该报。
 * @param {() => boolean} found
 * @returns {{warn: boolean, probes: number}}
 */
function simulate(found) {
  let probes = 0;
  for (let i = 0; i < PROBE_DELAYS_MS.length; i += 1) {
    probes += 1;
    if (found(probes)) return { warn: false, probes };
  }
  return { warn: true, probes };
}

test("侧边栏首帧就已挂载：一次都不该报", () => {
  const result = simulate(() => true);
  assert.deepEqual(result, { warn: false, probes: 1 });
});

test("侧边栏在第 2 次探测才出现：不该报", () => {
  const result = simulate((n) => n >= 2);
  assert.deepEqual(result, { warn: false, probes: 2 });
});

test("侧边栏在最后一次探测才出现：不该报", () => {
  const result = simulate((n) => n >= PROBE_DELAYS_MS.length);
  assert.deepEqual(result, { warn: false, probes: PROBE_DELAYS_MS.length });
});

test("侧边栏始终不出现：探测完所有延迟才报一次", () => {
  const result = simulate(() => false);
  assert.deepEqual(result, { warn: true, probes: PROBE_DELAYS_MS.length });
});

test("探测次数有限，不会无限重试", () => {
  assert.ok(PROBE_DELAYS_MS.length <= 5, "延迟表不该超过 5 档，否则用户等太久才看到降级提示");
  assert.ok(Number.isFinite(PROBE_DELAYS_MS.at(-1)) && PROBE_DELAYS_MS.at(-1) <= 5000);
});

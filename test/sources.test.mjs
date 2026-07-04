import { test } from "node:test";
import assert from "node:assert/strict";
import { firstReachable } from "../scripts/sources.mjs";

test("returns the first reachable url in priority order", async () => {
  const probe = async (url) => url !== "a";
  assert.equal(await firstReachable(["a", "b", "c"], probe), "b");
});

test("prefers the earliest url when all are reachable", async () => {
  assert.equal(await firstReachable(["a", "b"], async () => true), "a");
});

test("returns null when nothing is reachable", async () => {
  assert.equal(await firstReachable(["a", "b"], async () => false), null);
});

test("does not probe past the first success", async () => {
  const probed = [];
  const probe = async (url) => {
    probed.push(url);
    return url === "b";
  };
  await firstReachable(["a", "b", "c"], probe);
  assert.deepEqual(probed, ["a", "b"]);
});

test("handles an empty source list", async () => {
  assert.equal(await firstReachable([], async () => true), null);
});

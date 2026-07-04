import test from "node:test";
import assert from "node:assert/strict";
import { createTextIndex } from "../scripts/popups.mjs";

const config = { url: "extra/{slice}.json", slices: 10 };

test("resolves text from the fid's slice", async () => {
  const index = createTextIndex(config, async (url) => {
    assert.equal(url, "extra/3.json");
    return { 13: "<h3>Absalom</h3>" };
  });
  assert.equal(await index.textFor(13), "<h3>Absalom</h3>");
});

test("loads each slice once and caches texts", async () => {
  const calls = [];
  const index = createTextIndex(config, async (url) => {
    calls.push(url);
    return { 7: "a", 17: "b" };
  });
  assert.equal(await index.textFor(7), "a");
  assert.equal(await index.textFor(17), "b");
  assert.deepEqual(calls, ["extra/7.json"]);
});

test("returns undefined for unknown fid in a loaded slice", async () => {
  const index = createTextIndex(config, async () => ({ 21: "x" }));
  assert.equal(await index.textFor(31), undefined);
});

test("returns undefined for non-integer fid without fetching", async () => {
  const index = createTextIndex(config, async () => {
    throw new Error("must not fetch");
  });
  assert.equal(await index.textFor(undefined), undefined);
  assert.equal(await index.textFor("13"), undefined);
});

test("failed slice load rejects and is retried on next call", async () => {
  let attempt = 0;
  const index = createTextIndex(config, async () => {
    if (++attempt === 1) throw new Error("network down");
    return { 5: "ok" };
  });
  await assert.rejects(() => index.textFor(5), /network down/);
  assert.equal(await index.textFor(5), "ok");
  assert.equal(attempt, 2);
});

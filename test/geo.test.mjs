import { test } from "node:test";
import assert from "node:assert/strict";
import {
  MERCATOR_MAX_LAT,
  lonLatToMercator,
  mercatorToLonLat,
  lonLatToScenePx,
  scenePxToLonLat,
  tileAt,
  tileBounds,
  greatCircleKm,
  wrapLon
} from "../scripts/geo.mjs";

const close = (actual, expected, eps = 1e-9) =>
  assert.ok(Math.abs(actual - expected) < eps, `${actual} != ${expected} (eps ${eps})`);

test("longitude wraps onto [-180, 180)", () => {
  close(wrapLon(0), 0);
  close(wrapLon(179), 179);
  close(wrapLon(181), -179);
  close(wrapLon(-181), 179);
  close(wrapLon(360), 0);
  close(wrapLon(-540), -180);
  close(wrapLon(35 + 720), 35);
});

test("null island maps to mercator center", () => {
  const m = lonLatToMercator({ lon: 0, lat: 0 });
  close(m.x, 0.5);
  close(m.y, 0.5);
});

test("antimeridian maps to mercator edges", () => {
  close(lonLatToMercator({ lon: -180, lat: 0 }).x, 0);
  close(lonLatToMercator({ lon: 180, lat: 0 }).x, 1);
});

test("latitude clamps to mercator range", () => {
  close(lonLatToMercator({ lon: 0, lat: 90 }).y, 0, 1e-12);
  close(lonLatToMercator({ lon: 0, lat: -90 }).y, 1, 1e-12);
  close(lonLatToMercator({ lon: 0, lat: MERCATOR_MAX_LAT }).y, 0, 1e-12);
});

test("mercator round-trips across the globe", () => {
  for (const lon of [-179.9, -45, 0, 33.3, 179.9]) {
    for (const lat of [-84, -30, 0, 12.345, 84]) {
      const back = mercatorToLonLat(lonLatToMercator({ lon, lat }));
      close(back.lon, lon, 1e-9);
      close(back.lat, lat, 1e-9);
    }
  }
});

test("scene pixels round-trip at fixed scene size", () => {
  const size = 20000;
  const p = lonLatToScenePx({ lon: -9.2, lat: 33.7 }, size);
  const back = scenePxToLonLat(p, size);
  close(back.lon, -9.2, 1e-9);
  close(back.lat, 33.7, 1e-9);
});

test("tile indices for known anchors", () => {
  assert.deepEqual(tileAt({ lon: 0, lat: 0 }, 0), { z: 0, x: 0, y: 0 });
  assert.deepEqual(tileAt({ lon: 1, lat: -1 }, 1), { z: 1, x: 1, y: 1 });
  assert.deepEqual(tileAt({ lon: -1, lat: 1 }, 1), { z: 1, x: 0, y: 0 });
});

test("tile indices stay in range at the edges", () => {
  assert.deepEqual(tileAt({ lon: 180, lat: -90 }, 3), { z: 3, x: 7, y: 7 });
  assert.deepEqual(tileAt({ lon: -180, lat: 90 }, 3), { z: 3, x: 0, y: 0 });
});

test("tile bounds contain the tile's own anchor", () => {
  const tile = tileAt({ lon: 33.3, lat: -7.7 }, 6);
  const b = tileBounds(tile);
  assert.ok(b.west <= 33.3 && 33.3 <= b.east);
  assert.ok(b.south <= -7.7 && -7.7 <= b.north);
  assert.deepEqual(tileAt({ lon: (b.west + b.east) / 2, lat: (b.south + b.north) / 2 }, 6), tile);
});

test("great-circle distance matches Earth references", () => {
  const R = 6371;
  close(greatCircleKm({ lon: 0, lat: 0 }, { lon: 90, lat: 0 }, R), (Math.PI / 2) * R, 1e-6);
  close(greatCircleKm({ lon: 0, lat: 0 }, { lon: 1, lat: 0 }, R), 111.19, 0.01);
  close(greatCircleKm({ lon: 10, lat: 20 }, { lon: 10, lat: 20 }, R), 0, 1e-12);
});

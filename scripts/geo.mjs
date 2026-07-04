export const MERCATOR_MAX_LAT = 85.05112877980659;

const D2R = Math.PI / 180;
const R2D = 180 / Math.PI;

export function lonLatToMercator({ lon, lat }) {
  const clamped = Math.max(-MERCATOR_MAX_LAT, Math.min(MERCATOR_MAX_LAT, lat));
  return {
    x: (lon + 180) / 360,
    y: (1 - Math.log(Math.tan(Math.PI / 4 + (clamped * D2R) / 2)) / Math.PI) / 2
  };
}

export function mercatorToLonLat({ x, y }) {
  return {
    lon: x * 360 - 180,
    lat: (2 * Math.atan(Math.exp((1 - 2 * y) * Math.PI)) - Math.PI / 2) * R2D
  };
}

export function lonLatToScenePx(lonLat, size) {
  const m = lonLatToMercator(lonLat);
  return { x: m.x * size, y: m.y * size };
}

export function scenePxToLonLat({ x, y }, size) {
  return mercatorToLonLat({ x: x / size, y: y / size });
}

export function tileAt(lonLat, z) {
  const m = lonLatToMercator(lonLat);
  const n = 2 ** z;
  return {
    z,
    x: Math.max(0, Math.min(n - 1, Math.floor(m.x * n))),
    y: Math.max(0, Math.min(n - 1, Math.floor(m.y * n)))
  };
}

export function tileBounds({ z, x, y }) {
  const n = 2 ** z;
  const nw = mercatorToLonLat({ x: x / n, y: y / n });
  const se = mercatorToLonLat({ x: (x + 1) / n, y: (y + 1) / n });
  return { west: nw.lon, north: nw.lat, east: se.lon, south: se.lat };
}

export function greatCircleKm(a, b, radiusKm) {
  const lat1 = a.lat * D2R;
  const lat2 = b.lat * D2R;
  const dLat = (b.lat - a.lat) * D2R;
  const dLon = (b.lon - a.lon) * D2R;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(h));
}

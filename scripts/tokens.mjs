import { scenePxToLonLat } from "./geo.mjs";

const SOURCE = "gf-tokens";
const LAYER = "gf-tokens";
const FALLBACK = "gf-token-fallback";
const FALLBACK_SIZE = 64;

const visibleToken = (token) => game.user.isGM || !token.hidden;

const footprintPx = (token, gridSize) => ({
  w: token.width * gridSize,
  h: token.height * gridSize
});

// Stand-in for textures MapLibre cannot decode (video tokens and the like).
function fallbackImage() {
  const c = document.createElement("canvas");
  c.width = c.height = FALLBACK_SIZE;
  const ctx = c.getContext("2d");
  ctx.beginPath();
  ctx.arc(FALLBACK_SIZE / 2, FALLBACK_SIZE / 2, FALLBACK_SIZE / 2 - 2, 0, Math.PI * 2);
  ctx.fillStyle = "rgba(255, 255, 255, 0.85)";
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = "#333333";
  ctx.stroke();
  return ctx.getImageData(0, 0, FALLBACK_SIZE, FALLBACK_SIZE);
}

export function attachTokens(map, scene, sceneSize) {
  const images = new Map();
  let disposed = false;
  let generation = 0;

  async function imageFor(token) {
    const src = token.texture?.src;
    if (src && !images.has(src)) {
      const id = `gf-token-image-${images.size}`;
      const url = /^(https?:|data:)/.test(src) ? src : foundry.utils.getRoute(src);
      try {
        const { data } = await map.loadImage(url);
        if (disposed) return null;
        map.addImage(id, data);
        images.set(src, { id, width: data.width });
      } catch (err) {
        console.warn(`globe-forge: token texture not usable on the globe: ${src}`, err);
        images.set(src, null);
      }
    }
    if (disposed) return null;
    return (src && images.get(src)) || { id: FALLBACK, width: FALLBACK_SIZE };
  }

  // Image loading is async: a stale rebuild must never overwrite a newer one.
  async function refresh() {
    const gen = ++generation;
    const features = [];
    for (const token of scene.tokens.filter(visibleToken)) {
      const image = await imageFor(token);
      if (disposed || gen !== generation) return;
      const { w, h } = footprintPx(token, scene.grid.size);
      const { lon, lat } = scenePxToLonLat({ x: token.x + w / 2, y: token.y + h / 2 }, sceneSize);
      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: { id: token.id, image: image.id, scale: w / image.width }
      });
    }
    map.getSource(SOURCE)?.setData({ type: "FeatureCollection", features });
  }

  // Ground-fixed size: scale converts the image to scene pixels, and the zoom
  // expression converts scene pixels to screen pixels (the mercator world is
  // 512 px wide at zoom 0 and doubles each level).
  const setup = () => {
    if (disposed) return;
    const k0 = 512 / sceneSize;
    map.addImage(FALLBACK, fallbackImage());
    map.addSource(SOURCE, {
      type: "geojson",
      data: { type: "FeatureCollection", features: [] }
    });
    map.addLayer({
      id: LAYER,
      type: "symbol",
      source: SOURCE,
      layout: {
        "icon-image": ["get", "image"],
        "icon-overlap": "always",
        "icon-rotation-alignment": "map",
        "icon-pitch-alignment": "map",
        "icon-size": [
          "interpolate",
          ["exponential", 2],
          ["zoom"],
          0,
          ["*", ["get", "scale"], k0],
          22,
          ["*", ["get", "scale"], k0 * 2 ** 22]
        ]
      }
    });
    refresh();
  };
  if (map.isStyleLoaded()) setup();
  else map.once("load", setup);

  return () => {
    disposed = true;
  };
}

import { lonLatToScenePx, scenePxToLonLat, wrapLon } from "./geo.mjs";

const SOURCE = "gf-tokens";
export const TOKEN_LAYER = "gf-tokens";
const LAYER = TOKEN_LAYER;
const RING = "gf-token-rings";
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
  let collection = { type: "FeatureCollection", features: [] };

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
        properties: {
          id: token.id,
          image: image.id,
          scale: w / image.width,
          radius: (w / 2) * 1.15,
          selected: token.object?.controlled ?? false,
          targeted: token.object?.isTargeted ?? false
        }
      });
    }
    collection = { type: "FeatureCollection", features };
    map.getSource(SOURCE)?.setData(collection);
  }

  // While the pointer moves only the feature follows it; the document is
  // written once on release, so other clients see a single move.
  const onDragStart = (e) => {
    const feature = e.features?.[0];
    const token = feature && scene.tokens.get(feature.properties.id);
    if (!token?.isOwner) return;
    e.preventDefault();
    map.getCanvas().style.cursor = "grabbing";
    const moved = collection.features.find((f) => f.properties.id === token.id);
    const onMove = (ev) => {
      if (!moved) return;
      moved.geometry.coordinates = [ev.lngLat.lng, ev.lngLat.lat];
      map.getSource(SOURCE)?.setData(collection);
    };
    const onUp = async (ev) => {
      map.off("mousemove", onMove);
      map.getCanvas().style.cursor = "";
      const px = lonLatToScenePx({ lon: wrapLon(ev.lngLat.lng), lat: ev.lngLat.lat }, sceneSize);
      const { w, h } = footprintPx(token, scene.grid.size);
      await token.update({ x: Math.round(px.x - w / 2), y: Math.round(px.y - h / 2) });
    };
    map.on("mousemove", onMove);
    map.once("mouseup", onUp);
  };
  map.on("mousedown", LAYER, onDragStart);

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
      id: RING,
      type: "circle",
      source: SOURCE,
      filter: ["any", ["get", "selected"], ["get", "targeted"]],
      paint: {
        "circle-pitch-alignment": "map",
        "circle-color": "rgba(0, 0, 0, 0)",
        "circle-stroke-width": 2,
        "circle-stroke-color": ["case", ["get", "targeted"], "#cc3333", "#ff9829"],
        "circle-radius": [
          "interpolate",
          ["exponential", 2],
          ["zoom"],
          0,
          ["*", ["get", "radius"], k0],
          22,
          ["*", ["get", "radius"], k0 * 2 ** 22]
        ]
      }
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

  // The PIXI canvas below the globe still holds the Token placeables, so
  // selection and targeting go through the regular Foundry mechanisms.
  const onTokenClick = (e) => {
    const feature = e.features?.[0];
    const token = feature && scene.tokens.get(feature.properties.id);
    const placeable = token?.object;
    if (!placeable) return;
    if (e.originalEvent.altKey) {
      placeable.setTarget(!placeable.isTargeted, { releaseOthers: false });
    } else if (token.isOwner) {
      placeable.control({ releaseOthers: !e.originalEvent.shiftKey });
    }
  };
  const onTokenDblClick = (e) => {
    const feature = e.features?.[0];
    const token = feature && scene.tokens.get(feature.properties.id);
    if (!token?.actor?.testUserPermission(game.user, "OBSERVER")) return;
    e.preventDefault();
    token.actor.sheet.render(true);
  };
  map.on("click", LAYER, onTokenClick);
  map.on("dblclick", LAYER, onTokenDblClick);
  map.on("mouseenter", LAYER, () => (map.getCanvas().style.cursor = "pointer"));
  map.on("mouseleave", LAYER, () => (map.getCanvas().style.cursor = ""));

  const container = map.getContainer();
  const canPlace = () => game.user.can("TOKEN_CREATE");
  const onDragOver = (ev) => {
    if (canPlace()) ev.preventDefault();
  };
  const onDrop = async (ev) => {
    if (!canPlace()) return;
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const data = TextEditor.getDragEventData(ev);
    if (data?.type !== "Actor") return;
    ev.preventDefault();
    ev.stopPropagation();
    let actor = await getDocumentClass("Actor").fromDropData(data);
    if (actor?.pack) actor = await game.actors.importFromCompendium(game.packs.get(actor.pack), actor.id);
    if (!actor?.isOwner) return;
    const rect = container.getBoundingClientRect();
    const lngLat = map.unproject([ev.clientX - rect.left, ev.clientY - rect.top]);
    const px = lonLatToScenePx({ lon: wrapLon(lngLat.lng), lat: lngLat.lat }, sceneSize);
    const { w, h } = footprintPx(actor.prototypeToken, scene.grid.size);
    const tokenDoc = await actor.getTokenDocument({
      x: Math.round(px.x - w / 2),
      y: Math.round(px.y - h / 2)
    });
    await scene.createEmbeddedDocuments("Token", [tokenDoc.toObject()]);
  };
  container.addEventListener("dragover", onDragOver);
  container.addEventListener("drop", onDrop);

  const hooks = ["createToken", "updateToken", "deleteToken"].map((hook) => [
    hook,
    Hooks.on(hook, (doc) => {
      if (doc.parent?.id === scene.id) refresh();
    })
  ]);
  hooks.push([
    "controlToken",
    Hooks.on("controlToken", (placeable) => {
      if (placeable.document.parent?.id === scene.id) refresh();
    })
  ]);
  hooks.push([
    "targetToken",
    Hooks.on("targetToken", (user, placeable) => {
      if (placeable.document.parent?.id === scene.id) refresh();
    })
  ]);

  return () => {
    disposed = true;
    container.removeEventListener("dragover", onDragOver);
    container.removeEventListener("drop", onDrop);
    for (const [hook, id] of hooks) Hooks.off(hook, id);
  };
}

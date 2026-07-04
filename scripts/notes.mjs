import { lonLatToScenePx, scenePxToLonLat, wrapLon } from "./geo.mjs";

const visibleNote = (note) => game.user.isGM || !note.entryId || (note.entry?.visible ?? false);

const MODULE = "globe-forge";
const NOTES_LAYER = "globe-forge-notes";

// A round badge with the book-open glyph, drawn at 2x for crisp scaling.
// Font Awesome is already loaded by the Foundry UI itself.
function noteBadge() {
  const size = 64;
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = size;
  const ctx = canvas.getContext("2d");
  ctx.beginPath();
  ctx.arc(32, 32, 29, 0, 2 * Math.PI);
  ctx.fillStyle = "rgba(16, 20, 32, 0.92)";
  ctx.fill();
  ctx.lineWidth = 4;
  ctx.strokeStyle = "rgba(228, 200, 134, 0.9)";
  ctx.stroke();
  ctx.fillStyle = "#ffd98c";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = '900 28px "Font Awesome 6 Pro", "Font Awesome 6 Free"';
  ctx.fillText("\uf518", 32, 33);
  return ctx.getImageData(0, 0, size, size);
}

export function openNote(scene, id) {
  const note = scene.notes.get(id);
  const entry = note?.entry;
  if (!entry) return;
  const options = {};
  if (note.pageId) options.pageId = note.pageId;
  entry.sheet.render(true, options);
}

// A note counts as anchored to a location either by the stored feature fid
// (set when created from the location card) or by plain proximity, so pins
// dropped by hand onto the same spot are picked up too. Only notes visible
// to the current user count: a hidden journal must not surface in the card.
export function findAnchoredNote(scene, fid, px, radiusPx = 30) {
  const notes = scene.notes.filter(visibleNote);
  return (
    notes.find((n) => n.getFlag(MODULE, "fid") === fid) ??
    notes.find((n) => Math.hypot(n.x - px.x, n.y - px.y) <= radiusPx)
  );
}

export const canCreateJournalPin = () =>
  game.user.hasPermission("NOTE_CREATE") && getDocumentClass("JournalEntry").canUserCreate(game.user);

export async function createJournalPin(scene, { name, x, y, fid }) {
  const entry = await getDocumentClass("JournalEntry").create({ name });
  if (!entry) return null;
  const [note] = await scene.createEmbeddedDocuments("Note", [
    {
      entryId: entry.id,
      x: Math.round(x),
      y: Math.round(y),
      flags: { [MODULE]: { fid } }
    }
  ]);
  return note;
}

export function attachNotes(map, scene, sceneSize) {
  let ready = false;
  let disposed = false;

  const collection = () => ({
    type: "FeatureCollection",
    features: scene.notes.filter(visibleNote).map((note) => {
      const { lon, lat } = scenePxToLonLat({ x: note.x, y: note.y }, sceneSize);
      return {
        type: "Feature",
        geometry: { type: "Point", coordinates: [lon, lat] },
        properties: { id: note.id, label: note.label }
      };
    })
  });

  const sync = () => {
    if (ready && !disposed) map.getSource(NOTES_LAYER)?.setData(collection());
  };

  const onPinClick = (e) => {
    const id = e.features?.[0]?.properties?.id;
    if (id) openNote(scene, id);
  };
  const onPinEnter = () => (map.getCanvas().style.cursor = "pointer");
  const onPinLeave = () => (map.getCanvas().style.cursor = "");

  // Pins are a symbol layer, not DOM markers: they scale and hide with the map
  // like location icons instead of staying screen-sized at any zoom. The
  // bottom-left anchor keeps the point itself clickable — the badge grows to
  // the upper right of it.
  const setup = () => {
    if (disposed) return;
    map.addImage("gf-note", noteBadge(), { pixelRatio: 2 });
    map.addSource(NOTES_LAYER, { type: "geojson", data: collection() });
    map.addLayer({
      id: NOTES_LAYER,
      type: "symbol",
      source: NOTES_LAYER,
      layout: {
        "icon-image": "gf-note",
        "icon-anchor": "bottom-left",
        "icon-overlap": "always",
        "icon-size": ["interpolate", ["exponential", 2], ["zoom"], 1, 0.35, 5, 0.7, 8, 1],
        "text-field": ["step", ["zoom"], "", 5, ["get", "label"]],
        "text-font": ["NotoSans-Medium"],
        "text-size": 12,
        "text-anchor": "bottom-left",
        "text-offset": [2.4, -0.8],
        "text-optional": true
      },
      paint: {
        "text-color": "#ffd98c",
        "text-halo-color": "#0a0a0a",
        "text-halo-width": 1
      }
    });
    map.on("click", NOTES_LAYER, onPinClick);
    map.on("mouseenter", NOTES_LAYER, onPinEnter);
    map.on("mouseleave", NOTES_LAYER, onPinLeave);
    ready = true;
  };
  if (map.isStyleLoaded()) setup();
  else map.once("load", setup);

  const refresh = (doc) => {
    if (doc.parent?.id === scene.id) sync();
  };
  const hooks = ["createNote", "updateNote", "deleteNote"].map((name) => [name, Hooks.on(name, refresh)]);
  // Journal permission or name changes must show/hide/rename pins right away.
  const entryRefresh = (entry) => {
    if (scene.notes.some((n) => n.entryId === entry.id)) sync();
  };
  for (const name of ["updateJournalEntry", "deleteJournalEntry"]) {
    hooks.push([name, Hooks.on(name, entryRefresh)]);
  }

  const container = map.getContainer();
  const canCreate = () => game.user.hasPermission("NOTE_CREATE");
  const onDragOver = (ev) => {
    if (canCreate()) ev.preventDefault();
  };
  const onDrop = async (ev) => {
    if (!canCreate()) return;
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const data = TextEditor.getDragEventData(ev);
    if (!["JournalEntry", "JournalEntryPage"].includes(data?.type)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const doc = await fromUuid(data.uuid);
    if (!doc) return;
    const page = doc.documentName === "JournalEntryPage" ? doc : null;
    const entry = page ? page.parent : doc;
    const rect = container.getBoundingClientRect();
    const lngLat = map.unproject([ev.clientX - rect.left, ev.clientY - rect.top]);
    const px = lonLatToScenePx({ lon: wrapLon(lngLat.lng), lat: lngLat.lat }, sceneSize);
    await scene.createEmbeddedDocuments("Note", [
      { entryId: entry.id, pageId: page?.id ?? null, x: Math.round(px.x), y: Math.round(px.y) }
    ]);
  };
  container.addEventListener("dragover", onDragOver);
  container.addEventListener("drop", onDrop);

  return () => {
    disposed = true;
    for (const [name, id] of hooks) Hooks.off(name, id);
    if (ready) {
      map.off("click", NOTES_LAYER, onPinClick);
      map.off("mouseenter", NOTES_LAYER, onPinEnter);
      map.off("mouseleave", NOTES_LAYER, onPinLeave);
      if (map.getLayer(NOTES_LAYER)) map.removeLayer(NOTES_LAYER);
      if (map.getSource(NOTES_LAYER)) map.removeSource(NOTES_LAYER);
      if (map.hasImage("gf-note")) map.removeImage("gf-note");
    }
    container.removeEventListener("dragover", onDragOver);
    container.removeEventListener("drop", onDrop);
  };
}

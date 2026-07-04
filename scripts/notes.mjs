import * as maplibregl from "../lib/maplibre-gl.mjs";
import { lonLatToScenePx, scenePxToLonLat, wrapLon } from "./geo.mjs";

const visibleNote = (note) => game.user.isGM || !note.entryId || (note.entry?.visible ?? false);

function pinElement(note) {
  const el = document.createElement("div");
  el.className = "gf-note";
  const icon = document.createElement("i");
  icon.className = "fa-solid fa-book-open";
  const label = document.createElement("span");
  label.className = "gf-note-label";
  label.textContent = note.label;
  el.append(icon, label);
  return el;
}

const MODULE = "globe-forge";

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
// dropped by hand onto the same spot are picked up too.
export function findAnchoredNote(scene, fid, px, radiusPx = 30) {
  return (
    scene.notes.find((n) => n.getFlag(MODULE, "fid") === fid) ??
    scene.notes.find((n) => Math.hypot(n.x - px.x, n.y - px.y) <= radiusPx)
  );
}

export const canCreateJournalPin = () =>
  game.user.hasPermission("NOTE_CREATE") && getDocumentClass("JournalEntry").canUserCreate(game.user);

export async function createJournalPin(scene, { name, x, y, fid }) {
  const entry = await getDocumentClass("JournalEntry").create({ name });
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
  const markers = new Map();

  const sync = () => {
    const seen = new Set();
    for (const note of scene.notes.filter(visibleNote)) {
      seen.add(note.id);
      const { lon, lat } = scenePxToLonLat({ x: note.x, y: note.y }, sceneSize);
      const existing = markers.get(note.id);
      if (existing) {
        existing.setLngLat([lon, lat]);
        existing.getElement().querySelector(".gf-note-label").textContent = note.label;
        continue;
      }
      const el = pinElement(note);
      el.addEventListener("click", (ev) => {
        ev.stopPropagation();
        openNote(scene, note.id);
      });
      const marker = new maplibregl.Marker({ element: el })
        .setLngLat([lon, lat])
        .addTo(map);
      markers.set(note.id, marker);
    }
    for (const [id, marker] of markers) {
      if (seen.has(id)) continue;
      marker.remove();
      markers.delete(id);
    }
  };
  sync();

  const refresh = (doc) => {
    if (doc.parent?.id === scene.id) sync();
  };
  const hooks = ["createNote", "updateNote", "deleteNote"].map((name) => [name, Hooks.on(name, refresh)]);

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
    for (const [name, id] of hooks) Hooks.off(name, id);
    for (const marker of markers.values()) marker.remove();
    markers.clear();
    container.removeEventListener("dragover", onDragOver);
    container.removeEventListener("drop", onDrop);
  };
}

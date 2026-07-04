import * as maplibregl from "../lib/maplibre-gl.mjs";
import { lonLatToScenePx, scenePxToLonLat } from "./geo.mjs";

const wrapLon = (lon) => ((((lon + 180) % 360) + 360) % 360) - 180;

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

function openNote(scene, id) {
  const note = scene.notes.get(id);
  const entry = note?.entry;
  if (!entry) return;
  const options = {};
  if (note.pageId) options.pageId = note.pageId;
  entry.sheet.render(true, options);
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

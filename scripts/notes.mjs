import * as maplibregl from "../lib/maplibre-gl.mjs";
import { scenePxToLonLat } from "./geo.mjs";

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
      const marker = new maplibregl.Marker({ element: pinElement(note) })
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

  return () => {
    for (const [name, id] of hooks) Hooks.off(name, id);
    for (const marker of markers.values()) marker.remove();
    markers.clear();
  };
}

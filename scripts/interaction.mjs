import * as maplibregl from "../lib/maplibre-gl.mjs";
import { createTextIndex } from "./popups.mjs";
import { lonLatToScenePx, wrapLon } from "./geo.mjs";
import { canCreateJournalPin, createJournalPin, findAnchoredNote, openNote } from "./notes.mjs";
import { TOKEN_LAYER } from "./tokens.mjs";

export function attachLocationPopups(map, { url, slices, layers, scene, sceneSize }) {
  const index = createTextIndex({ url, slices });
  const popup = new maplibregl.Popup({ maxWidth: "320px" });

  const clickable = (features) => features?.find((f) => f.properties?.fid !== undefined);

  const onClick = async (e) => {
    // A token above the location owns the click.
    if (map.getLayer(TOKEN_LAYER) && map.queryRenderedFeatures(e.point, { layers: [TOKEN_LAYER] }).length)
      return;
    const feature = clickable(e.features);
    if (!feature) return;
    let text;
    try {
      text = await index.textFor(Number(feature.properties.fid));
    } catch (err) {
      console.error("globe-forge: failed to load location texts:", err);
      return;
    }
    if (!text) return;
    const coord = nearestCoordinate(feature.geometry, e.lngLat);
    const content = popupContent(text);
    const actions = journalActions(feature, coord, content);
    if (actions) content.append(actions);
    popup.setLngLat(coord).setDOMContent(content).addTo(map);
  };

  // "Open journal" when a note is anchored at this location, otherwise "Create
  // journal": a new entry named after the location plus a pin at its coordinates.
  // The name comes from the card title (<h3>): unlike the label property it
  // exists for every location, and JournalEntry rejects blank names.
  function journalActions(feature, coord, content) {
    const fid = Number(feature.properties.fid);
    const px = lonLatToScenePx({ lon: wrapLon(coord[0]), lat: coord[1] }, sceneSize);
    const note = findAnchoredNote(scene, fid, px);
    if (!note && !canCreateJournalPin()) return null;

    const row = document.createElement("div");
    row.className = "gf-popup-actions";
    const btn = document.createElement("button");
    btn.type = "button";
    if (note) {
      btn.innerHTML = `<i class="fa-solid fa-book-open"></i> ${game.i18n.localize("GLOBEFORGE.OpenJournal")}`;
      btn.addEventListener("click", () => openNote(scene, note.id));
    } else {
      btn.innerHTML = `<i class="fa-solid fa-book-medical"></i> ${game.i18n.localize("GLOBEFORGE.CreateJournal")}`;
      btn.addEventListener("click", async () => {
        btn.disabled = true;
        const name =
          content.querySelector("h3")?.textContent.trim() ||
          feature.properties.label ||
          game.i18n.localize("GLOBEFORGE.UnnamedPlace");
        const created = await createJournalPin(scene, { name, x: px.x, y: px.y, fid });
        if (!created) {
          btn.disabled = false;
          return;
        }
        popup.remove();
        openNote(scene, created.id);
      });
    }
    row.append(btn);
    return row;
  }

  for (const layer of layers) {
    map.on("mouseenter", layer, (e) => {
      if (clickable(e.features)) map.getCanvas().style.cursor = "pointer";
    });
    map.on("mouseleave", layer, () => {
      map.getCanvas().style.cursor = "";
    });
    map.on("click", layer, onClick);
  }
}

function nearestCoordinate(geometry, lngLat) {
  const points = geometry.type === "MultiPoint" ? geometry.coordinates : [geometry.coordinates];
  const best = points.reduce((prev, curr) =>
    lngLat.distanceTo(new maplibregl.LngLat(...prev)) <= lngLat.distanceTo(new maplibregl.LngLat(...curr))
      ? prev
      : curr
  );
  const coord = [...best];
  // When several world copies are visible, anchor to the copy being pointed at.
  while (Math.abs(lngLat.lng - coord[0]) > 180) coord[0] += lngLat.lng > coord[0] ? 360 : -360;
  return coord;
}

// Wiki texts open links in the Foundry tab unless retargeted.
function popupContent(html) {
  const div = document.createElement("div");
  div.className = "gf-popup";
  div.innerHTML = html;
  for (const a of div.querySelectorAll("a")) {
    a.target = "_blank";
    a.rel = "noopener";
  }
  return div;
}

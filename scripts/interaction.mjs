import * as maplibregl from "../lib/maplibre-gl.mjs";
import { createTextIndex } from "./popups.mjs";

export function attachLocationPopups(map, { url, slices, layers }) {
  const index = createTextIndex({ url, slices });
  const popup = new maplibregl.Popup({ maxWidth: "320px" });

  const clickable = (features) => features?.find((f) => f.properties?.fid !== undefined);

  const onClick = async (e) => {
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
    popup
      .setLngLat(nearestCoordinate(feature.geometry, e.lngLat))
      .setDOMContent(popupContent(text))
      .addTo(map);
  };

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

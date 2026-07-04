import * as maplibregl from "../lib/maplibre-gl.mjs";

Hooks.once("init", () => {
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tilev4 ?? protocol.tile);
});

import * as maplibregl from "../lib/maplibre-gl.mjs";
import { manifestsReady } from "./manifests.mjs";
import { activateGlobe, deactivateGlobe, globeFlags } from "./globe.mjs";
import { injectCreateButton, injectSceneConfig } from "./ui.mjs";

Hooks.once("init", () => {
  const protocol = new pmtiles.Protocol();
  maplibregl.addProtocol("pmtiles", protocol.tilev4 ?? protocol.tile);
  game.settings.register("globe-forge", "views", {
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });
});

Hooks.once("setup", () => manifestsReady());

Hooks.on("canvasReady", () => {
  if (globeFlags(canvas.scene)?.manifest) activateGlobe(canvas.scene);
  else deactivateGlobe();
});

Hooks.on("canvasTearDown", () => deactivateGlobe());

Hooks.on("renderSceneDirectory", injectCreateButton);
Hooks.on("renderSceneConfig", injectSceneConfig);

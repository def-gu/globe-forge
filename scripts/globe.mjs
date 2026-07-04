import * as maplibregl from "../lib/maplibre-gl.mjs";
import { STYLES } from "./styles.mjs";
import { firstReachable } from "./sources.mjs";
import { getManifest, manifestsReady } from "./manifests.mjs";

const MODULE = "globe-forge";

export const SCENE_SIZE = 20000;

let active = null;

const moduleRoute = (path) =>
  window.location.origin + foundry.utils.getRoute(`modules/${MODULE}/${path}`);

const sourceUrl = (source) =>
  source.type === "url"
    ? source.url
    : window.location.origin + foundry.utils.getRoute(source.path);

export const globeFlags = (scene) => scene?.flags?.[MODULE] ?? null;

export async function activateGlobe(scene) {
  deactivateGlobe();
  await manifestsReady();
  const flags = globeFlags(scene);
  const manifest = getManifest(flags?.manifest);
  if (!manifest) {
    ui.notifications.error(
      `globe-forge: ${game.i18n.format("GLOBEFORGE.UnknownManifest", { id: flags?.manifest })}`
    );
    return;
  }

  const tilesUrl = await firstReachable(manifest.sources.map(sourceUrl));
  if (!tilesUrl) {
    ui.notifications.error(`globe-forge: ${game.i18n.localize("GLOBEFORGE.NoSourceReachable")}`);
    return;
  }

  const el = document.createElement("div");
  el.id = "globe-forge-canvas";
  const backdrop = flags.backdrop || manifest.backdrop;
  if (backdrop) {
    el.style.background = backdrop;
    el.classList.add("gf-custom-backdrop");
  }
  document.body.append(el);
  canvas.app.ticker.stop();

  const view = flags.view ?? manifest.view;
  const map = new maplibregl.Map({
    container: el,
    style: STYLES[manifest.style]({
      tilesUrl,
      glyphs: moduleRoute("assets/fonts/{fontstack}/{range}.pbf"),
      sprite: moduleRoute("assets/sprites/sprites")
    }),
    maxPitch: 0,
    pitchWithRotate: false,
    dragRotate: false,
    touchPitch: false,
    minZoom: 1.1,
    center: view.center,
    zoom: view.zoom
  });
  map.on("error", (e) => console.error("globe-forge:", e.error ?? e));

  active = { map, el, sceneId: scene.id };
}

export function deactivateGlobe() {
  if (active) {
    active.map.remove();
    active.el.remove();
    active = null;
  }
  // Core never restarts the shared PIXI ticker (it only adds/removes callbacks),
  // and canvas.ready is already false inside canvasTearDown — start unconditionally.
  canvas?.app?.ticker.start();
}

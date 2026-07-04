import * as maplibregl from "../lib/maplibre-gl.mjs";
import { STYLES } from "./styles.mjs";
import { firstReachable } from "./sources.mjs";
import { getManifest, manifestsReady } from "./manifests.mjs";
import { attachLocationPopups } from "./interaction.mjs";
import { attachNotes } from "./notes.mjs";
import { wrapLon } from "./geo.mjs";

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

  const view = game.settings.get(MODULE, "views")[scene.id] ?? flags.view ?? manifest.view;
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

  // Camera memory per scene, per client. The view is captured on moveend and
  // only the settings write is debounced: the deferred callback must not touch
  // the map, which may already be removed by a scene switch.
  let pendingView = null;
  const persistView = foundry.utils.debounce(() => {
    if (!pendingView) return;
    const views = { ...game.settings.get(MODULE, "views"), [scene.id]: pendingView };
    game.settings.set(MODULE, "views", views);
  }, 500);
  map.on("moveend", () => {
    const c = map.getCenter();
    pendingView = { center: [wrapLon(c.lng), c.lat], zoom: map.getZoom() };
    persistView();
  });

  if (manifest.popups) {
    attachLocationPopups(map, {
      url: moduleRoute(manifest.popups.path),
      slices: manifest.popups.slices,
      layers: manifest.popups.layers,
      scene,
      sceneSize: SCENE_SIZE
    });
  }

  const detachNotes = attachNotes(map, scene, SCENE_SIZE);

  active = { map, el, sceneId: scene.id, detachNotes };
}

export function deactivateGlobe() {
  if (active) {
    active.detachNotes();
    active.map.remove();
    active.el.remove();
    active = null;
  }
  // Core never restarts the shared PIXI ticker (it only adds/removes callbacks),
  // and canvas.ready is already false inside canvasTearDown — start unconditionally.
  canvas?.app?.ticker.start();
}

import { allManifests, manifestName, manifestsReady } from "./manifests.mjs";

const MODULE = "globe-forge";

const asElement = (html) => (html instanceof HTMLElement ? html : html[0]);

export function injectCreateButton(app, html) {
  if (!game.user.isGM) return;
  const element = asElement(html);
  const actions = element.querySelector(".directory-header .header-actions");
  if (!actions || element.querySelector(".globe-forge-create")) return;
  const row = document.createElement("div");
  row.className = "header-actions action-buttons flexrow";
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "globe-forge-create";
  btn.innerHTML = `<i class="fa-solid fa-globe"></i> <span>${game.i18n.localize("GLOBEFORGE.CreateGlobe")}</span>`;
  btn.addEventListener("click", () => createGlobeDialog());
  row.append(btn);
  actions.after(row);
}

async function createGlobeDialog() {
  await manifestsReady();
  const manifests = allManifests();
  if (!manifests.length) {
    ui.notifications.error(`globe-forge: ${game.i18n.localize("GLOBEFORGE.NoManifests")}`);
    return;
  }
  const options = manifests
    .map((m) => `<option value="${m.id}">${manifestName(m)}</option>`)
    .join("");
  const content = `
    <div class="form-group">
      <label>${game.i18n.localize("GLOBEFORGE.World")}</label>
      <div class="form-fields"><select name="manifest">${options}</select></div>
    </div>
    <div class="form-group">
      <label>${game.i18n.localize("GLOBEFORGE.SceneName")}</label>
      <div class="form-fields"><input type="text" name="name" placeholder="${manifestName(manifests[0])}"></div>
    </div>`;
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: "GLOBEFORGE.CreateGlobe" },
    content,
    rejectClose: false,
    ok: {
      label: "GLOBEFORGE.Create",
      icon: "fa-solid fa-globe",
      callback: (event, button) => ({
        manifest: button.form.elements.manifest.value,
        name: button.form.elements.name.value.trim()
      })
    }
  });
  if (!result) return;
  const manifest = manifests.find((m) => m.id === result.manifest);
  const scene = await Scene.create({
    name: result.name || manifestName(manifest),
    width: 20000,
    height: 20000,
    padding: 0,
    backgroundColor: "#000000",
    thumb: `modules/${MODULE}/assets/thumb.svg`,
    grid: { type: CONST.GRID_TYPES.GRIDLESS },
    tokenVision: false,
    flags: { [MODULE]: { manifest: manifest.id } }
  });
  scene.view();
}

export function injectSceneConfig(app, html) {
  const element = asElement(html);
  const basics = element.querySelector('.tab[data-tab="basics"]');
  if (!basics || basics.querySelector(`[name="flags.${MODULE}.manifest"]`)) return;
  const flags = app.document.flags?.[MODULE] ?? {};
  const options = [
    `<option value="">—</option>`,
    ...allManifests().map(
      (m) => `<option value="${m.id}" ${m.id === flags.manifest ? "selected" : ""}>${manifestName(m)}</option>`
    )
  ].join("");
  const globe = document.createElement("div");
  globe.className = "form-group";
  globe.innerHTML = `
    <label>${game.i18n.localize("GLOBEFORGE.Globe")}</label>
    <div class="form-fields"><select name="flags.${MODULE}.manifest">${options}</select></div>
    <p class="hint">${game.i18n.localize("GLOBEFORGE.GlobeHint")}</p>`;
  const backdrop = document.createElement("div");
  backdrop.className = "form-group";
  backdrop.innerHTML = `
    <label>${game.i18n.localize("GLOBEFORGE.Backdrop")}</label>
    <div class="form-fields">
      <input type="text" name="flags.${MODULE}.backdrop" value="${flags.backdrop ?? ""}"
             placeholder="${game.i18n.localize("GLOBEFORGE.BackdropPlaceholder")}">
    </div>
    <p class="hint">${game.i18n.localize("GLOBEFORGE.BackdropHint")}</p>`;
  basics.append(globe, backdrop);
}

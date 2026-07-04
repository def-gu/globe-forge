import { allManifests, manifestsReady } from "./manifests.mjs";

const MODULE = "globe-forge";

const asElement = (html) => (html instanceof HTMLElement ? html : html[0]);

export function injectCreateButton(app, html) {
  if (!game.user.isGM) return;
  const element = asElement(html);
  const footer = element.querySelector(".directory-footer");
  if (!footer || footer.querySelector(".globe-forge-create")) return;
  const btn = document.createElement("button");
  btn.type = "button";
  btn.className = "globe-forge-create";
  btn.innerHTML = '<i class="fa-solid fa-globe"></i> Создать глобус';
  btn.addEventListener("click", () => createGlobeDialog());
  footer.append(btn);
}

async function createGlobeDialog() {
  await manifestsReady();
  const manifests = allManifests();
  if (!manifests.length) {
    ui.notifications.error("globe-forge: нет доступных манифестов глобусов");
    return;
  }
  const options = manifests
    .map((m) => `<option value="${m.id}">${m.name}</option>`)
    .join("");
  const content = `
    <div class="form-group">
      <label>Мир</label>
      <div class="form-fields"><select name="manifest">${options}</select></div>
    </div>
    <div class="form-group">
      <label>Название сцены</label>
      <div class="form-fields"><input type="text" name="name" placeholder="${manifests[0].name}"></div>
    </div>`;
  const result = await foundry.applications.api.DialogV2.prompt({
    window: { title: "Создать глобус" },
    content,
    rejectClose: false,
    ok: {
      label: "Создать",
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
    name: result.name || manifest.name,
    width: 20000,
    height: 20000,
    padding: 0,
    backgroundColor: "#000000",
    grid: { type: CONST.GRID_TYPES.GRIDLESS },
    tokenVision: false,
    flags: { [MODULE]: { manifest: manifest.id } }
  });
  scene.view();
}

export function injectSceneConfig(app, html) {
  const element = asElement(html);
  const basics = element.querySelector('div.tab[data-tab="basics"]');
  if (!basics || basics.querySelector(`[name="flags.${MODULE}.manifest"]`)) return;
  const current = app.document.flags?.[MODULE]?.manifest ?? "";
  const options = [
    `<option value="">—</option>`,
    ...allManifests().map(
      (m) => `<option value="${m.id}" ${m.id === current ? "selected" : ""}>${m.name}</option>`
    )
  ].join("");
  const group = document.createElement("div");
  group.className = "form-group";
  group.innerHTML = `
    <label>Глобус</label>
    <div class="form-fields"><select name="flags.${MODULE}.manifest">${options}</select></div>
    <p class="hint">Сцена рендерится как глобус выбранного мира.</p>`;
  basics.append(group);
}

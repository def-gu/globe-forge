const BUILTIN = ["golarion"];

const registry = new Map();
let loadPromise = null;

async function load() {
  for (const id of BUILTIN) {
    const route = foundry.utils.getRoute(`modules/globe-forge/manifests/${id}.json`);
    const res = await fetch(route);
    if (!res.ok) {
      console.error(`globe-forge: не удалось загрузить манифест ${id}: HTTP ${res.status}`);
      continue;
    }
    const manifest = await res.json();
    registry.set(manifest.id, manifest);
  }
}

export function manifestsReady() {
  loadPromise ??= load();
  return loadPromise;
}

export const getManifest = (id) => registry.get(id);
export const allManifests = () => [...registry.values()];

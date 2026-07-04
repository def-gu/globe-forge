const BUILTIN = ["golarion"];

const registry = new Map();
let loadPromise = null;

async function load() {
  for (const id of BUILTIN) {
    const route = foundry.utils.getRoute(`modules/globe-forge/manifests/${id}.json`);
    const res = await fetch(route);
    if (!res.ok) {
      console.error(`globe-forge: failed to load manifest ${id}: HTTP ${res.status}`);
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

export const manifestName = (manifest) =>
  typeof manifest.name === "string"
    ? manifest.name
    : manifest.name[game.i18n.lang] ?? manifest.name.en ?? Object.values(manifest.name)[0];

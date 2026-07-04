import { lonLatToScenePx, wrapLon } from "./geo.mjs";

const visibleNote = (note) => game.user.isGM || !note.entryId || (note.entry?.visible ?? false);

const MODULE = "globe-forge";

export function openNote(scene, id) {
  const note = scene.notes.get(id);
  const entry = note?.entry;
  if (!entry) return;
  const options = {};
  if (note.pageId) options.pageId = note.pageId;
  entry.sheet.render(true, options);
}

// A note counts as anchored to a location either by the stored feature fid
// (set when created from the location card) or by plain proximity, so pins
// dropped by hand onto the same spot are picked up too. Only notes visible
// to the current user count: a hidden journal must not surface in the card.
export function findAnchoredNote(scene, fid, px, radiusPx = 30) {
  const notes = scene.notes.filter(visibleNote);
  return (
    notes.find((n) => n.getFlag(MODULE, "fid") === fid) ??
    notes.find((n) => Math.hypot(n.x - px.x, n.y - px.y) <= radiusPx)
  );
}

export const canCreateJournalPin = () =>
  game.user.hasPermission("NOTE_CREATE") && getDocumentClass("JournalEntry").canUserCreate(game.user);

export async function createJournalPin(scene, { name, x, y, fid }) {
  const entry = await getDocumentClass("JournalEntry").create({ name });
  if (!entry) return null;
  const [note] = await scene.createEmbeddedDocuments("Note", [
    {
      entryId: entry.id,
      x: Math.round(x),
      y: Math.round(y),
      flags: { [MODULE]: { fid } }
    }
  ]);
  return note;
}

export function attachNotes(map, scene, sceneSize) {
  const container = map.getContainer();
  const canCreate = () => game.user.hasPermission("NOTE_CREATE");
  const onDragOver = (ev) => {
    if (canCreate()) ev.preventDefault();
  };
  const onDrop = async (ev) => {
    if (!canCreate()) return;
    const TextEditor = foundry.applications.ux.TextEditor.implementation;
    const data = TextEditor.getDragEventData(ev);
    if (!["JournalEntry", "JournalEntryPage"].includes(data?.type)) return;
    ev.preventDefault();
    ev.stopPropagation();
    const doc = await fromUuid(data.uuid);
    if (!doc) return;
    const page = doc.documentName === "JournalEntryPage" ? doc : null;
    const entry = page ? page.parent : doc;
    const rect = container.getBoundingClientRect();
    const lngLat = map.unproject([ev.clientX - rect.left, ev.clientY - rect.top]);
    const px = lonLatToScenePx({ lon: wrapLon(lngLat.lng), lat: lngLat.lat }, sceneSize);
    await scene.createEmbeddedDocuments("Note", [
      { entryId: entry.id, pageId: page?.id ?? null, x: Math.round(px.x), y: Math.round(px.y) }
    ]);
  };
  container.addEventListener("dragover", onDragOver);
  container.addEventListener("drop", onDrop);

  return () => {
    container.removeEventListener("dragover", onDragOver);
    container.removeEventListener("drop", onDrop);
  };
}

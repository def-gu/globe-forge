const defaultFetchJson = async (url) => {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}: ${url}`);
  return res.json();
};

/**
 * Popup texts are sharded into `slices` JSON files keyed by feature fid
 * (shard = fid % slices, mirroring the pf-wikis data layout).
 */
export function createTextIndex({ url, slices }, fetchJson = defaultFetchJson) {
  const texts = new Map();
  const loading = new Array(slices);

  const loadSlice = (slice) =>
    (loading[slice] ??= fetchJson(url.replace("{slice}", slice)).then(
      (data) => {
        for (const [fid, text] of Object.entries(data)) texts.set(Number(fid), text);
      },
      (err) => {
        loading[slice] = undefined;
        throw err;
      }
    ));

  return {
    async textFor(fid) {
      if (!Number.isInteger(fid)) return undefined;
      await loadSlice(fid % slices);
      return texts.get(fid);
    }
  };
}

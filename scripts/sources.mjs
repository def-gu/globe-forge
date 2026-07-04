export async function probeRange(url) {
  try {
    const res = await fetch(url, { headers: { Range: "bytes=0-13" } });
    return res.ok;
  } catch {
    return false;
  }
}

export async function firstReachable(urls, probe = probeRange) {
  for (const url of urls) {
    if (await probe(url)) return url;
  }
  return null;
}

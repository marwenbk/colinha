// manifest.json: {path: sha1hex} for every file in the pass.

const hex = (b: ArrayBuffer) =>
  Array.from(new Uint8Array(b), (x) => x.toString(16).padStart(2, '0')).join('');

export async function buildManifest(files: Record<string, Uint8Array>): Promise<Uint8Array> {
  const entries = await Promise.all(
    Object.entries(files).map(
      async ([path, data]) =>
        [path, hex(await crypto.subtle.digest('SHA-1', data as Uint8Array<ArrayBuffer>))] as const,
    ),
  );
  return new TextEncoder().encode(JSON.stringify(Object.fromEntries(entries)));
}

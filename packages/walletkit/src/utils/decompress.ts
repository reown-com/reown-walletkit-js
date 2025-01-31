import decompress from "brotli/decompress";

export async function decompressData(data: Uint8Array): Promise<Uint8Array> {
  return await new Promise((resolve) => {
    const compressed = decompress(Buffer.from(data));
    resolve(compressed);
  });
}

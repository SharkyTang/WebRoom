import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const families = ['floor', 'walls', 'door', 'window', 'curtains', 'desk', 'cabinet', 'bed', 'bedside', 'sofa', 'chair', 'coffee', 'sidetable', 'beanbag', 'rugs', 'dogbed'];
const assets = [], imageGroups = new Map();
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
for (const family of families) {
  const file = `public/models/production/${family}_v06a.glb`, bytes = await fs.readFile(path.join(root, file));
  const length = bytes.readUInt32LE(12), json = JSON.parse(bytes.subarray(20, 20 + length)), bin = bytes.subarray(28 + length);
  const images = (json.images ?? []).map(image => {
    if (image.uri || image.mimeType !== 'image/png') throw new Error(`Unexpected external or non-PNG texture: ${family}`);
    const view = json.bufferViews[image.bufferView], png = bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
    const hash = sha(png), width = png.readUInt32BE(16), height = png.readUInt32BE(20);
    const result = { name: image.name, sha256: hash, width, height, bytes: png.length, estimatedRGBABytesWithMipmaps: Math.round(width * height * 4 * 4 / 3) };
    const group = imageGroups.get(hash) ?? { ...result, families: [] };
    group.families.push(family); imageGroups.set(hash, group); return result;
  });
  let triangles = 0, primitives = 0;
  for (const mesh of json.meshes ?? []) for (const primitive of mesh.primitives) {
    if ((primitive.mode ?? 4) !== 4) throw new Error(`Non-triangle primitive: ${family}`);
    primitives++; triangles += json.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3;
  }
  const embeddedImageBytes = images.reduce((n, image) => n + image.bytes, 0);
  assets.push({ family, file, sha256: sha(bytes), bytes: bytes.length, embeddedImageBytes, otherBytes: bytes.length - embeddedImageBytes, triangles, primitives, materials: json.materials.length, images, estimatedRGBABytesWithMipmaps: images.reduce((n, image) => n + image.estimatedRGBABytesWithMipmaps, 0) });
}
const sum = key => assets.reduce((n, asset) => n + asset[key], 0);
const uniqueImages = [...imageGroups.values()], embeddedImageBytes = sum('embeddedImageBytes');
const result = {
  generatedAt: new Date().toISOString(), assets,
  totals: { bytes: sum('bytes'), triangles: sum('triangles'), primitives: sum('primitives'), embeddedImageBytes, otherBytes: sum('otherBytes'), imageCopies: assets.reduce((n, asset) => n + asset.images.length, 0), uniqueImages: uniqueImages.length, uniqueImageBytes: uniqueImages.reduce((n, image) => n + image.bytes, 0), repeatedEmbeddedBytes: embeddedImageBytes - uniqueImages.reduce((n, image) => n + image.bytes, 0), estimatedRGBABytesWithMipmaps: sum('estimatedRGBABytesWithMipmaps') },
  uniqueImages,
  limits: 'GLB disk bytes include embedded textures; no external image requests. Identical image hashes across GLBs are repeated deliveries and independently owned texture instances. RGBA plus mip estimate is not actual GPU VRAM; renderer texture UUIDs and HTTP transfer sizes are measured separately in furniture-performance.json.',
};
await fs.writeFile(path.join(root, 'validation/v06a/asset-budget-ledger.json'), JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.totals, null, 2));

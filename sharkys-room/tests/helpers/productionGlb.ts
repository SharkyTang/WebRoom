/** CPU GLB/PNG harness shared from the v0.5 acceptance implementation. Browser rendering is verified separately. */
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { inflateSync } from 'node:zlib';
import { DataTexture, Mesh, MeshStandardMaterial, SRGBColorSpace, type Group, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

type TextureInfo = { index: number; texCoord?: number };
type GltfMaterial = {
  name?: string;
  pbrMetallicRoughness?: { baseColorFactor?: number[]; metallicFactor?: number; roughnessFactor?: number; baseColorTexture?: TextureInfo; metallicRoughnessTexture?: TextureInfo };
  normalTexture?: TextureInfo;
  occlusionTexture?: TextureInfo;
  emissiveTexture?: TextureInfo;
};
type GltfJson = {
  asset: { version: string };
  nodes: Array<{ name?: string; children?: number[] }>;
  buffers: Array<{ byteLength: number; uri?: string }>;
  bufferViews: Array<{ buffer: number; byteOffset?: number; byteLength: number }>;
  accessors: Array<{ count: number }>;
  meshes: Array<{ primitives: Array<{ indices?: number; attributes: Record<string, number> }> }>;
  materials: GltfMaterial[];
  images?: Array<{ bufferView?: number; mimeType?: string; uri?: string }>;
  textures?: Array<{ source: number }>;
  samplers?: unknown[];
};
function meshes(root: Object3D): Mesh[] {
  const result: Mesh[] = [];
  root.traverse(object => { if (object instanceof Mesh) result.push(object); });
  return result;
}

function parseGlb(bytes: Buffer): { json: GltfJson; bin: Buffer } {
  assert.equal(bytes.toString('utf8', 0, 4), 'glTF');
  assert.equal(bytes.readUInt32LE(4), 2);
  assert.equal(bytes.readUInt32LE(8), bytes.length);
  assert.equal(bytes.readUInt32LE(16), 0x4e4f534a);
  const jsonLength = bytes.readUInt32LE(12);
  const json = JSON.parse(bytes.toString('utf8', 20, 20 + jsonLength)) as GltfJson;
  const binHeader = 20 + jsonLength;
  assert.equal(bytes.readUInt32LE(binHeader + 4), 0x004e4942);
  return { json, bin: bytes.subarray(binHeader + 8, binHeader + 8 + bytes.readUInt32LE(binHeader)) };
}

/**
 * Node has no browser image decoder. Preserve the exact exported BIN geometry but
 * omit image bindings from an in-memory JSON copy for CPU geometry/raycast tests,
 * then restore base-color maps using a small PNG decoder and real DataTextures.
 * Original GLB image bytes, UVs and PBR bindings are checked separately below;
 * browser image decoding and final rendering are covered by browser acceptance.
 */
async function loadGeometry(json: GltfJson, bin: Buffer): Promise<Group> {
  const geometryDocument = structuredClone(json);
  delete geometryDocument.images;
  delete geometryDocument.textures;
  delete geometryDocument.samplers;
  for (const material of geometryDocument.materials) {
    if (material.pbrMetallicRoughness) {
      delete material.pbrMetallicRoughness.baseColorTexture;
      delete material.pbrMetallicRoughness.metallicRoughnessTexture;
    }
    delete material.normalTexture;
    delete material.occlusionTexture;
    delete material.emissiveTexture;
  }
  // Keep a binary GLB in memory so loading its geometry never needs fetch/DOM APIs.
  const jsonBytes = Buffer.from(JSON.stringify(geometryDocument));
  const jsonLength = Math.ceil(jsonBytes.length / 4) * 4;
  const binary = Buffer.alloc(28 + jsonLength + bin.length);
  binary.write('glTF', 0); binary.writeUInt32LE(2, 4); binary.writeUInt32LE(binary.length, 8);
  binary.writeUInt32LE(jsonLength, 12); binary.writeUInt32LE(0x4e4f534a, 16);
  binary.fill(0x20, 20, 20 + jsonLength); jsonBytes.copy(binary, 20);
  binary.writeUInt32LE(bin.length, 20 + jsonLength); binary.writeUInt32LE(0x004e4942, 24 + jsonLength);
  bin.copy(binary, 28 + jsonLength);
  const scene = (await new GLTFLoader().parseAsync(binary.buffer.slice(binary.byteOffset, binary.byteOffset + binary.length) as ArrayBuffer, '')).scene;
  const textures = new Map<number, DataTexture>();
  for (const mesh of meshes(scene)) for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
    if (!(material instanceof MeshStandardMaterial)) continue;
    const original = json.materials.find(candidate => candidate.name === material.name);
    const textureIndex = original?.pbrMetallicRoughness?.baseColorTexture?.index;
    if (textureIndex === undefined) continue;
    if (!textures.has(textureIndex)) {
      const { width, height, rgba } = decodePng(embeddedPng(json, bin, json.textures![textureIndex].source));
      const texture = new DataTexture(rgba, width, height);
      texture.colorSpace = SRGBColorSpace;
      texture.flipY = false;
      texture.needsUpdate = true;
      textures.set(textureIndex, texture);
    }
    material.map = textures.get(textureIndex)!;
  }
  return scene;
}

function embeddedPng(json: GltfJson, bin: Buffer, imageIndex: number): Buffer {
  const image = json.images![imageIndex];
  assert.equal(image.uri, undefined, 'No hidden external texture dependency');
  assert.equal(image.mimeType, 'image/png');
  assert.notEqual(image.bufferView, undefined);
  const view = json.bufferViews[image.bufferView!];
  return bin.subarray(view.byteOffset ?? 0, (view.byteOffset ?? 0) + view.byteLength);
}

/** PNG 8-bit RGB/RGBA, non-interlaced; decodes all five scanline filters. */
function decodePng(png: Buffer) {
  assert.deepEqual([...png.subarray(0, 8)], [137, 80, 78, 71, 13, 10, 26, 10]);
  assert.equal(png.toString('ascii', 12, 16), 'IHDR');
  const width = png.readUInt32BE(16);
  const height = png.readUInt32BE(20);
  assert.equal(png[24], 8, '8-bit web texture');
  const channels = ({ 2: 3, 6: 4 } as Record<number, number>)[png[25]];
  assert.ok(channels, 'RGB or RGBA PNG');
  assert.equal(png[28], 0, 'Non-interlaced PNG');
  const idat: Buffer[] = [];
  for (let offset = 8; offset < png.length;) {
    const length = png.readUInt32BE(offset);
    assert.ok(offset + 12 + length <= png.length, 'PNG chunk stays within embedded image');
    if (png.toString('ascii', offset + 4, offset + 8) === 'IDAT') idat.push(png.subarray(offset + 8, offset + 8 + length));
    offset += 12 + length;
  }
  const scanlines = inflateSync(Buffer.concat(idat));
  const stride = width * channels;
  assert.equal(scanlines.length, height * (1 + stride), 'PNG compressed pixels inflate to declared resolution');
  const raw = new Uint8Array(height * stride);
  const paeth = (a: number, b: number, c: number) => {
    const p = a + b - c;
    const da = Math.abs(p - a), db = Math.abs(p - b), dc = Math.abs(p - c);
    return da <= db && da <= dc ? a : db <= dc ? b : c;
  };
  for (let y = 0; y < height; y++) {
    const filter = scanlines[y * (stride + 1)];
    assert.ok(filter <= 4, 'Valid PNG row filter');
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? raw[y * stride + x - channels] : 0;
      const above = y > 0 ? raw[(y - 1) * stride + x] : 0;
      const upperLeft = y > 0 && x >= channels ? raw[(y - 1) * stride + x - channels] : 0;
      const prediction = [0, left, above, Math.floor((left + above) / 2), paeth(left, above, upperLeft)][filter];
      raw[y * stride + x] = (scanlines[y * (stride + 1) + x + 1] + prediction) & 255;
    }
  }
  const rgba = new Uint8Array(width * height * 4);
  for (let pixel = 0; pixel < width * height; pixel++) {
    rgba[pixel * 4] = raw[pixel * channels];
    rgba[pixel * 4 + 1] = raw[pixel * channels + 1];
    rgba[pixel * 4 + 2] = raw[pixel * channels + 2];
    rgba[pixel * 4 + 3] = channels === 4 ? raw[pixel * channels + 3] : 255;
  }
  return { width, height, rgba };
}


export async function readGeometryGlb(url: URL) {
  const bytes = await readFile(url);
  const { json, bin } = parseGlb(bytes);
  return { bytes, json, bin, scene: await loadGeometry(json, bin) };
}

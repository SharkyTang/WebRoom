import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { before, describe, it } from 'node:test';
import { inflateSync } from 'node:zlib';
import { Box3, DataTexture, Matrix4, Mesh, MeshStandardMaterial, Quaternion, Raycaster, SRGBColorSpace, Vector3, type Group, type Material, type Object3D } from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { installAssetFamily, validateAssetFamily, validateAssembly } from '../lib/room/assets/assetAssembly';
import { loadProductionAssets } from '../lib/room/assets/loadProductionAssets';
import { validateScene } from '../lib/room/diagnostics';
import { resolveInteraction } from '../lib/room/interactiveObjects';
import { createMechanisms } from '../lib/room/mechanisms';

const families = ['monitor', 'macbook', 'marshall'] as const;
type Family = typeof families[number];
const roots: Record<Family, ReadonlyArray<readonly [string, string]>> = {
  monitor: [['VIS_MonitorBody', 'TEC_MonitorBody'], ['VIS_MonitorDisplaySurface', 'TEC_MonitorScreen']],
  macbook: [['VIS_MacBookBase', 'TEC_MacBookBase'], ['VIS_MacBookLid', 'TEC_MacBookScreen']],
  marshall: [['VIS_MarshallBody', 'TEC_Marshall']],
};
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
type Asset = { bytes: Buffer; json: GltfJson; bin: Buffer; scene: Group };
const assets = new Map<Family, Asset>();
let frozenScene: Group;

function node(root: Object3D, name: string): Object3D {
  const found = root.getObjectByName(name);
  assert.ok(found, `Required production node: ${name}`);
  return found;
}

function meshes(root: Object3D): Mesh[] {
  const result: Mesh[] = [];
  root.traverse(object => { if (object instanceof Mesh) result.push(object); });
  return result;
}

function getAsset(family: Family): Asset {
  const result = assets.get(family);
  assert.ok(result, `${family} must load as a production asset; greybox fallback is not a pass`);
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

before(async () => {
  const sourceBytes = await readFile(new URL('../public/models/sharkys_room_blockout_FINAL.glb', import.meta.url));
  frozenScene = (await new GLTFLoader().parseAsync(sourceBytes.buffer.slice(sourceBytes.byteOffset, sourceBytes.byteOffset + sourceBytes.byteLength) as ArrayBuffer, '')).scene;
  for (const family of families) {
    const bytes = await readFile(new URL(`../public/models/production/${family}_pilot.glb`, import.meta.url));
    const { json, bin } = parseGlb(bytes);
    assets.set(family, { bytes, json, bin, scene: await loadGeometry(json, bin) });
  }
});

/** Exact vertex bounds in a requested coordinate frame, including mesh children. */
function vertexBounds(root: Object3D, frame?: Object3D): Box3 {
  root.updateWorldMatrix(true, true);
  frame?.updateWorldMatrix(true, false);
  const inverse = frame ? frame.matrixWorld.clone().invert() : new Matrix4();
  const result = new Box3();
  const vertex = new Vector3();
  for (const mesh of meshes(root)) {
    const transform = inverse.clone().multiply(mesh.matrixWorld);
    const positions = mesh.geometry.getAttribute('position');
    for (let index = 0; index < positions.count; index++) result.expandByPoint(vertex.fromBufferAttribute(positions, index).applyMatrix4(transform));
  }
  return result;
}

function snapshot(root: Object3D) {
  const result: unknown[] = [];
  root.traverse(object => result.push({ name: object.name, parent: object.parent?.name, position: object.position.toArray(), quaternion: object.quaternion.toArray(), scale: object.scale.toArray() }));
  return result;
}

function assemble() {
  const room = frozenScene.clone(true);
  const installed = families.map(family => installAssetFamily(room, family, getAsset(family).scene.clone(true)));
  room.updateMatrixWorld(true);
  return { room, dispose: () => { for (const family of installed.reverse()) family.dispose(); } };
}

function findTriangleRay(mesh: Mesh): Raycaster {
  mesh.updateWorldMatrix(true, false);
  const positions = mesh.geometry.getAttribute('position');
  const indices = mesh.geometry.index;
  const a = new Vector3();
  const b = new Vector3();
  const c = new Vector3();
  for (let index = 0; index < (indices?.count ?? positions.count); index += 3) {
    a.fromBufferAttribute(positions, indices?.getX(index) ?? index).applyMatrix4(mesh.matrixWorld);
    b.fromBufferAttribute(positions, indices?.getX(index + 1) ?? index + 1).applyMatrix4(mesh.matrixWorld);
    c.fromBufferAttribute(positions, indices?.getX(index + 2) ?? index + 2).applyMatrix4(mesh.matrixWorld);
    const normal = b.clone().sub(a).cross(c.clone().sub(a));
    if (normal.lengthSq() < 1e-18) continue;
    normal.normalize();
    const centre = a.clone().add(b).add(c).multiplyScalar(1 / 3);
    const ray = new Raycaster(centre.addScaledVector(normal, .02), normal.negate(), 0, .1);
    if (ray.intersectObject(mesh, false).length) return ray;
  }
  assert.fail(`Exported mesh must have an actual hittable triangle: ${mesh.name}`);
}

describe('v0.5 independently exported production asset contracts', () => {
  it('retains frozen GLB, Blender source and manifest byte hashes recorded before v0.5', async () => {
    const baseline = JSON.parse(await readFile(new URL('../validation/v05/baseline/source-baseline.json', import.meta.url), 'utf8')) as { hashes: Array<{ path: string; sha256: string }> };
    const frozen = baseline.hashes.filter(({ path }) => /sharkys_room_blockout_FINAL\.(blend|glb)$|frozenSceneManifest\.json$/.test(path));
    assert.equal(frozen.length, 4);
    for (const record of frozen) {
      const bytes = await readFile(new URL(`../${record.path}`, import.meta.url));
      assert.equal(createHash('sha256').update(bytes).digest('hex'), record.sha256, `Frozen bytes unchanged: ${record.path}`);
    }
    assert.equal(validateScene(frozenScene).ok, true);
  });

  for (const family of families) {
    it(`${family}: has unique named visual roots, finite UVs, normals and standard PBR materials`, () => {
      const { scene, json } = getAsset(family);
      assert.deepEqual(validateAssetFamily(family, scene), []);
      const names = json.nodes.map(object => object.name);
      assert.ok(names.every(name => name?.startsWith('VIS_')), 'Production export cannot introduce another semantic or camera anchor');
      assert.equal(new Set(names).size, names.length);
      for (const [name] of roots[family]) {
        const root = node(scene, name);
        assert.deepEqual(root.position.toArray(), [0, 0, 0]);
        assert.deepEqual(root.quaternion.toArray(), [0, 0, 0, 1]);
        assert.deepEqual(root.scale.toArray(), [1, 1, 1]);
      }
      assert.ok(meshes(scene).length >= 4, 'Production asset has modeled components beyond the old proxy');
      for (const mesh of meshes(scene)) {
        const positions = mesh.geometry.getAttribute('position');
        const normals = mesh.geometry.getAttribute('normal');
        const uv = mesh.geometry.getAttribute('uv');
        assert.ok(positions.count > 0 && normals && uv, `${mesh.name}: POSITION / NORMAL / TEXCOORD_0 required`);
        assert.equal(uv.count, positions.count);
        assert.equal(normals.count, positions.count);
        assert.ok(Array.from(positions.array).every(Number.isFinite), mesh.name);
        assert.ok(Array.from(normals.array).every(Number.isFinite), mesh.name);
        assert.ok(Array.from(uv.array).every(Number.isFinite), mesh.name);
        const coordinates = new Set(Array.from({ length: uv.count }, (_, index) => `${uv.getX(index)},${uv.getY(index)}`));
        assert.ok(coordinates.size >= 3, `${mesh.name}: UVs must span a real surface`);
        for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) {
          assert.ok(material instanceof MeshStandardMaterial, `${mesh.name}: glTF PBR material`);
          assert.ok(material.roughness >= 0 && material.roughness <= 1);
          assert.ok(material.metalness >= 0 && material.metalness <= 1);
        }
      }
    });
  }

  it('uses self-contained correctly bound PNG textures with decodable pixels at the intended resolution', () => {
    let imageCount = 0;
    for (const family of families) {
      const { json, bin } = getAsset(family);
      for (const texture of json.textures ?? []) assert.ok(json.images?.[texture.source], `${family}: texture source exists`);
      for (const material of json.materials) {
        const maps = [material.pbrMetallicRoughness?.baseColorTexture, material.pbrMetallicRoughness?.metallicRoughnessTexture, material.normalTexture, material.occlusionTexture, material.emissiveTexture].filter(Boolean) as TextureInfo[];
        for (const map of maps) {
          assert.ok(json.textures?.[map.index], `${family}: bound texture exists`);
          assert.equal(map.texCoord ?? 0, 0, 'All supplied textured surfaces use tested UV0');
        }
      }
      for (const [imageIndex] of (json.images ?? []).entries()) {
        imageCount++;
        const { width, height, rgba } = decodePng(embeddedPng(json, bin, imageIndex));
        assert.ok(width >= 512 && width <= 1024 && height >= 512 && height <= 1024, `${width} × ${height}`);
        assert.equal(rgba.length, width * height * 4);
      }
    }
    assert.ok(imageCount >= 1, 'Marshall grille exercises the actual texture pipeline');
  });

  it('reports actual triangles and network bytes within the pilot targets, without treating mesh count as draw calls', context => {
    let totalTriangles = 0;
    let totalBytes = 0;
    for (const family of families) {
      const { json, bytes } = getAsset(family);
      const triangles = json.meshes.flatMap(mesh => mesh.primitives).reduce((count, primitive) => count + json.accessors[primitive.indices ?? primitive.attributes.POSITION].count / 3, 0);
      totalTriangles += triangles;
      totalBytes += bytes.length;
      context.diagnostic(`${family}: ${triangles} triangles; ${bytes.length} network bytes; ${json.materials.length} materials; ${json.images?.length ?? 0} images`);
    }
    assert.ok(totalTriangles <= 60000, `${totalTriangles} triangles exceeds preferred pilot target`);
    assert.ok(totalBytes <= 5 * 1024 * 1024, `${totalBytes} bytes exceeds preferred pilot target`);
  });
});

describe('v0.5 production geometry installed on the actual frozen anchors', () => {
  it('settles a single GLB 404 as that family fallback while installing other families, then permits a clean retry', async context => {
    const room = frozenScene.clone(true);
    const initial = snapshot(room);
    context.mock.method(globalThis, 'fetch', async (input: string | URL | Request) => {
      const path = String(input);
      if (path.includes('marshall')) return new Response('not found', { status: 404 });
      const family = path.includes('macbook') ? 'macbook' : 'monitor';
      return new Response(new Uint8Array(getAsset(family).bytes), { status: 200 });
    });
    const sourceSpeaker = node(room, 'TEC_Marshall') as Mesh;
    const sourceMaterial = sourceSpeaker.material;
    const loaded = await loadProductionAssets(room, new AbortController().signal, families);
    assert.equal(loaded.report.monitor.status, 'installed');
    assert.equal(loaded.report.macbook.status, 'installed');
    assert.equal(loaded.report.marshall.status, 'fallback');
    assert.match(loaded.report.marshall.error ?? '', /404/);
    assert.equal(sourceSpeaker.material, sourceMaterial);
    assert.equal(resolveInteraction(findTriangleRay(sourceSpeaker).intersectObject(sourceSpeaker, false)[0].object), 'marshall');
    assert.equal(loaded.assembly.ok, true, JSON.stringify(loaded.assembly.errors));
    loaded.dispose();
    loaded.dispose();
    assert.deepEqual(snapshot(room), initial);
    assert.equal(validateScene(room).ok, true);
    const retry = await loadProductionAssets(room, new AbortController().signal, families);
    assert.equal(retry.report.monitor.status, 'installed', 'Unmounting removes registry ownership for the next mount');
    assert.equal(retry.report.macbook.status, 'installed');
    retry.dispose();
    assert.equal(validateScene(room).ok, true);
  });

  it('ignores late successful fetch continuations after an unmount abort without installing into the discarded room', async context => {
    const room = frozenScene.clone(true);
    const initial = snapshot(room);
    const controller = new AbortController();
    const pending: Array<() => void> = [];
    context.mock.method(globalThis, 'fetch', (input: string | URL | Request) => new Promise<Response>(resolve => {
      const path = String(input);
      const family = families.find(candidate => path.includes(candidate))!;
      pending.push(() => resolve(new Response(new Uint8Array(getAsset(family).bytes), { status: 200 })));
    }));
    const loading = loadProductionAssets(room, controller.signal, families);
    assert.equal(pending.length, 3);
    controller.abort();
    pending.forEach(settle => settle());
    const loaded = await loading;
    assert.deepEqual(snapshot(room), initial);
    assert.deepEqual(loaded.assembly.installedFamilies, []);
    assert.equal(validateScene(room).ok, true);
    loaded.dispose();
  });

  it('rolls back a completed family when unmounted while the other two family fetches remain pending', async context => {
    const room = frozenScene.clone(true);
    const initial = snapshot(room);
    const controller = new AbortController();
    const pending: Array<() => void> = [];
    context.mock.method(globalThis, 'fetch', (input: string | URL | Request) => {
      const path = String(input);
      const family = families.find(candidate => path.includes(candidate))!;
      const response = () => new Response(new Uint8Array(getAsset(family).bytes), { status: 200 });
      if (family === 'monitor') return Promise.resolve(response());
      return new Promise<Response>(resolve => { pending.push(() => resolve(response())); });
    });
    const loading = loadProductionAssets(room, controller.signal, families);
    for (let turn = 0; turn < 30 && !room.getObjectByName('VIS_MonitorBody'); turn++) await new Promise<void>(resolve => setImmediate(resolve));
    assert.ok(room.getObjectByName('VIS_MonitorBody'), 'Monitor completes while the other model responses are still pending');
    assert.equal(pending.length, 2);
    controller.abort();
    assert.equal(room.getObjectByName('VIS_MonitorBody'), undefined, 'Abort immediately rolls back the completed family');
    pending.forEach(settle => settle());
    const loaded = await loading;
    assert.deepEqual(snapshot(room), initial);
    assert.deepEqual(loaded.assembly.installedFamilies, []);
    assert.equal(validateScene(room).ok, true);
    loaded.dispose();
  });

  it('rejects an incomplete family before suppressing any proxy or attaching any partial production subtree', () => {
    const room = frozenScene.clone(true);
    const before = snapshot(room);
    const sourceMaterials = new Map(meshes(room).map(mesh => [mesh, mesh.material]));
    const incomplete = getAsset('macbook').scene.clone(true);
    node(incomplete, 'VIS_MacBookLid').removeFromParent();
    assert.ok(validateAssetFamily('macbook', incomplete).length > 0);
    assert.throws(() => installAssetFamily(room, 'macbook', incomplete));
    assert.deepEqual(snapshot(room), before);
    for (const [mesh, material] of sourceMaterials) assert.equal(mesh.material, material);
    assert.equal(validateScene(room).ok, true, 'A failed family leaves its usable greybox fallback intact');
  });

  for (const [family, visual, expectedRoot] of [
    ['macbook', 'VIS_MacBookLidHousing', 'VIS_MacBookLid'],
    ['macbook', 'VIS_MacBookDisplaySurface', 'VIS_MacBookLid'],
    ['marshall', 'VIS_MarshallGrille', 'VIS_MarshallBody'],
    ['marshall', 'VIS_MarshallPowerIndicator', 'VIS_MarshallBody'],
  ] as const) {
    it(`rejects ${visual} exported outside ${expectedRoot} before changing its usable greybox`, () => {
      const room = frozenScene.clone(true);
      const initial = snapshot(room);
      const asset = getAsset(family).scene.clone(true);
      const wrongParent = family === 'macbook' ? node(asset, 'VIS_MacBookBase') : asset;
      wrongParent.add(node(asset, visual));
      const expected = `Visual hierarchy changed: ${visual} must belong to ${expectedRoot}`;
      assert.ok(validateAssetFamily(family, asset).includes(expected));
      assert.throws(() => installAssetFamily(room, family, asset), /Visual hierarchy changed/);
      assert.deepEqual(snapshot(room), initial);
      assert.equal(validateScene(room).ok, true);
    });
  }

  it('rejects unbound exported geometry outside the declared part roots rather than silently dropping it', () => {
    const room = frozenScene.clone(true);
    const asset = getAsset('macbook').scene.clone(true);
    const unbound = node(asset, 'VIS_MacBookCamera').clone(true);
    unbound.name = 'VIS_MacBookDetachedCamera';
    asset.add(unbound);
    assert.ok(validateAssetFamily('macbook', asset).includes('Visual outside declared parts: VIS_MacBookDetachedCamera'));
    assert.throws(() => installAssetFamily(room, 'macbook', asset), /Visual outside declared parts/);
    assert.equal(validateScene(room).ok, true);
  });

  it('continues checking required surface membership, presence and uniqueness after installation', () => {
    const { room, dispose } = assemble();
    try {
      for (const [visual, expectedRoot] of [
        ['VIS_MacBookLidHousing', 'VIS_MacBookLid'],
        ['VIS_MacBookDisplaySurface', 'VIS_MacBookLid'],
        ['VIS_MarshallGrille', 'VIS_MarshallBody'],
        ['VIS_MarshallPowerIndicator', 'VIS_MarshallBody'],
      ]) {
        const object = node(room, visual);
        const originalParent = object.parent!;
        node(room, 'VIS_MacBookBase').add(object);
        assert.ok(validateAssembly(room).errors.includes(`Visual hierarchy changed: ${visual} must belong to ${expectedRoot}`));
        originalParent.add(object);
        assert.equal(validateAssembly(room).ok, true);
        object.removeFromParent();
        assert.ok(validateAssembly(room).errors.includes(`Missing or duplicate ${visual}`));
        originalParent.add(object);
        const duplicate = object.clone(true);
        originalParent.add(duplicate);
        assert.ok(validateAssembly(room).errors.includes(`Missing or duplicate ${visual}`));
        duplicate.removeFromParent();
        assert.equal(validateAssembly(room).ok, true);
      }
    } finally { dispose(); }
    assert.equal(validateScene(room).ok, true);
  });

  it('rejects an undecoded grille texture instead of counting the greybox fallback as production success', () => {
    const room = frozenScene.clone(true);
    const asset = getAsset('marshall').scene.clone(true);
    for (const mesh of meshes(node(asset, 'VIS_MarshallGrille'))) {
      const missingTextureMaterials = (Array.isArray(mesh.material) ? mesh.material : [mesh.material]).map(original => {
        const material = (original as MeshStandardMaterial).clone();
        material.map = null;
        return material;
      });
      mesh.material = Array.isArray(mesh.material) ? missingTextureMaterials : missingTextureMaterials[0];
    }
    assert.ok(validateAssetFamily('marshall', asset).some(error => /texture/i.test(error)));
    assert.throws(() => installAssetFamily(room, 'marshall', asset), /texture/i);
    assert.equal(room.getObjectByName('VIS_MarshallBody'), undefined);
    assert.equal(validateScene(room).ok, true);
  });

  it('rolls back a failed installation transaction after attachment, including proxy material and raycast references', context => {
    const room = frozenScene.clone(true);
    const before = snapshot(room);
    const source = meshes(room).map(mesh => ({ mesh, material: mesh.material, raycast: mesh.raycast }));
    const asset = getAsset('monitor').scene.clone(true);
    context.mock.method(room, 'updateMatrixWorld', () => { throw new Error('Injected matrix update failure'); });
    assert.throws(() => installAssetFamily(room, 'monitor', asset), /Injected matrix update failure/);
    assert.deepEqual(snapshot(room), before);
    for (const { mesh, material, raycast } of source) {
      assert.equal(mesh.material, material);
      assert.equal(mesh.raycast, raycast);
      assert.equal(mesh.userData.roomProxySuppressed, undefined);
    }
    assert.deepEqual(validateAssembly(room).installedFamilies, []);
    assert.deepEqual(validateAssetFamily('monitor', asset), [], 'Rolled-back visual parts return to their export parent');
  });

  it('rejects duplicate mounts while preserving the already installed family and allowing a later fresh mount', () => {
    const room = frozenScene.clone(true);
    const installed = installAssetFamily(room, 'monitor', getAsset('monitor').scene.clone(true));
    const actual = node(room, 'VIS_MonitorBody');
    assert.throws(() => installAssetFamily(room, 'monitor', getAsset('monitor').scene.clone(true)), /already installed/);
    assert.equal(node(room, 'VIS_MonitorBody'), actual);
    assert.equal(validateAssembly(room).ok, true);
    installed.dispose();
    const remounted = installAssetFamily(room, 'monitor', getAsset('monitor').scene.clone(true));
    assert.equal(validateAssembly(room).ok, true);
    remounted.dispose();
    assert.equal(validateScene(room).ok, true);
  });

  it('keeps a successfully installed family while another family fails validation', () => {
    const room = frozenScene.clone(true);
    const installed = installAssetFamily(room, 'monitor', getAsset('monitor').scene.clone(true));
    const originalBase = node(room, 'TEC_MacBookBase') as Mesh;
    const originalMaterial = originalBase.material;
    const incomplete = getAsset('macbook').scene.clone(true);
    node(incomplete, 'VIS_MacBookLid').removeFromParent();
    try {
      assert.throws(() => installAssetFamily(room, 'macbook', incomplete));
      assert.ok(node(room, 'VIS_MonitorDisplaySurface'));
      assert.equal(room.getObjectByName('VIS_MacBookBase'), undefined);
      assert.equal(originalBase.material, originalMaterial);
      assert.ok(findTriangleRay(originalBase).intersectObject(originalBase, false).length > 0, 'Fallback geometry remains truly clickable');
      assert.equal(validateAssembly(room).ok, true);
    } finally { installed.dispose(); }
  });

  it('retains source anchor identity/transform/parent, suppresses only source primitives, and rolls back completely', () => {
    const room = frozenScene.clone(true);
    const before = snapshot(room);
    const sourceMaterials = new Map<Mesh, Material | Material[]>(meshes(room).map(mesh => [mesh, mesh.material]));
    const sourceRaycasts = new Map(meshes(room).map(mesh => [mesh, mesh.raycast]));
    const sourcePrimitives = families.flatMap(family => roots[family].flatMap(([, anchor]) => meshes(node(room, anchor))));
    const anchors = new Map(families.flatMap(family => roots[family].map(([, anchor]) => [anchor, node(room, anchor)] as const)));
    const installed = families.map(family => installAssetFamily(room, family, getAsset(family).scene.clone(true)));
    try {
      const validation = validateAssembly(room);
      assert.equal(validation.ok, true, JSON.stringify(validation.errors));
      assert.equal(validation.sourceNodeCount, 85);
      assert.ok(validation.runtimeNodeCount > 0);
      assert.deepEqual([...validation.installedFamilies].sort(), [...families].sort());
      for (const [name, original] of anchors) {
        assert.equal(node(room, name), original);
        assert.equal(original.visible, true, 'Anchor remains visible so its new subtree can render');
      }
      for (const family of families) for (const [visual, anchor] of roots[family]) assert.equal(node(room, visual).parent, anchors.get(anchor));
      for (const primitive of sourcePrimitives) {
        const sourceMaterialList = Array.isArray(primitive.material) ? primitive.material : [primitive.material];
        assert.ok(sourceMaterialList.every(material => !material.visible), 'Original greybox primitive must not render');
        assert.equal(primitive.userData.roomProxySuppressed, true);
        assert.notEqual(primitive.raycast, sourceRaycasts.get(primitive));
        const hits: unknown[] = [];
        primitive.raycast(new Raycaster(), hits as Parameters<Mesh['raycast']>[1]);
        assert.equal(hits.length, 0, 'Invisible source primitive does not claim production clicks');
      }
    } finally { for (const installedFamily of installed.reverse()) installedFamily.dispose(); }
    assert.deepEqual(snapshot(room), before);
    for (const [mesh, material] of sourceMaterials) assert.equal(mesh.material, material);
    for (const [mesh, raycast] of sourceRaycasts) assert.equal(mesh.raycast, raycast);
    assert.equal(validateScene(room).ok, true);
  });

  it('routes ray hits on every actual new visible mesh through the original semantic ancestor', () => {
    const { room, dispose } = assemble();
    try {
      for (const family of families) for (const [root] of roots[family]) for (const mesh of meshes(node(room, root))) {
        assert.equal(mesh.visible, true);
        assert.ok((Array.isArray(mesh.material) ? mesh.material : [mesh.material]).some(material => material.visible));
        const hit = findTriangleRay(mesh).intersectObject(mesh, false)[0];
        assert.equal(hit.object, mesh, 'The hit belongs to new exported triangles');
        assert.equal(resolveInteraction(hit.object), family);
      }
    } finally { dispose(); }
  });

  it('continues rejecting moved targets, moved mechanism pivots and duplicate semantic anchors after installation', () => {
    const { room, dispose } = assemble();
    try {
      for (const name of ['TGT_Monitor', 'TEC_MacBookScreen']) {
        const object = node(room, name);
        const position = object.position.clone();
        object.position.x += .01;
        assert.equal(validateAssembly(room).ok, false, `${name} cannot move to accommodate a production model`);
        object.position.copy(position);
        assert.equal(validateAssembly(room).ok, true);
      }
      const anchor = node(room, 'TEC_MonitorBody');
      const duplicate = anchor.clone(true);
      anchor.parent!.add(duplicate);
      assert.equal(validateAssembly(room).ok, false, 'Original semantic anchors must remain unique');
      duplicate.removeFromParent();
      assert.equal(validateAssembly(room).ok, true);
    } finally { dispose(); }
  });

  it('fits the frozen proxy local envelopes without double-applying axis conversion or open-pose rotation', () => {
    const { room, dispose } = assemble();
    try {
      for (const family of families) for (const [visualName, anchorName] of roots[family]) {
        const sourceAnchor = node(frozenScene, anchorName);
        const allowed = vertexBounds(sourceAnchor, sourceAnchor).expandByScalar(.001);
        const actual = vertexBounds(node(room, visualName), node(room, anchorName));
        assert.ok(allowed.containsBox(actual), `${visualName} exceeds source-local envelope: ${JSON.stringify({ allowed: [allowed.min.toArray(), allowed.max.toArray()], actual: [actual.min.toArray(), actual.max.toArray()] })}`);
      }
      const lid = vertexBounds(node(room, 'VIS_MacBookLid'), node(room, 'TEC_MacBookScreen'));
      assert.ok(lid.max.y < .026 && lid.max.z > .2, 'Lid geometry is defined in the standard closed anchor frame');
    } finally { dispose(); }
  });

  it('keeps CanvasTexture text upright and unmirrored on both real screen UVs at the authored open pose', () => {
    const { room, dispose } = assemble();
    try {
      for (const name of ['VIS_MonitorDisplaySurface', 'VIS_MacBookDisplaySurface']) {
        const screenMeshes = meshes(node(room, name));
        const vertices: Array<{ x: number; y: number; u: number; v: number }> = [];
        for (const mesh of screenMeshes) {
          mesh.updateWorldMatrix(true, false);
          const positions = mesh.geometry.getAttribute('position');
          const uv = mesh.geometry.getAttribute('uv');
          for (let index = 0; index < positions.count; index++) {
            const world = new Vector3().fromBufferAttribute(positions, index).applyMatrix4(mesh.matrixWorld);
            vertices.push({ x: world.x, y: world.y, u: uv.getX(index), v: uv.getY(index) });
          }
        }
        const top = Math.max(...vertices.map(vertex => vertex.y));
        const bottom = Math.min(...vertices.map(vertex => vertex.y));
        const left = Math.min(...vertices.map(vertex => vertex.x));
        const right = Math.max(...vertices.map(vertex => vertex.x));
        for (const vertex of vertices) {
          if (Math.abs(vertex.y - top) < 1e-6) assert.ok(Math.abs(vertex.v) < 1e-6, `${name}: visible top is canvas v=0`);
          if (Math.abs(vertex.y - bottom) < 1e-6) assert.ok(Math.abs(vertex.v - 1) < 1e-6, `${name}: visible bottom is canvas v=1`);
          if (Math.abs(vertex.x - left) < 1e-6) assert.ok(Math.abs(vertex.u) < 1e-6, `${name}: visible left is canvas u=0`);
          if (Math.abs(vertex.x - right) < 1e-6) assert.ok(Math.abs(vertex.u - 1) < 1e-6, `${name}: visible right is canvas u=1`);
        }
      }
    } finally { dispose(); }
  });

  it('maintains desk and keyboard clearance at closed, halfway, open and 18 intermediate hinge poses', context => {
    const { room, dispose } = assemble();
    const hinge = node(room, 'TEC_MacBookScreen');
    const pivot = hinge.position.toArray();
    const authoredOpen = hinge.quaternion.clone();
    const base = vertexBounds(node(room, 'VIS_MacBookBase'));
    const desk = vertexBounds(node(room, 'FUR_Desk'));
    const clearances: number[] = [];
    try {
      for (let step = 0; step <= 20; step++) {
        hinge.quaternion.slerpQuaternions(new Quaternion(), authoredOpen, step / 20);
        room.updateMatrixWorld(true);
        const lid = vertexBounds(node(room, 'VIS_MacBookLid'));
        const clearance = lid.min.y - base.max.y;
        clearances.push(clearance);
        assert.ok(clearance >= .0008, `Hinge step ${step}: ${clearance}m clearance must exceed 0.8mm`);
        assert.ok(lid.min.y > desk.max.y);
        assert.deepEqual(hinge.position.toArray(), pivot);
        const validation = validateAssembly(room);
        assert.equal(validation.ok, true, JSON.stringify(validation.errors));
      }
      context.diagnostic(`Lid-to-keyboard Y clearance (m): closed=${clearances[0]}, half=${clearances[10]}, open=${clearances[20]}, minimum=${Math.min(...clearances)}`);
    } finally { hinge.quaternion.copy(authoredOpen); dispose(); }
  });

  it('inherits the original controller for 20 close/open cycles and restores source material/pose ownership on disposal', async () => {
    const { room, dispose } = assemble();
    const initial = snapshot(room);
    const hinge = node(room, 'TEC_MacBookScreen');
    const pivot = hinge.position.toArray();
    const open = hinge.quaternion.toArray();
    const lid = node(room, 'VIS_MacBookLid');
    const savedMaterials = new Map(meshes(room).map(mesh => [mesh, mesh.material]));
    const controller = createMechanisms(room, () => {});
    try {
      for (let cycle = 0; cycle < 20; cycle++) {
        await controller.exit('macbook', true);
        assert.deepEqual(hinge.quaternion.toArray(), [0, 0, 0, 1]);
        assert.equal(controller.snapshot().macbookState, 'closed');
        await controller.enter('macbook', true);
        assert.deepEqual(hinge.quaternion.toArray(), open);
        assert.equal(controller.snapshot().macbookState, 'open');
        assert.deepEqual(hinge.position.toArray(), pivot);
        assert.equal(lid.parent, hinge);
        assert.ok(vertexBounds(lid).min.y > vertexBounds(node(room, 'VIS_MacBookBase')).max.y);
      }
      const validation = validateAssembly(room);
      assert.equal(validation.ok, true, JSON.stringify(validation.errors));
    } finally { controller.dispose(); }
    assert.deepEqual(snapshot(room), initial);
    for (const [mesh, material] of savedMaterials) assert.equal(mesh.material, material);
    dispose();
    assert.equal(validateScene(room).ok, true);
  });

  it('activates only the independent Monitor/MacBook screens and Marshall indicator, preserving housings and persistent Power state', async () => {
    const { room, dispose } = assemble();
    const savedMaterials = new Map(meshes(room).map(mesh => [mesh, mesh.material]));
    const controller = createMechanisms(room, () => {});
    try {
      for (const [id, name] of [['monitor', 'VIS_MonitorDisplaySurface'], ['macbook', 'VIS_MacBookDisplaySurface']] as const) {
        const surfaces = meshes(node(room, name));
        await controller.enter(id, true);
        for (const [mesh, original] of savedMaterials) {
          if (surfaces.includes(mesh)) {
            assert.notEqual(mesh.material, original);
            for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) assert.equal((material as MeshStandardMaterial).emissiveIntensity, 3);
          } else assert.equal(mesh.material, original, `${mesh.name} must not light up with ${id}`);
        }
        await controller.exit(id, true);
        for (const [mesh, original] of savedMaterials) assert.equal(mesh.material, original);
      }
      const indicators = meshes(node(room, 'VIS_MarshallPowerIndicator'));
      await controller.enter('marshall', true);
      assert.equal(controller.snapshot().marshallPower, 'on');
      for (const [mesh, original] of savedMaterials) {
        if (indicators.includes(mesh)) {
          assert.notEqual(mesh.material, original);
          for (const material of Array.isArray(mesh.material) ? mesh.material : [mesh.material]) assert.equal((material as MeshStandardMaterial).emissiveIntensity, 2.4);
        } else assert.equal(mesh.material, original, `${mesh.name} is not the power indicator`);
      }
      await controller.exit('marshall', true);
      assert.equal(controller.snapshot().marshallPower, 'on', 'Power persists after Back');
      for (const mesh of indicators) assert.notEqual(mesh.material, savedMaterials.get(mesh));
      await controller.toggle('marshall', true);
      assert.equal(controller.snapshot().marshallPower, 'off');
      for (const [mesh, original] of savedMaterials) assert.equal(mesh.material, original);
      await controller.enter('marshall', true);
      assert.equal(controller.snapshot().marshallPower, 'off', 'Explicit Off persists on re-entry');
    } finally { controller.dispose(); dispose(); }
    assert.equal(validateScene(room).ok, true);
  });

  it('cancels an active production hinge tween before releasing assets and restores the untouched frozen room', async () => {
    const { room, dispose } = assemble();
    const initial = snapshot(room);
    const controller = createMechanisms(room, () => {});
    const pending = controller.enter('macbook', false);
    await new Promise(resolve => setTimeout(resolve, 30));
    assert.equal(controller.snapshot().macbookState, 'closing');
    controller.dispose();
    await pending;
    assert.deepEqual(snapshot(room), initial);
    dispose();
    assert.equal(validateScene(room).ok, true);
    const restored = snapshot(room);
    await new Promise(resolve => setTimeout(resolve, 40));
    assert.deepEqual(snapshot(room), restored, 'No late tween callback writes into the released assembly');
  });
});

/** Read actual GLB bytes without loading Blender, statistics files, or the application. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const bFamilies = ['piano', 'ipad', 'phone', 'trashcan', 'lightswitch', 'keyboard', 'mouse', 'headphones'];
const aFamilies = ['floor', 'walls', 'door', 'window', 'curtains', 'desk', 'cabinet', 'bed', 'bedside', 'sofa', 'chair', 'coffee', 'sidetable', 'beanbag', 'rugs', 'dogbed'];
const oldFamilies = ['monitor', 'macbook', 'marshall'];
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function parseArguments(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) return { help: true };
  if (args.length === 0) return { output: null };
  if (args.length === 1 && !args[0].startsWith('-')) return { output: path.resolve(args[0]) };
  if (args.length === 2 && args[0] === '--output') return { output: path.resolve(args[1]) };
  throw new Error('Usage: node scripts/assets/inspect-interactive-budgets.mjs [--output NEW_OUTPUT.json]');
}

function requireCondition(condition, message) {
  if (!condition) throw new Error(message);
}

function parseGlb(bytes, label) {
  requireCondition(bytes.length >= 20, `${label}: incomplete GLB header`);
  requireCondition(bytes.toString('ascii', 0, 4) === 'glTF', `${label}: invalid GLB magic`);
  requireCondition(bytes.readUInt32LE(4) === 2, `${label}: only glTF 2 GLB is supported`);
  requireCondition(bytes.readUInt32LE(8) === bytes.length, `${label}: declared and actual byte lengths disagree`);
  const chunks = [];
  for (let offset = 12; offset < bytes.length;) {
    requireCondition(offset + 8 <= bytes.length, `${label}: incomplete chunk header`);
    const length = bytes.readUInt32LE(offset), type = bytes.readUInt32LE(offset + 4);
    requireCondition(length % 4 === 0 && offset + 8 + length <= bytes.length, `${label}: invalid aligned chunk range`);
    chunks.push({ type, length, offset: offset + 8, bytes: bytes.subarray(offset + 8, offset + 8 + length) });
    offset += 8 + length;
  }
  requireCondition(chunks[0]?.type === 0x4e4f534a, `${label}: first chunk is not JSON`);
  requireCondition(chunks.filter(chunk => chunk.type === 0x4e4f534a).length === 1, `${label}: duplicate JSON chunks`);
  const binaryChunks = chunks.filter(chunk => chunk.type === 0x004e4942);
  requireCondition(binaryChunks.length <= 1, `${label}: duplicate BIN chunks`);
  const json = JSON.parse(chunks[0].bytes.toString('utf8'));
  requireCondition(json.asset?.version === '2.0', `${label}: invalid glTF asset version`);
  const bin = binaryChunks[0]?.bytes ?? Buffer.alloc(0);
  if (json.buffers?.[0] && !json.buffers[0].uri) {
    requireCondition(json.buffers[0].byteLength <= bin.length && bin.length - json.buffers[0].byteLength <= 3, `${label}: BIN length disagrees with buffer 0`);
  }
  return { json, bin, chunks };
}

function imageDimensions(bytes, mimeType) {
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))) {
    return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20), format: 'png' };
  }
  if (bytes.length >= 4 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    let offset = 2;
    while (offset + 4 <= bytes.length) {
      if (bytes[offset] !== 0xff) break;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (marker === 0xd9 || marker === 0xda) break;
      if (marker === 0x01 || marker >= 0xd0 && marker <= 0xd7) continue;
      if (offset + 2 > bytes.length) break;
      const length = bytes.readUInt16BE(offset);
      if (length < 2 || offset + length > bytes.length) break;
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker) && length >= 7) {
        return { width: bytes.readUInt16BE(offset + 5), height: bytes.readUInt16BE(offset + 3), format: 'jpeg' };
      }
      offset += length;
    }
  }
  if (bytes.length >= 30 && bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP') {
    const type = bytes.toString('ascii', 12, 16);
    if (type === 'VP8X') return { width: bytes.readUIntLE(24, 3) + 1, height: bytes.readUIntLE(27, 3) + 1, format: 'webp' };
    if (type === 'VP8 ' && bytes[23] === 0x9d && bytes[24] === 0x01 && bytes[25] === 0x2a) {
      return { width: bytes.readUInt16LE(26) & 0x3fff, height: bytes.readUInt16LE(28) & 0x3fff, format: 'webp' };
    }
    if (type === 'VP8L' && bytes[20] === 0x2f) {
      return { width: 1 + (bytes[21] | (bytes[22] & 0x3f) << 8), height: 1 + ((bytes[22] >> 6) | bytes[23] << 2 | (bytes[24] & 0x0f) << 10), format: 'webp' };
    }
  }
  return { width: null, height: null, format: mimeType ?? 'unknown', dimensionWarning: 'Dimensions not decoded by this byte-only PNG/JPEG/WebP inspector' };
}

function coveredBytes(ranges) {
  let total = 0, start = null, end = null;
  for (const range of [...ranges].sort((a, b) => a[0] - b[0])) {
    if (start === null) { [start, end] = range; continue; }
    if (range[0] <= end) end = Math.max(end, range[1]);
    else { total += end - start; [start, end] = range; }
  }
  return start === null ? 0 : total + end - start;
}

function primitiveTriangles(primitive, json, label) {
  const mode = primitive.mode ?? 4;
  const accessor = json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
  requireCondition(accessor && Number.isSafeInteger(accessor.count) && accessor.count >= 0, `${label}: missing/invalid primitive accessor count`);
  if (mode === 4) {
    requireCondition(accessor.count % 3 === 0, `${label}: triangle primitive has a non-triplet index/vertex count`);
    return accessor.count / 3;
  }
  if (mode === 5 || mode === 6) return Math.max(0, accessor.count - 2);
  return 0;
}

async function inspectAsset({ family, batch, file }) {
  const bytes = await fs.readFile(path.join(project, file));
  const { json, bin, chunks } = parseGlb(bytes, file);
  const uriResources = [
    ...(json.buffers ?? []).flatMap((buffer, index) => buffer.uri ? [{ kind: 'buffer', index, uri: buffer.uri }] : []),
    ...(json.images ?? []).flatMap((image, index) => image.uri ? [{ kind: 'image', index, uri: image.uri }] : []),
  ];
  const externalUris = uriResources.filter(resource => !resource.uri.startsWith('data:'));
  const embeddedRanges = [];
  const images = (json.images ?? []).map((image, index) => {
    if (image.bufferView === undefined) {
      // Report the unsupported resource instead of silently counting it as embedded BIN bytes.
      return { index, name: image.name ?? null, mimeType: image.mimeType ?? null, storage: image.uri?.startsWith('data:') ? 'data-uri-in-json' : 'external-uri', width: null, height: null, encodedBytes: null, sha256: null };
    }
    const view = json.bufferViews?.[image.bufferView];
    requireCondition(view?.buffer === 0 && Number.isSafeInteger(view.byteLength) && view.byteLength > 0, `${file}: invalid embedded image bufferView ${image.bufferView}`);
    const offset = view.byteOffset ?? 0, end = offset + view.byteLength;
    requireCondition(offset >= 0 && end <= bin.length, `${file}: embedded image leaves the BIN chunk`);
    const encoded = bin.subarray(offset, end), dimensions = imageDimensions(encoded, image.mimeType);
    embeddedRanges.push([offset, end]);
    return {
      index, name: image.name ?? null, mimeType: image.mimeType ?? null, storage: 'embedded-bin',
      bufferView: image.bufferView, binByteOffset: offset, encodedBytes: encoded.length, sha256: hash(encoded), ...dimensions,
      estimatedRGBA8Bytes: dimensions.width && dimensions.height ? dimensions.width * dimensions.height * 4 : null,
      estimatedRGBA8WithMipmapsBytes: dimensions.width && dimensions.height ? Math.round(dimensions.width * dimensions.height * 4 * 4 / 3) : null,
    };
  });
  const meshRecords = (json.meshes ?? []).map((mesh, index) => ({
    index, primitives: mesh.primitives.length,
    triangles: mesh.primitives.reduce((total, primitive) => total + primitiveTriangles(primitive, json, file), 0),
  }));
  const defaultScene = json.scenes?.[json.scene ?? 0];
  requireCondition(defaultScene && Array.isArray(defaultScene.nodes), `${file}: no default scene roots`);
  const sceneNodes = new Set();
  const visit = (index, ancestors = new Set()) => {
    requireCondition(!ancestors.has(index) && json.nodes?.[index], `${file}: invalid/cyclic scene node ${index}`);
    requireCondition(!sceneNodes.has(index), `${file}: node ${index} has multiple scene parents`);
    sceneNodes.add(index);
    const next = new Set([...ancestors, index]);
    for (const child of json.nodes[index].children ?? []) visit(child, next);
  };
  defaultScene.nodes.forEach(index => visit(index));
  const sceneMeshInstances = [...sceneNodes].flatMap(index => {
    const mesh = json.nodes[index].mesh;
    if (mesh === undefined) return [];
    requireCondition(meshRecords[mesh], `${file}: scene node references absent mesh ${mesh}`);
    return [meshRecords[mesh]];
  });
  const embeddedImageBytes = coveredBytes(embeddedRanges);
  const jsonChunk = chunks[0];
  let contentBytes = jsonChunk.length;
  while (contentBytes && jsonChunk.bytes[contentBytes - 1] === 0x20) contentBytes--;
  const byteBreakdown = {
    glbHeaderAndChunkHeadersBytes: 12 + chunks.length * 8,
    jsonChunkBytes: jsonChunk.length,
    jsonContentBytes: contentBytes,
    jsonPaddingBytes: jsonChunk.length - contentBytes,
    embeddedImageBytes,
    otherBinaryBytesIncludingPadding: bin.length - embeddedImageBytes,
    unknownChunkBytes: chunks.filter(chunk => ![0x4e4f534a, 0x004e4942].includes(chunk.type)).reduce((total, chunk) => total + chunk.length, 0),
  };
  const accountedBytes = byteBreakdown.glbHeaderAndChunkHeadersBytes + byteBreakdown.jsonChunkBytes + embeddedImageBytes + byteBreakdown.otherBinaryBytesIncludingPadding + byteBreakdown.unknownChunkBytes;
  requireCondition(accountedBytes === bytes.length, `${file}: byte accounting error`);
  const controls = {
    externalUriCount: externalUris.length,
    dataUriCount: uriResources.length - externalUris.length,
    cameras: (json.cameras ?? []).length,
    nodesWithCamera: (json.nodes ?? []).filter(node => node.camera !== undefined).length,
    punctualLights: (json.extensions?.KHR_lights_punctual?.lights ?? []).length,
    nodesWithPunctualLight: (json.nodes ?? []).filter(node => node.extensions?.KHR_lights_punctual?.light !== undefined).length,
    animations: (json.animations ?? []).length,
  };
  return {
    family, batch, file, sha256: hash(bytes), bytes: bytes.length,
    triangles: meshRecords.reduce((total, mesh) => total + mesh.triangles, 0),
    primitives: meshRecords.reduce((total, mesh) => total + mesh.primitives, 0),
    meshDefinitions: meshRecords.length,
    sceneMeshInstances: sceneMeshInstances.length,
    scenePrimitiveInstances: sceneMeshInstances.reduce((total, mesh) => total + mesh.primitives, 0),
    sceneTriangleInstances: sceneMeshInstances.reduce((total, mesh) => total + mesh.triangles, 0),
    materials: (json.materials ?? []).length,
    materialsReferencedByPrimitives: new Set((json.meshes ?? []).flatMap(mesh => mesh.primitives.flatMap(primitive => primitive.material === undefined ? [] : [primitive.material]))).size,
    nodes: (json.nodes ?? []).length, rootNodes: defaultScene.nodes.map(index => json.nodes[index].name ?? index),
    images, embeddedImageBytes, otherBytes: bytes.length - embeddedImageBytes, byteBreakdown,
    controls, externalUris, extensionsUsed: json.extensionsUsed ?? [], extensionsRequired: json.extensionsRequired ?? [],
  };
}

function totals(assets) {
  const sum = field => assets.reduce((value, asset) => value + asset[field], 0);
  return {
    files: assets.length, bytes: sum('bytes'), triangles: sum('triangles'), primitives: sum('primitives'),
    sceneTriangleInstances: sum('sceneTriangleInstances'), scenePrimitiveInstances: sum('scenePrimitiveInstances'),
    materialDefinitionsAcrossFiles: sum('materials'), imageReferences: assets.reduce((value, asset) => value + asset.images.length, 0),
    embeddedImageBytes: sum('embeddedImageBytes'), otherBytes: sum('otherBytes'),
    jsonChunkBytes: assets.reduce((value, asset) => value + asset.byteBreakdown.jsonChunkBytes, 0),
  };
}

function duplicatedImages(assets) {
  const groups = new Map();
  for (const asset of assets) for (const image of asset.images) {
    if (image.storage !== 'embedded-bin') continue;
    const group = groups.get(image.sha256) ?? { sha256: image.sha256, encodedBytes: image.encodedBytes, width: image.width, height: image.height, occurrences: [] };
    group.occurrences.push({ family: asset.family, batch: asset.batch, file: asset.file, imageIndex: image.index, bufferView: image.bufferView, binByteOffset: image.binByteOffset });
    groups.set(image.sha256, group);
  }
  const uniqueImages = [...groups.values()].map(group => {
    const distinctFiles = new Set(group.occurrences.map(value => value.file)).size;
    const physicalCopies = new Set(group.occurrences.map(value => `${value.file}:${value.binByteOffset}`)).size;
    return { ...group, distinctFiles, physicalCopies, crossGlbRepeatedEncodedBytes: (distinctFiles - 1) * group.encodedBytes, sameGlbRepeatedEncodedBytes: (physicalCopies - distinctFiles) * group.encodedBytes };
  });
  return {
    uniqueImageCount: uniqueImages.length,
    uniqueEncodedImageBytes: uniqueImages.reduce((sum, image) => sum + image.encodedBytes, 0),
    crossGlbRepeatedEncodedBytes: uniqueImages.reduce((sum, image) => sum + image.crossGlbRepeatedEncodedBytes, 0),
    sameGlbRepeatedEncodedBytes: uniqueImages.reduce((sum, image) => sum + image.sameGlbRepeatedEncodedBytes, 0),
    crossGlbDuplicateGroups: uniqueImages.filter(image => image.distinctFiles > 1), uniqueImages,
  };
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Read-only GLB inventory; requires all eight v0.6B exports.\n\nnode scripts/assets/inspect-interactive-budgets.mjs\nnode scripts/assets/inspect-interactive-budgets.mjs --output NEW_OUTPUT.json\n\nDefault: JSON on stdout. Explicit output uses exclusive creation and never overwrites an existing file. Output parent directory must already exist. No Blender, browser, dependencies, statistics file, or product files are changed.\n');
    return;
  }
  const inputs = [
    { family: 'frozen-final', batch: 'frozen', file: 'public/models/sharkys_room_blockout_FINAL.glb' },
    ...oldFamilies.map(family => ({ family, batch: 'v0.5', file: `public/models/production/${family}_pilot.glb` })),
    ...aFamilies.map(family => ({ family, batch: 'v0.6A', file: `public/models/production/${family}_v06a.glb` })),
    ...bFamilies.map(family => ({ family, batch: 'v0.6B', file: `public/models/production/${family}_v06b.glb` })),
  ];
  const missing = [];
  for (const input of inputs) {
    try { await fs.access(path.join(project, input.file)); } catch { missing.push(input.file); }
  }
  requireCondition(missing.length === 0, `Inventory is incomplete; all B families and the frozen/A/v0.5 baseline must exist. Missing:\n${missing.join('\n')}`);
  const assets = [];
  for (const input of inputs) assets.push(await inspectAsset(input));
  const bAssets = assets.filter(asset => asset.batch === 'v0.6B'), baseline = assets.filter(asset => asset.batch !== 'v0.6B');
  const checks = {
    eightBFamilies: bAssets.length === 8,
    bNoExternalUris: bAssets.every(asset => asset.controls.externalUriCount === 0),
    initialPayloadNoExternalUris: assets.every(asset => asset.controls.externalUriCount === 0),
    bNoDataUris: bAssets.every(asset => asset.controls.dataUriCount === 0),
    bNoCameras: bAssets.every(asset => asset.controls.cameras === 0 && asset.controls.nodesWithCamera === 0),
    bNoLights: bAssets.every(asset => asset.controls.punctualLights === 0 && asset.controls.nodesWithPunctualLight === 0),
    bNoAnimations: bAssets.every(asset => asset.controls.animations === 0),
    embeddedImageDimensionsRead: assets.every(asset => asset.images.every(image => image.storage !== 'embedded-bin' || image.width > 0 && image.height > 0)),
  };
  const result = {
    generatedAt: new Date().toISOString(), inspector: 'scripts/assets/inspect-interactive-budgets.mjs',
    measurement: 'Actual bytes, glTF JSON, accessors and embedded image headers from the exported GLBs; no asset-statistics.json is read.',
    checks, ok: Object.values(checks).every(Boolean),
    totals: {
      frozen: totals(assets.filter(asset => asset.batch === 'frozen')),
      v05: totals(assets.filter(asset => asset.batch === 'v0.5')),
      v06A: totals(assets.filter(asset => asset.batch === 'v0.6A')),
      v06B: totals(bAssets),
      beforeBInitialGlbPayload: totals(baseline),
      afterBInitialGlbPayload: totals(assets),
      initialGlbByteIncrease: totals(bAssets).bytes,
    },
    bAssets,
    allInitialAssets: assets,
    embeddedImageDuplication: { bOnly: duplicatedImages(bAssets), allInitialGlbs: duplicatedImages(assets) },
    interpretation: [
      'GLB bytes are uncompressed file payload bytes. They are not measured HTTP transferSize, compressed response bytes, total page bytes, bandwidth, frame time, or actual GPU memory.',
      'Cross-GLB equal image hashes remain encoded in each separate GLB response. Unique-image bytes do not reduce the measured file payload. Actual network transfer depends on HTTP compression, caching, and requests; measure it separately in the browser.',
      'Mesh-definition triangles and primitives are listed separately from default-scene mesh instances. Primitive counts are not renderer draw calls: visibility, shadows, passes, instancing and runtime assembly can change calls.',
      'The frozen FINAL scene intentionally contains its original cameras and lights. No-camera/no-light/no-animation assertions apply to the eight B visual exports; all initial assets are still reported transparently.',
      'JSON content/padding, embedded image range coverage, other BIN bytes and GLB chunk headers add up to each exact file size. Other BIN bytes include geometry and alignment padding.',
      'RGBA8 and mipmap fields are arithmetic estimates from image dimensions, not decoded browser texture counts or measured GPU allocations.',
    ],
  };
  const output = JSON.stringify(result, null, 2) + '\n';
  if (options.output) {
    // Preserve historical evidence even when the caller accidentally repeats a path.
    await fs.writeFile(options.output, output, { flag: 'wx' });
    process.stdout.write(JSON.stringify({ output: options.output, ok: result.ok, b: result.totals.v06B, initial: result.totals.afterBInitialGlbPayload }) + '\n');
  } else process.stdout.write(output);
  if (!result.ok) process.exitCode = 1;
}

main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });

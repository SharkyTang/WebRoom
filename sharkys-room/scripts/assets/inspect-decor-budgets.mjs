/** Read actual GLB bytes without loading Blender, statistics files, or the application. */
import fs from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { tsImport } from 'tsx/esm/api';

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const expectedCFamilies = ['eiffel', 'hogwarts', 'minastirith', 'falcon', 'bridge', 'sls', 'ferrari', 'mercedes', 'plants', 'cola', 'dog', 'fixtures', 'wallart'];
const requireAllC = process.env.ROOM_REQUIRE_ALL_C === '1';
const baselineExpectedInitialGlbBytes = 4662556;
const hash = bytes => createHash('sha256').update(bytes).digest('hex');

function parseArguments(args) {
  if (args.length === 1 && ['--help', '-h'].includes(args[0])) return { help: true };
  if (args.length === 0) return { output: null };
  if (args.length === 1 && !args[0].startsWith('-')) return { output: path.resolve(args[0]) };
  if (args.length === 2 && args[0] === '--output') return { output: path.resolve(args[1]) };
  throw new Error('Usage: node scripts/assets/inspect-decor-budgets.mjs [--output NEW_OUTPUT.json]');
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
    imageReferences: images.length, textureDefinitions: (json.textures ?? []).length, samplers: (json.samplers ?? []).length,
    images, embeddedImageBytes, otherBytes: bytes.length - embeddedImageBytes, byteBreakdown,
    controls, externalUris, extensionsUsed: json.extensionsUsed ?? [], extensionsRequired: json.extensionsRequired ?? [],
  };
}

function totals(assets) {
  const sum = field => assets.reduce((value, asset) => value + asset[field], 0);
  return {
    files: assets.length, bytes: sum('bytes'), triangles: sum('triangles'), meshDefinitions: sum('meshDefinitions'), primitives: sum('primitives'),
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


function publicFile(url) {
  requireCondition(typeof url === 'string' && url.startsWith('/models/') && url.endsWith('.glb') && !url.includes('..') && !url.includes('?') && !url.includes('#'), `Unsafe or unsupported manifest model URL: ${url}`);
  return `public${url}`;
}

async function sourcePngs(family) {
  const sourceRoot = path.join(project, 'assets-source/v06c', family);
  const result = [];
  async function visit(directory) {
    let entries;
    try { entries = await fs.readdir(directory, { withFileTypes: true }); }
    catch (error) { if (error.code === 'ENOENT') return; throw error; }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await visit(file);
      else if (entry.isFile() && /\.png$/i.test(entry.name)) {
        const bytes = await fs.readFile(file), dimensions = imageDimensions(bytes, 'image/png');
        requireCondition(dimensions.format === 'png' && dimensions.width > 0 && dimensions.height > 0, `Invalid source PNG: ${file}`);
        result.push({ file: path.relative(project, file), bytes: bytes.length, sha256: hash(bytes), ...dimensions });
      }
    }
  }
  await visit(sourceRoot);
  return result;
}

function familyDuplicateImageBytes(asset, allAssets) {
  const physical = new Map();
  for (const image of asset.images.filter(image => image.storage === 'embedded-bin')) physical.set(image.binByteOffset, image);
  const ownHashes = new Set();
  let withinFamilyBytes = 0, matchingOtherGlbsBytes = 0;
  for (const image of physical.values()) {
    if (ownHashes.has(image.sha256)) withinFamilyBytes += image.encodedBytes;
    ownHashes.add(image.sha256);
    if (allAssets.some(other => other.file !== asset.file && other.images.some(value => value.sha256 === image.sha256))) matchingOtherGlbsBytes += image.encodedBytes;
  }
  return { withinFamilyBytes, matchingOtherGlbsBytes };
}

function cIncrementalDuplicateImageBytes(baseline, cAssets) {
  const seen = new Set(baseline.flatMap(asset => asset.images.flatMap(image => image.sha256 ? [image.sha256] : [])));
  let bytes = 0;
  for (const asset of cAssets) {
    const physical = new Map(asset.images.filter(image => image.storage === 'embedded-bin').map(image => [image.binByteOffset, image]));
    for (const image of physical.values()) {
      if (seen.has(image.sha256)) bytes += image.encodedBytes;
      seen.add(image.sha256);
    }
  }
  return bytes;
}

async function main() {
  const options = parseArguments(process.argv.slice(2));
  if (options.help) {
    process.stdout.write('Read-only C asset and full initial GLB inventory, using the actual manifest and pre-C snapshot.\n\nnode scripts/assets/inspect-decor-budgets.mjs\nnode scripts/assets/inspect-decor-budgets.mjs --output NEW_OUTPUT.json\nROOM_REQUIRE_ALL_C=1 node scripts/assets/inspect-decor-budgets.mjs --output FINAL_OUTPUT.json\n\nStage mode accepts the C subset currently registered; final mode requires all 13 planned families. Every registered GLB must exist. Output uses exclusive creation (wx); parent directory must exist. No Blender, browser, dependency, source, model or historical evidence is modified.\n');
    return;
  }
  const manifestFile = path.join(project, 'lib/room/assets/assetManifest.ts');
  const manifestBefore = await fs.readFile(manifestFile);
  const { assetManifest } = await tsImport('../../lib/room/assets/assetManifest.ts', import.meta.url);
  requireCondition(hash(manifestBefore) === hash(await fs.readFile(manifestFile)), 'The asset manifest changed during inspection; rerun against a stable stage.');
  const snapshotRecordPath = path.join(project, 'validation/v06c/snapshot.json');
  const snapshot = JSON.parse(await fs.readFile(snapshotRecordPath, 'utf8'));
  const snapshotManifestPath = path.join(snapshot.snapshotDirectory, 'manifest.json');
  const snapshotBytes = await fs.readFile(snapshotManifestPath), snapshotManifest = JSON.parse(snapshotBytes);
  const projectPrefix = `${path.relative(snapshotManifest.root, project).split(path.sep).join('/')}/`;
  requireCondition(!projectPrefix.startsWith('../'), 'Current project is outside the recorded snapshot workspace.');
  const snapshotProduction = Object.entries(snapshotManifest.files).filter(([file]) => file.startsWith(`${projectPrefix}public/models/production/`) && /_(?:pilot|v06a|v06b)\.glb$/.test(file));
  requireCondition(snapshotProduction.length === 27, `Pre-C snapshot must contain the 27 delivered formal models; found ${snapshotProduction.length}.`);
  const registered = Object.entries(assetManifest).map(([family, definition]) => ({ family, file: publicFile(definition.url), url: definition.url }));
  requireCondition(new Set(registered.map(asset => asset.file)).size === registered.length, 'Different families reuse one model URL; report family ownership explicitly before inventory.');
  const oldFiles = new Set(snapshotProduction.map(([file]) => file.slice(projectPrefix.length)));
  const unknownFamilies = registered.filter(asset => !oldFiles.has(asset.file) && !expectedCFamilies.includes(asset.family));
  requireCondition(unknownFamilies.length === 0, `Unexpected new families: ${unknownFamilies.map(asset => asset.family).join(', ')}`);
  const registeredC = registered.filter(asset => !oldFiles.has(asset.file));
  requireCondition(registeredC.every(asset => /_v06c\.glb$/.test(asset.file)), 'Each C family must point at its actual _v06c.glb export.');
  const missingCFamilies = expectedCFamilies.filter(family => !registeredC.some(asset => asset.family === family));
  const frozenFile = 'public/models/sharkys_room_blockout_FINAL.glb';
  const inputs = [
    { family: 'frozen-final', batch: 'frozen', file: frozenFile },
    ...registered.map(asset => ({ ...asset, batch: oldFiles.has(asset.file) ? (asset.file.endsWith('_pilot.glb') ? 'v0.5' : asset.file.endsWith('_v06a.glb') ? 'v0.6A' : 'v0.6B') : 'v0.6C' })),
  ];
  const missingFiles = [];
  for (const input of inputs) {
    try { await fs.access(path.join(project, input.file)); } catch { missingFiles.push(input.file); }
  }
  requireCondition(missingFiles.length === 0, `Registered GLBs are missing:\n${missingFiles.join('\n')}`);
  const assets = [];
  for (const input of inputs) assets.push(await inspectAsset(input));
  const cAssets = assets.filter(asset => asset.batch === 'v0.6C'), baseline = assets.filter(asset => asset.batch !== 'v0.6C');
  for (const asset of cAssets) {
    const blendFile = `blender-assets/${asset.family}_v06c.blend`;
    try {
      const blendBytes = await fs.readFile(path.join(project, blendFile));
      asset.editableSource = { file: blendFile, bytes: blendBytes.length, sha256: hash(blendBytes), present: true };
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
      asset.editableSource = { file: blendFile, bytes: null, sha256: null, present: false };
    }
    asset.sourcePngs = await sourcePngs(asset.family);
    asset.sourcePngCount = asset.sourcePngs.length;
    asset.sourcePngBytes = asset.sourcePngs.reduce((sum, image) => sum + image.bytes, 0);
    asset.embeddedPngCount = asset.images.filter(image => image.format === 'png').length;
    asset.embeddedPngBytes = asset.images.filter(image => image.format === 'png').reduce((sum, image) => sum + image.encodedBytes, 0);
    asset.embeddedImageDuplication = familyDuplicateImageBytes(asset, assets);
  }
  const baselineInputs = [[`${projectPrefix}${frozenFile}`, snapshotManifest.files[`${projectPrefix}${frozenFile}`]], ...snapshotProduction];
  const protectedBaseline = baselineInputs.map(([snapshotFile, previous]) => {
    requireCondition(previous, `Snapshot omits protected asset ${snapshotFile}`);
    const file = snapshotFile.slice(projectPrefix.length), current = assets.find(asset => asset.file === file);
    const expectedFamily = file === frozenFile ? 'frozen-final' : path.basename(file).replace(/_(?:pilot|v06a|v06b)\.glb$/, '');
    return { file, expectedFamily, familyIdentityUnchanged: current?.family === expectedFamily, family: current?.family ?? null, registered: Boolean(current), snapshotSha256: previous.sha256, currentSha256: current?.sha256 ?? null, snapshotBytes: previous.bytes, currentBytes: current?.bytes ?? null, unchanged: Boolean(current && current.sha256 === previous.sha256 && current.bytes === previous.bytes) };
  });
  const snapshotInitialGlbBytes = baselineInputs.reduce((sum, [, input]) => sum + input.bytes, 0);
  const checks = {
    stageOrAllThirteenCFamilies: !requireAllC || missingCFamilies.length === 0,
    originalTwentySevenFamiliesRemainRegistered: snapshotProduction.every(([file]) => registered.some(asset => asset.file === file.slice(projectPrefix.length))),
    originalTwentySevenAndFinalGlbHashesUnchanged: protectedBaseline.every(asset => asset.unchanged),
    originalFamilyIdentitiesUnchanged: protectedBaseline.every(asset => asset.familyIdentityUnchanged),
    cEditableSourcesPresent: cAssets.every(asset => asset.editableSource.present),
    snapshotInitialGlbBytesMatchCompletedB: snapshotInitialGlbBytes === baselineExpectedInitialGlbBytes,
    actualBeforeCInitialGlbBytesMatchSnapshot: totals(baseline).bytes === snapshotInitialGlbBytes,
    cNoExternalUris: cAssets.every(asset => asset.controls.externalUriCount === 0),
    initialPayloadNoExternalUris: assets.every(asset => asset.controls.externalUriCount === 0),
    cNoDataUris: cAssets.every(asset => asset.controls.dataUriCount === 0),
    cNoCameras: cAssets.every(asset => asset.controls.cameras === 0 && asset.controls.nodesWithCamera === 0),
    cNoLights: cAssets.every(asset => asset.controls.punctualLights === 0 && asset.controls.nodesWithPunctualLight === 0),
    cNoAnimations: cAssets.every(asset => asset.controls.animations === 0),
    embeddedImageDimensionsRead: assets.every(asset => asset.images.every(image => image.storage !== 'embedded-bin' || image.width > 0 && image.height > 0)),
    manifestStableForDuration: hash(manifestBefore) === hash(await fs.readFile(manifestFile)),
  };
  const result = {
    generatedAt: new Date().toISOString(), inspector: 'scripts/assets/inspect-decor-budgets.mjs',
    mode: requireAllC ? 'final-all-c-required' : 'registered-stage-subset', expectedCFamilies, registeredCFamilies: cAssets.map(asset => asset.family), missingCFamilies,
    measurement: 'Actual GLB bytes, JSON, accessors, default scene instances, embedded image headers and source PNG bytes; asset-statistics.json is not read. Installed visibility, draw calls and network costs require independent browser evidence.',
    baseline: { snapshotRecord: path.relative(project, snapshotRecordPath), snapshotDirectory: snapshot.snapshotDirectory, snapshotManifestSha256: hash(snapshotBytes), snapshotCreatedAt: snapshotManifest.createdAt, manifestSha256: hash(manifestBefore), expectedCompletedBInitialGlbBytes: baselineExpectedInitialGlbBytes, snapshotInitialGlbBytes },
    checks, ok: Object.values(checks).every(Boolean),
    totals: {
      frozen: totals(assets.filter(asset => asset.batch === 'frozen')),
      v05: totals(assets.filter(asset => asset.batch === 'v0.5')),
      v06A: totals(assets.filter(asset => asset.batch === 'v0.6A')),
      v06B: totals(assets.filter(asset => asset.batch === 'v0.6B')),
      v06C: totals(cAssets),
      beforeCInitialGlbPayload: totals(baseline), afterCInitialGlbPayload: totals(assets),
      initialGlbByteIncrease: totals(cAssets).bytes,
      initialGlbByteIncreasePercent: totals(cAssets).bytes / snapshotInitialGlbBytes * 100,
      cSourcePngBytesNotAdditionalWhenEmbeddedInGlb: cAssets.reduce((sum, asset) => sum + asset.sourcePngBytes, 0),
    },
    protectedBaseline, cAssets, allInitialAssets: assets,
    embeddedImageDuplication: { cOnly: duplicatedImages(cAssets), allInitialGlbs: duplicatedImages(assets), cIncrementalRepeatedEncodedBytesAgainstEarlierPayload: cIncrementalDuplicateImageBytes(baseline, cAssets) },
    interpretation: [
      'Stage mode inventories only C families actually registered in the current manifest, and never claims all C is complete. ROOM_REQUIRE_ALL_C=1 requires all 13 planned families; an absent required family makes ok=false and exits 1.',
      'The pre-C snapshot, not Git HEAD or an old audit, is the protection basis for the original 27 formal GLBs and frozen FINAL. Protected web sources and editable originals have a separate protected-inputs-baseline.json.',
      'GLB bytes are uncompressed file payload bytes. They are not HTTP transferSize, compressed response bytes, whole-page bytes, bandwidth, frame time, or GPU memory.',
      'The initial GLB payload sums each unique URL currently registered plus FINAL. No external buffer/image URI is accepted as an uncounted payload.',
      'Matching image hashes in different GLBs remain encoded in each response. Per-family matchingOtherGlbsBytes counts that family bytes whose content appears elsewhere; it is not additive across families. Global duplication fields count surplus physical copies once.',
      'Source PNG bytes describe editable input files, not an additional initial request when the same image is embedded in a GLB. Image dimensions, encoded PNG bytes, JSON/padding and remaining binary bytes are reported separately.',
      'Mesh-definition triangles/primitives are separate from default-scene mesh instances. Primitive counts are not renderer draw calls; visibility, shadows, passes and runtime assembly affect actual calls.',
      'Frozen FINAL retains its original cameras/lights. C visual exports must have no cameras, light sources or animation; named future emission surfaces do not authorize a new light system.',
      'RGBA8/mipmap estimates are arithmetic from image dimensions, not decoded browser texture counts or measured GPU memory.',
    ],
  };
  const output = JSON.stringify(result, null, 2) + '\n';
  if (options.output) {
    await fs.writeFile(options.output, output, { flag: 'wx' });
    process.stdout.write(JSON.stringify({ output: options.output, ok: result.ok, mode: result.mode, c: result.totals.v06C, initial: result.totals.afterCInitialGlbPayload }) + '\n');
  } else process.stdout.write(output);
  if (!result.ok) process.exitCode = 1;
}

main().catch(error => { process.stderr.write(`${error.message}\n`); process.exitCode = 1; });

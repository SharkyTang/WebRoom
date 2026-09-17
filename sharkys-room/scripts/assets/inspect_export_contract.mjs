/** Reproduce source bounds and actual exported screen UV/orientation evidence. */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { Box3, Matrix4, Quaternion, Vector3 } from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
async function load(relative) {
  const bytes = await fs.readFile(path.join(project, relative));
  return new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
}
async function write(relative, value) {
  await fs.writeFile(path.join(project, relative), JSON.stringify(value, null, 2) + "\n");
}

const sourcePath = "public/models/sharkys_room_blockout_FINAL.glb";
const source = await load(sourcePath);
source.scene.updateMatrixWorld(true);
const measurements = {
  source: sourcePath,
  sourceSHA256: createHash("sha256").update(await fs.readFile(path.join(project, sourcePath))).digest("hex"),
  coordinateSystem: "glTF Y-up, metres",
  anchors: {},
};
for (const name of ["TEC_MonitorBody", "TEC_MonitorScreen", "TEC_MacBookBase", "TEC_MacBookScreen", "TEC_Marshall"]) {
  const anchor = source.scene.getObjectByName(name);
  if (!anchor) throw new Error(`Missing source anchor ${name}`);
  const inverse = anchor.matrixWorld.clone().invert();
  const bounds = new Box3();
  anchor.traverse((child) => {
    if (!child.isMesh) return;
    child.geometry.computeBoundingBox();
    bounds.union(child.geometry.boundingBox.clone().applyMatrix4(new Matrix4().multiplyMatrices(inverse, child.matrixWorld)));
  });
  measurements.anchors[name] = {
    parent: anchor.parent.name,
    position: anchor.position.toArray(),
    quaternion: anchor.quaternion.toArray(),
    scale: anchor.scale.toArray(),
    localBox: { min: bounds.min.toArray(), max: bounds.max.toArray(), size: bounds.getSize(new Vector3()).toArray() },
  };
}
await write("assets-source/source-anchor-measurements.json", measurements);

for (const [family, name] of [["monitor", "VIS_MonitorDisplaySurface"], ["macbook", "VIS_MacBookDisplaySurface"]]) {
  const gltf = await load(`public/models/production/${family}_pilot.glb`);
  const surface = gltf.scene.getObjectByName(name);
  if (!surface?.isMesh) throw new Error(`Missing display ${name}`);
  const { position, normal, uv } = surface.geometry.attributes;
  const opened = new Quaternion().setFromAxisAngle(new Vector3(1, 0, 0), -105 * Math.PI / 180);
  const samples = Array.from({ length: position.count }, (_, index) => {
    const point = new Vector3().fromBufferAttribute(position, index);
    return {
      position: point.toArray(),
      ...(family === "macbook" ? { openPosition: point.clone().applyQuaternion(opened).toArray() } : {}),
      uv: [uv.getX(index), uv.getY(index)],
      normal: [normal.getX(index), normal.getY(index), normal.getZ(index)],
    };
  });
  const pointField = family === "macbook" ? "openPosition" : "position";
  const top = samples.reduce((a, b) => a[pointField][1] > b[pointField][1] ? a : b);
  const bottom = samples.reduce((a, b) => a[pointField][1] < b[pointField][1] ? a : b);
  if (top.uv[1] > 0.001 || bottom.uv[1] < 0.999) throw new Error(`${name}: exported UV does not face upright in the active view`);
  await write(`assets-source/${family}/screen-uv-contract.json`, {
    node: name,
    textureFlipY: false,
    gltfU: "left 0, right 1",
    gltfV: family === "monitor" ? "top +Y = 0, bottom -Y = 1" : "opened top = local front +Z = 0; opened bottom = hinge -Z = 1",
    ...(family === "macbook" ? { openQuaternion: opened.toArray(), openTopUV: top.uv, openBottomUV: bottom.uv, openVerticalDirectionChecked: true } : { topUV: top.uv, bottomUV: bottom.uv, verticalDirectionChecked: true }),
    samples,
  });
  console.log(`${name}: upright UV, top V=${top.uv[1]}, bottom V=${bottom.uv[1]}`);
}
console.log("Frozen source measurements and exported screen UV evidence updated.");

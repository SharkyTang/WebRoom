# Monitor · v0.5 asset specification

This is an original **stylized approximation**, not an identified commercial model or a claim of real product measurements. The reference is the warm, softly rounded desktop monitor in `../../../Sharkys_Room_Blockout_Pack/room_master_reference.jpeg`; `../../../blockout_FINAL/hero_FINAL.png` supplies scene context. Neither reference image is copied into a product texture or distributed with the GLB.

## Frozen dimensions and assembly

All dimensions below are metres in the existing **glTF Y-up anchor-local frame**. The source measurements are recorded in `../source-anchor-measurements.json`, from the actual unmodified FINAL GLB.

| Root | Existing parent anchor | Original local min | Original local max |
|---|---|---|---|
| `VIS_MonitorBody` | `TEC_MonitorBody` | `[-0.58,-0.46,-0.095]` | `[0.58,0.31,0.145]` |
| `VIS_MonitorDisplaySurface` | `TEC_MonitorScreen` | `[-0.5525,-0.28,-0.004]` | `[0.5525,0.28,0.004]` |

Both exported roots have identity TRS. Attach them to their respective anchors without a correction rotation, translation, or scale. The body anchor is `[-0.42,1.20,-2.12]`; the independent screen anchor is 0.036 m forward at `[-0.42,1.20,-2.084]`. The original head envelope is 1.16 × 0.62 m, while the body also includes the existing stand and foot. The foot remains at room Y=0.740 m. The complete body bounds match the original proxy; the new screen is 1.102 × 0.556 m at its anchor-local Z=0.002 m, within the original screen bounds.

Front is +Z; screen up is +Y. Shell, front bezel and lower chin overlap structurally. The screen sits 1.5–2 mm forward of the front edge so its texture does not z-fight. No neighbouring object, camera, target or anchor has moved.

## Authored form, topology and UV

- Rounded back housing, narrow bezel, lower chin, satin stand column and rounded foot; a rear cable recess and joined ventilation strips add visible depth.
- Cubes and cylinders are dimensioned in the anchor frame, then receive applied 2–5 segment bevels and weighted normals. The display is a triangulated rounded plane with explicit UV coordinates and normal +Z.
- Housing, stand and recess details are merged per material. All four meshes have UVs. Solid-color housing uses the primitive UV islands; no texture depends on those islands having unique packing.
- Display material: `MAT_Monitor_Display`, white base color, metallic 0, roughness 0.34, single-sided. It is separate from all housing materials.
- Exported display UV has left U=0, right U=1, top (+Y) V=0, bottom (-Y) V=1. Runtime `CanvasTexture.flipY=false` is required. See `screen-uv-contract.json` for actual GLTFLoader-read samples and normals.
- Other materials: charcoal polymer (metallic .12 / roughness .35), satin graphite stand (.72 / .30), dark recesses (.05 / .62). Standard Principled BSDF only; no Blender-only effect is needed by the Web model.

## Source, export and validation

Author: Codex, created for this project. Geometry is original procedural modeling; no third-party mesh, logo, font, bitmap or product artwork is included. External asset license: not applicable. The unlicensed reference images are visual references only.

Editable source: `../../blender-assets/monitor_pilot.blend`. Runtime delivery: `../../public/models/production/monitor_pilot.glb`. Reproduce from project root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/assets/build_production_assets.py -- monitor
```

Blender 5.2.1 LTS, metres, standard glTF 2.0 GLB export with Y-up enabled, normals/UVs/materials/extras included, no animation/camera/light and no geometry compression. Authoring converts each Y-up vertex `(x,y,z)` to Blender `(x,-z,y)` once; the exporter reverses it once. The source FINAL assets are only read for provenance and are never overwritten.

Fresh Blender GLB import verified root identities/names, triangle count, UV presence and bounds within 1 micrometre. Actual runtime display decoding and clicks are covered by the Web acceptance, rather than assumed from this source check.

Final exported statistics: **3,348 triangles, 4 mesh primitives, 4 materials, 0 image textures, 95,904 GLB bytes**. A primitive count is not a measured renderer draw-call count. Exact byte counts, hash, bounds and roundtrip assertions are in `asset-statistics.json`.

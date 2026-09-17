# MacBook · v0.5 asset specification

This is an original **stylized approximation** of the laptop role in the reference, not a precise Apple model. Product logos and external product textures are intentionally absent. `../../../Sharkys_Room_Blockout_Pack/room_master_reference.jpeg` supplies style; `../../../blockout_FINAL/hero_FINAL.png` and the actual frozen GLB supply placement and proportion.

## Frozen anchors and closed-pose contract

All values below are metres in **glTF Y-up, anchor-local coordinates**. Exact source records are in `../source-anchor-measurements.json`.

| Root | Existing parent anchor | Original local min | Original local max | New local min / max |
|---|---|---|---|---|
| `VIS_MacBookBase` | `TEC_MacBookBase` | `[-.17,-.014,-.1175]` | `[.17,.014,.1175]` | same envelope |
| `VIS_MacBookLid` | `TEC_MacBookScreen` | `[-.17,-.0025,0]` | `[.17,.025,.224]` | `[-.17,-.0015,0]` / `[.17,.013,.224]` |

The base anchor remains `[-1.5,.757,-1.86]`. The rear-edge hinge remains `[-1.5,.776,-1.9775]`, with **closed quaternion identity** and the original **open X=-105 degrees** (quaternion approximately `[-.7933533788,0,0,.6087614298]`). Both export roots have identity TRS. The lid geometry extends forward along +Z in its CLOSED definition. There is no baked opening rotation and no required local adaptation matrix.

Attach the full `VIS_MacBookLid` tree to the original `TEC_MacBookScreen`; its housing, bezel, display and camera then inherit exactly one hinge rotation. Never animate a separate lid or rotate the GLB globally. In closed pose the display's lowest point is world Y=.7745 m; the base/keys are at most Y=.771 m, leaving 3.5 mm clearance. Beveled rear-edge housing and the shallow lid keep clearance throughout the original 0 to -105 degree motion. Geometry tests must check the actual vertices at closed, half-open and fully open, not just bounds of the open pose.

## Modeling and material contract

- Authored rounded aluminum chassis, thin top deck, hinge barrel, keyboard well, 61 beveled shared-material keycaps, separate trackpad, side-port recesses, four feet, thin rounded upper housing, black glass bezel and a tiny non-emissive camera lens.
- Bevels use 2–5 segments. Planar machined surfaces have weighted normals. Keys, ports and feet share a joined mesh/material; the hinge and machined deck share another. No internal hardware is modeled.
- Required upper nodes are `VIS_MacBookLidHousing` and `VIS_MacBookDisplaySurface`. The latter is one white `MAT_MacBook_Display` PBR material (metallic 0, roughness .34), completely separate from metal and black bezel.
- All nine meshes have UVs. Primitive UV islands are retained for the solid-color surfaces. The rounded display plane has authored UVs and is single-sided with CLOSED normal -Y.
- **Read-back verified orientation:** closed +Z becomes the upper edge when the parent rotates -105 degrees. Exported glTF V=0 is therefore the +Z far edge; V=1 is the -Z hinge edge. U=0 is left and U=1 right. Use runtime `CanvasTexture.flipY=false`. `screen-uv-contract.json` stores transformed opened vertices: the highest display point has V=0 and the lowest has V=1.
- Satin aluminum uses metallic .80 / roughness .30; machined edge .82 / .23; graphite keys .12 / .54; black bezel .05 / .27; trackpad .63 / .40. No baked About/Education text and no image textures are included.

## Editable source, reproducibility and provenance

Author: Codex for this project. All geometry was procedurally authored from primitives and original dimensional choices constrained by the frozen proxies. No third-party meshes, product decals or brand logos. External asset license: not applicable. Reference images are not textures and are not copied into delivery resources.

Source: `../../blender-assets/macbook_pilot.blend`. Delivery: `../../public/models/production/macbook_pilot.glb`. Reproduce:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/assets/build_production_assets.py -- macbook
```

Blender 5.2.1 LTS uses standard GLB Y-up export with applied geometry, UVs, normals, PBR and metadata. No compression, animation, light, camera or extra global rotation. Coordinates are converted only once in each direction. Fresh Blender GLB import checks root identities, names, UV coverage, triangle count and bounds; the runtime geometry tests separately verify motion and raycasts.

Final statistics: **14,780 triangles, 9 mesh primitives, 6 shared materials, 0 image textures, 445,776 GLB bytes**. Keys account for much of the topology but one shared draw primitive, avoiding a draw call per key. Exact hash, per-root bounds and roundtrip assertions are in `asset-statistics.json`. Browser draw calls and contact/clearance are reported by the Web validation, not inferred from this count.

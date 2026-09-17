# Marshall · v0.5 asset specification

This is an original **stylized approximation** of a compact warm-toned tabletop speaker. The semantic name remains Marshall for existing interaction compatibility; no trademark wordmark, downloaded product mesh or branded image is included. The room concept and frozen Hero image are shape/style references only, not redistributed textures.

## Dimensions, placement and binding

Source `TEC_Marshall` remains at world ` [.39,.885,-2.06]`, identity rotation and scale. Actual original local bounds are min `[-.18,-.145,-.095]`, max `[.18,.145,.095]` metres. See `../source-anchor-measurements.json`.

Export root `VIS_MarshallBody` has identity TRS, glTF Y-up metre units. Attach directly under `TEC_Marshall`; no offset or adaptation is needed. The new cabinet, controls and feet remain inside the source envelope: X±.18, Y±.145, Z approximately ±.0945. Bottom feet touch Y=.740 m in the room. Front is +Z, controls are on +Y. The original anchor, target, desktop and nearby piano route remain unchanged.

Required bindings:

- `VIS_MarshallGrille` → `MAT_Marshall_WovenGrille`, single-sided front +Z, **required embedded base-color map**.
- `VIS_MarshallPowerIndicator` → `MAT_Marshall_PowerIndicator`, independent small warm indicator on the top control panel at approximately local `[-.111,.134,-.033]`. Runtime changes only this material for power feedback. Do not brighten the cabinet or grille.
- Other surfaces: `VIS_MarshallCabinet`, `VIS_MarshallBrassTrimAndDials`, `VIS_MarshallControlAndFeet`.

## Form, UV, materials and source texture

The asset has an original beveled cabinet, slim brass front piping, inset woven grille, top control plate, three brass dials with dark inset tops and fine ticks, independent power indicator and rubber feet. The grille is a rounded UV plane with a woven color texture, not individual modeled holes. All five meshes have UVs. Control and trim geometry are merged by material, so no knob gets a unique material.

Standard metallic/roughness PBR only: warm charcoal cabinet metallic .04 / roughness .68; brass .74 / .34; rubber .02 / .62; cloth 0 / .93; indicator .08 / .35. The indicator exports emission color with strength 0; runtime state controls its active feedback.

| Texture | Type / color space | Dimensions | PNG bytes | Sharing / ownership |
|---|---|---|---|---|
| `woven_grille_basecolor_512.png` | Base color, sRGB | 512×512 RGBA | 430,084 | One image embedded once in GLB, one grille material |

The texture is original deterministic mathematical warp/weft shading plus seeded fine noise (`numpy` seed 5041). The texture is authored by Codex for this project; there is no external source, license, logo or copied reference-image pixel. Source PNG is retained here for editing, and packed inside the `.blend`; the Web downloads only the GLB. No normal/roughness data image is mislabelled as sRGB, since those parameters are scalar values.

Estimated decoded GPU texture memory: 512×512×4 = **1,048,576 bytes** (1 MiB), approximately **1,398,101 bytes** with a complete mip chain, excluding alignment/driver overhead. This is an estimate, not a GPU profiler measurement. Compressed PNG network bytes are not GPU texture memory.

## Export and validation

Editable source: `../../blender-assets/marshall_pilot.blend`. Delivery: `../../public/models/production/marshall_pilot.glb`. Reproduce from project root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --python-exit-code 1 --python scripts/assets/build_production_assets.py -- marshall
```

Blender 5.2.1 LTS; metric scene; standard glTF GLB Y-up export; applied bevel geometry, weighted normals, UVs and PBR; one embedded PNG; no compression dependency, camera, light or animation. Vertex authoring maps Web `(x,y,z)` to Blender `(x,-z,y)` once and the exporter reverses that conversion once. All roots are identity.

Fresh Blender import checks mesh and triangle counts, UV presence, root identity/names and local bounds. Actual browser map decode, power persistence and clicks are covered separately by the Web validation. A successful fallback is not a successful formal-model load.

Final statistics: **4,464 triangles, 5 mesh primitives, 5 materials, 1 embedded image, 577,608 GLB bytes**. Exact hash and roundtrip assertions are in `asset-statistics.json`. The total three-asset payload is 1,119,288 bytes and 22,592 triangles; 18 primitives is a structural count, not a measured draw-call result.

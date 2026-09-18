# Floor — v0.6A

Original staggered oak floor and cutaway plinth, a stylized approximation based on the room concept and exact frozen footprint. The model does not add furniture or change the room outline. Reference images remain visual references only.

Root `VIS_Floor` attaches directly to `ENV_Floor`, identity TRS, Web/glTF Y-up metre coordinates. Its exact envelope is `[-3.69,-.12,-2.99]` to `[3.69,0,2.99]`. The top contact plane remains Y=0. The five original XZ outline vertices are `(-3.69,2.99),(1.61,2.99),(3.69,.91),(3.69,-2.99),(-3.69,-2.99)`; the cutaway corner remains on `x+z=4.60`.

The authored model separates a dark plinth edge, recessed joint substrate, and actual staggered planks in 34 rows. Boards are clipped to the frozen polygon, have narrow recessed joins and a 0.6 mm eased edge. Individual modeled boards are joined into `VIS_FloorOakPlanks` to retain one wood primitive. This is actual plank topology plus UV grain, not a single recolored room slab. No plank is raised above Y=0, and no trim projects past the frozen cutaway.

Physical planar UVs run grain along the plank length; row/board offsets prevent identical aligned grain across every join. Three standard PBR materials: oak (metallic 0, roughness .50), dark warm platform edge (0/.55), recessed joins (0/.84). `VIS_FloorOakPlanks` has one embedded shared 512×512 RGB sRGB oak color PNG, 49,211 bytes. The edge and join surfaces use scalar PBR colors. There are no lights, baked shadows or complex procedural nodes in the GLB.

The shared source `assets-source/v06a/shared/warm_oak_basecolor_512.png` is original deterministic mathematical grain/pores by Codex for this project, with no reference-image pixels or external material. It is packed into the .blend and embedded in this GLB. Each GLB copy is counted independently in network/GPU estimates; the shared source path is not a global runtime cache. Estimated decoded RGBA8 memory is 1 MiB per image, approximately 1.333 MiB with mipmaps, excluding driver overhead.

Editable source `blender-assets/floor_v06a.blend`; Web model `public/models/production/floor_v06a.glb`. Reproduce from project root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python scripts/assets/build_architecture_assets.py -- floor
```

Blender 5.2.1 LTS, standard GLB Y-up, applied normals/UV/PBR geometry, extras on root; no scene lights/cameras/animation or compression. Coordinate conversion is once each way. Fresh Blender GLB import verifies counts, UV presence, identity roots and bounds within 1 micrometre.

Export: **8,712 triangles, 3 primitives, 3 materials, 1 embedded image, 563,360 GLB bytes**. Exact file hash, envelope and roundtrip checks are in `asset-statistics.json`. Actual Web visual, support/raycast and draw-call/frame-time checks are a separate batch gate, and no user aesthetic approval is inferred from the model tests.

Independent exported-byte audit: run `node scripts/assets/inspect_architecture_export.mjs`; see `assets-source/v06a/architecture-export-audit.json` for source envelopes, closed edges, outward normals, positive volume and per-solid subset checks. All architecture materials explicitly use backface culling.

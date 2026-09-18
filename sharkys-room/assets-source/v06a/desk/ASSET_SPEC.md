# Desk — v0.6A

Original warm wood desk, a stylized approximation constrained by the frozen source. No real manufacturer or exact product model is claimed. Concept reference: `../../../../Sharkys_Room_Blockout_Pack/room_master_reference.jpeg`; composition reference: `../../../../blockout_FINAL/hero_FINAL.png`. Neither image is copied into the material.

`VIS_Desk` attaches to `FUR_Desk` with identity TRS, Web/glTF Y-up metre coordinates, no correction matrix. Original anchor is approximately `[-.65,0,-1.95]`. Exact local envelope remains `[-1.4,0,-.41]` to `[1.4,.74,.41]`. Desktop top is Y=.740; lower surface is Y=.670. The original four solid boxes are read from `validation/v06a/planning/blender-solid-components.json`, which was measured from the untouched FINAL .blend.

Four identity component groups remain addressable: `VIS_DeskSolid_0_Top`, `VIS_DeskSolid_1_LeftPedestal`, `VIS_DeskSolid_2_RightPedestal`, `VIS_DeskSolid_3_RearBrace`. Their exported extras contain `sourceComponentIndex`, `sourceMin`, `sourceMax`. All subgeometry remains inside the corresponding source box. The actual top-to-piano reference gap is 15.99993 mm; runtime sampling still has to validate all rail states. Overall desk AABB intersection must not be treated as a filled desk cavity.

The editable model has an eased wood top, separate side/back carcass panels, three inset drawer fronts per side, real reveals, flush metal pulls and recessed toe plinths. Pulls remain inside the original pedestal volume. It is not the original desk mesh recolored. Wood pieces and handles merge only within their original solid group, keeping collision ownership inspectable. Top is marked `v06a_support=true`.

UVs are explicit planar metric projections along the wood grain. Material roles: oak (metallic 0, roughness .40), graphite structure (.10/.48), brushed handles (.68/.35). The only texture is the original shared 512×512 RGB sRGB oak PNG, 49,211 bytes embedded once in this GLB. Repeat sampling uses UVs; no procedural Blender-only nodes are required. The map is generated with mathematical grain/pores and contains no baked lighting or external image pixels. Author: Codex for this project; no third-party model/texture/license dependency.

Source `blender-assets/desk_v06a.blend`; Web model `public/models/production/desk_v06a.glb`. From project root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python scripts/assets/build_architecture_assets.py -- desk
```

Blender 5.2.1 LTS, standard GLB Y-up, applied geometry/normals/UVs/PBR/extras, no lights/cameras/animation/compression. Web coordinates map once to Blender `(x,-z,y)` before normal glTF export. Fresh GLB import verifies mesh/triangle counts, per-mesh UV coverage, root names and bounds within 1 micrometre.

Export: **4,520 triangles, 8 primitives, 3 materials, 1 embedded image, 203,880 GLB bytes**. Current measured details, source hash, four solid bounds and roundtrip assertions are in `asset-statistics.json`. A primitive count is not an actual renderer-call measurement. 512²×4 RGBA8 GPU texture estimate is 1 MiB, or about 1.333 MiB including mipmaps per loaded image instance; compressed network bytes differ. Cross-family copies of the shared source PNG must be counted separately.

Web loading, steel piano clearance, negative clicks, screenshots and performance are assessed by the batch validation. Source-model completion does not constitute browser or user visual approval.

Independent exported-byte audit: run `node scripts/assets/inspect_architecture_export.mjs`; see `assets-source/v06a/architecture-export-audit.json` for source envelopes, closed edges, outward normals, positive volume and per-solid subset checks. All architecture materials explicitly use backface culling.

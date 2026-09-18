# v0.6A architecture preparation

Status: **measured/planned only; production generation waits for the current v0.5 baseline gate**. This document authorizes no B/C work. Existing three pilot assets, frozen FINAL files and application code are unchanged by this preparation.

## Input and interpretation

Read the current v0.6 task book, roadmap v0.6 section, v0.5 pipeline guide, actual manifest and generator, original blockout construction/finalization scripts, spatial freeze manifest and the actual runtime FINAL GLB. Style follows the existing room concept (warm wood, restrained dark structure, soft neutral textiles), with the v0.5 three devices as a provisional style baseline pending user review. Reference images are not distributable texture sources.

Local references, relative to project root:

- `../Sharkys_Room_Blockout_Pack/room_master_reference.jpeg`
- `../blockout_FINAL/hero_FINAL.png`
- `../blockout_FINAL/spatial_freeze_manifest.json`

## Independent package boundaries

Architecture owns `scripts/assets/build_architecture_assets.py`, shared helper `scripts/assets/v06a_blender_common.py`, and the following seven families. Main agent owns upholstered furniture, tables, rugs and dog bed, app integration, tests and final reports. No production files are generated before the baseline agent passes the opening gate.

| Family ID / GLB basename | Identity root | Existing anchor |
|---|---|---|
| `floor_v06a` | `VIS_Floor` | `ENV_Floor` |
| `walls_v06a` | `VIS_WallLeft`, `VIS_WallRight` | `ENV_Wall_Left`, `ENV_Wall_Right` |
| `door_v06a` | `VIS_DoorBody`, `VIS_DoorHandle` | `ENV_Door`, `DEC_DoorHandle` |
| `window_v06a` | `VIS_WindowFrame` | `ENV_WindowFrame` |
| `curtains_v06a` | `VIS_CurtainLeft`, `VIS_CurtainRight` | `ENV_Curtain_Left`, `ENV_Curtain_Right` |
| `desk_v06a` | `VIS_Desk` | `FUR_Desk` |
| `cabinet_v06a` | `VIS_Cabinet` | `FUR_DisplayCabinet` |

URLs are `/models/production/{family}_v06a.glb`; editable sources are `blender-assets/{family}_v06a.blend`; specs/statistics belong in `assets-source/v06a/{family}/`. The matching VIS prefix has no inherited TEC/INT/TGT aliases. `ENV_WindowGlass` is deliberately left independent with its current rendering and interaction strategy. City background is not part of A.

## Measured local envelopes

Actual GLTFLoader results from the frozen GLB, rounded to six decimals. These are **Web Y-up metres**, before mounting. Identity root does not mean an object's vertices are centered around zero.

| Original anchor | Local minimum | Local maximum |
|---|---|---|
| `ENV_Floor` | `[-3.69,-.12,-2.99]` | `[3.69,0,2.99]` |
| `ENV_Wall_Left` | `[-.09,0,-2.9]` | `[.09,3,2.9]` |
| `ENV_Wall_Right` | `[-3.69,0,-.09]` | `[3.69,3,.09]` |
| `ENV_Door` | `[-.0375,-1.065,-.495]` | `[.0375,1.065,.495]` |
| `DEC_DoorHandle` | `[-.03,-.0175,-.06]` | `[.03,.0175,.06]` |
| `ENV_WindowFrame` | `[-2.74,.86,-.065]` | `[1.39,2.82,.065]` |
| both `ENV_Curtain_*` | `[-.15,-1.41,-.09]` | `[.15,1.41,.09]` |
| `FUR_Desk` | `[-1.4,0,-.41]` | `[1.4,.74,.41]` |
| `FUR_DisplayCabinet` | `[-.30,0,-1.65]` | `[.30,2.60,2.10]` |

Floor cutaway outline in XZ is `(-3.69,2.99),(1.61,2.99),(3.69,.91),(3.69,-2.99),(-3.69,-2.99)`. Preserve the diagonal `x+z=4.60`; upper contact plane stays Y=0 and the plinth stays above Y=-.12. The cabinet is asymmetric around its unchanged origin, facing +X with its long dimension along Z. Do not center a generic 3.75 m box at the origin.

### Desk solid component bounds

| Component | Local minimum | Local maximum |
|---|---|---|
| Top | `[-1.4,.670,-.410]` | `[1.4,.740,.410]` |
| Left pedestal | `[-1.373585,0,-.375]` | `[-.950943,.670,.325]` |
| Right pedestal | `[.950943,0,-.375]` | `[1.373585,.670,.325]` |
| Rear brace | `[-.924528,.545,-.390]` | `[.924528,.645,-.330]` |

Bevels and shaped subparts must remain within these solid component volumes. New handles are recessed within a pedestal's existing front plane, not projected into the piano corridor. The top does not become thicker downward. Frozen piano top Y=.654 versus desktop bottom Y=.670 gives the expected 16 mm vertical reference gap; the full five-position and existing sampling checks still have to run against actual new triangles. The overall desk AABB is not a collision solid.

### Cabinet shelves and compartments

Use the 13 original panel boxes, including both final added rear shelves, rather than generating a regular grid. Only inward bevels or inset edge treatments are permitted. The original panels' vertices and final compartment bounds are the authority. Preserve all ten reserved collectible proxies. New material faces, back panel details or trim cannot protrude into the published clear compartments. This is A furniture work, not collectible modeling.

## Proposed visible modeling

- Floor: individually staggered plank polygons clipped to the frozen cutaway, subtle actual recessed joins, edge chamfer where worthwhile, dark substrate and a separate plinth edge. The surface remains Y=0. A shared UV wood image carries longitudinal grain; it is not a single colored slab.
- Desk: shaped warm wood tabletop/profile, inset drawer fronts with narrow reveals, recessed handles and toe plinths; existing independent side pedestals and rear brace remain clear of the piano path. Three material groups rather than one per drawer.
- Cabinet: authored panel set in exact original positions, eased front edges, subtle edge bands, warm back surfaces and dark structural sides. No slot is narrowed, and no lighting system is added.
- Walls: retain actual door/window openings and cutaway silhouette, separate softly shaded warm plaster from small lower trim/top edge details contained within the existing slab thickness.
- Door: rail/stile panel form and recessed faces inside the existing box; independent handle gets actual spindle/lever geometry under its own existing anchor.
- Window: original six frame members become stepped/rebated profiles with narrow inset seals inside their measured member boxes; glass is retained once.
- Curtains: modeled hanging cloth strips with static sinusoidal folds, restrained gathered header and hem, bounded by the original .30×2.82×.18 m reserves. No simulation, expanded spread or additional curtain rail outside the envelope.

## Shared generator contract

Planned helper API, matching the v0.5 helper parameter conventions:

```python
reset()
root(name, anchor)
pbr(name, color, metal=0, rough=.4)
box(name, center, size, material, parent, bevel=.002, segments=3)
cylinder(name, center, radius, depth, material, parent,
         axis=(0,1,0), vertices=24)
combine(name, objects)
mesh_web(name, vertices, faces, material, parent,
         uv_axes=(0,2), uv_scale=(1,1), smooth=False)
export_family(family)
```

All geometry arguments are Web Y-up metres. The helper converts vertices once to Blender `(x,-z,y)`, applies geometry transforms, keeps exported roots identity and exports standard GLB Y-up. `mesh_web` supports cloth/cushion vertex generation in the furniture script. The helper performs fresh GLB import checks and records statistics. It does not modify the v0.5 builder or generate v0.5 assets. Caller owns authored geometry; helper owns reproducible export and reporting.

UVs use physical scales, not arbitrary cube-size stretching: plank grain along its long axis; countertop grain aligned with the desk; cabinet verticals and shelves use suitable planar projections; cloth follows its panel coordinates. Shared solid-color surfaces still receive valid UVs. Combine only within a mounted root and compatible material. Preserve independently mounted parts and any named required surfaces.

## PBR and planned resource budget

Use standard metallic/roughness PBR with warm medium wood, warm neutral plaster, dark graphite structural parts and taupe textile. A small original deterministic 512px wood color image can be embedded once per family and reused by materials inside that GLB. Keep patterned noise low enough that the PNG compresses well; do not generate a unique 2K texture per piece. Cloth can use a small shared weave or scalar PBR plus modeled folds/seams. No external product image or reference-image pixels enter `public/`.

Shared source image does not mean shared network bytes or GPU instances across different GLBs: record each embedded copy and the decoded per-instance estimate. Retain the simple v0.5 owner model rather than introducing a new global texture cache.

Architecture planning target: **≤30k triangles, ≤1.4 MB delivered GLBs, around 18–22 visible material primitives**. These are proposed budgets, not measurements or exact renderer calls. The whole A batch's parent budget is ≤90k new triangles, ≤4 MB new payload and approximately +45 Hero draw-call review line. The actual before/after counters decide acceptance.

## Related furniture warning

`DEC_DogBedProxy` is a Group containing `DEC_DogBedProxy_Mesh` (bed only, local Y 0…0.20) and `DEC_DogBedProxy_Mesh_1` (existing dog proxy, local Y .085… .405). A replaces only the bed visual. Preserve the dog proxy for C by attaching/hiding only the original bed primitive, or explicitly listing the replaced old primitive. Hiding all descendants of the parent would silently remove a later-batch proxy.

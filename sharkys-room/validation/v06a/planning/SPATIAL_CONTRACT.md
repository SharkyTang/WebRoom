# v0.6A measured spatial contract

Fresh read of the frozen FINAL GLB and a separate read-only Blender load. All numbers below use Three/glTF Y-up metres. No model, app, or frozen file was changed. Exact unrounded numbers, transforms and per-primitive material records are in `frozen-space-contract.json`; source disconnected solids are in `blender-solid-components.json`.

## A anchors

| Anchor | Parent | Translation | Local minimum | Local maximum |
|---|---|---|---|---|
| ENV_RoomShell | ENVIRONMENT | [0, 0, 0] | empty anchor | empty anchor |
| ENV_Floor | ENVIRONMENT | [0, 0, 0] | [-3.69, -0.12, -2.99] | [3.69, 0, 2.99] |
| ENV_Wall_Left | ENVIRONMENT | [-3.69, 0, 0] | [-0.09, 0, -2.9] | [0.09, 3, 2.9] |
| ENV_Wall_Right | ENVIRONMENT | [0, 0, -2.99] | [-3.69, 0, -0.09] | [3.69, 3, 0.09] |
| ENV_WindowFrame | ENVIRONMENT | [0, 0, -2.895] | [-2.74, 0.86, -0.065] | [1.39, 2.82, 0.065] |
| ENV_WindowGlass | ENVIRONMENT | [-0.675, 1.84, -2.955] | [-1.98, -0.9, -0.006] | [1.98, 0.9, 0.006] |
| ENV_Curtain_Left | ENVIRONMENT | [-2.68, 1.48, -2.73] | [-0.15, -1.41, -0.09] | [0.15, 1.41, 0.09] |
| ENV_Curtain_Right | ENVIRONMENT | [1.33, 1.48, -2.73] | [-0.15, -1.41, -0.09] | [0.15, 1.41, 0.09] |
| ENV_Door | ENVIRONMENT | [-3.59, 1.065, 2.175] | [-0.0375, -1.065, -0.495] | [0.0375, 1.065, 0.495] |
| DEC_DoorHandle | DECORATIONS | [-3.525, 1.02, 1.85] | [-0.03, -0.0175, -0.06] | [0.03, 0.0175, 0.06] |
| FUR_DisplayCabinet | FURNITURE | [-3.25, 0, -0.9] | [-0.3, 0, -1.65] | [0.3, 2.6, 2.1] |
| FUR_Desk | FURNITURE | [-0.65, 0, -1.95] | [-1.4, 0, -0.41] | [1.4, 0.74, 0.41] |
| FUR_OfficeChair | FURNITURE | [-1.05, 0, -0.59] | [-0.27, 0.0275, -0.29673] | [0.309219, 1.055, 0.29673] |
| FUR_Bed | FURNITURE | [2.45, 0, -1.13] | [-0.85, 0.02, -1.1] | [0.85, 1.04, 1.02] |
| FUR_BedsideTable | FURNITURE | [2.95, 0.29, -2.52] | [-0.3, -0.29, -0.265] | [0.3, 0.29, 0.265] |
| FUR_Sofa | FURNITURE | [-2.13, 0, 1.12] | [-0.985, 0.115, -0.44] | [0.985, 0.92, 0.435] |
| FUR_CoffeeTable | FURNITURE | [-0.83, 0, 1.02] | [-0.55, 0, -0.325] | [0.55, 0.48, 0.325] |
| FUR_BeanBag | FURNITURE | [2.13, 0, 1.76] | [-0.39, 0, -0.4173] | [0.39, 0.78, 0.3705] |
| FUR_SideTable | FURNITURE | [0.98, 0.27, 2.19] | [-0.24, -0.27, -0.24] | [0.24, 0.27, 0.24] |
| DEC_Rug_Workstation | DECORATIONS | [-0.48, 0.008, -0.71] | [-1.47, -0.008, -1] | [1.47, 0.008, 1] |
| DEC_Rug_Lounge | DECORATIONS | [-1.12, 0.012, 1.22] | [-1.41, -0.009, -0.885] | [1.41, 0.009, 0.885] |
| DEC_DogBedProxy | DECORATIONS | [-0.3, 0, 2.4] | [-0.55, 0, -0.375] | [0.55, 0.405, 0.375] |

Rotations and scales must be inherited from each original anchor. Sofa has the frozen 98-degree Y rotation; coffee table has the frozen -4-degree Y rotation. All VIS mount roots remain identity; do not bake those rotations into exported vertices.

## Desk and piano

The side cabinets are two disconnected solids inside `FUR_Desk`, not separate anchors. Its four source solids are:

| Solid | Local minimum | Local maximum |
|---|---|---|
| tabletop | [-1.4, 0.67, -0.41] | [1.4, 0.74, 0.41] |
| left_integrated_side_cabinet | [-1.373585, 0, -0.375] | [-0.950943, 0.67, 0.325] |
| right_integrated_side_cabinet | [0.950943, 0, -0.375] | [1.373585, 0.67, 0.325] |
| rear_crossbar | [-0.924528, 0.545, -0.39] | [0.924528, 0.645, -0.33] |

Rail local Z stays -1.9399999618530273 to -1.2899999618530273, travel 0.65 m. All 17 CPU samples (15 evenly spaced plus 25% and 75%) avoid the four real desk solids and all source chair component bounds. Tabletop underside minus piano top is 0.0159999318420887 m. The full swept piano world envelope is [-1.32, 0.55, -2.12] to [0.02, 0.654, -1.11].

The existing Web-only hit box slightly overlaps the existing tabletop AABB at one corner. This is not a new collision: preserve existing nearest-hit behavior and test real mouse/touch entry. An all-boxes-disjoint rule would incorrectly reject the known working baseline.

## Cabinet compartments

Thirteen exact disconnected source panels remain distinct in the JSON. Each production triangle must stay within those panel volumes; bevels may remove corners. The actual ten DSP proxies were checked against every panel and their precise registered compartment. No overlap was found.

| Slot | Width / depth / height | Preserved proxy |
|---|---|---|
| Hogwarts / large architecture | [1.66, 0.57, 1.14] | DSP_Castle_Bounds |
| Millennium Falcon | [1.66, 0.57, 0.58] | DSP_Falcon_Bounds |
| Eiffel Tower | [0.7975, 0.57, 1.79] | DSP_EiffelTower_Bounds |
| SLS | [0.435, 0.57, 1.79] | DSP_TallRocket_Bounds |
| Ferrari F1 | [0.81, 0.57, 0.57] | DSP_Vehicle_Bounds |
| Mercedes-AMG F1 | [0.81, 0.57, 0.57] | DSP_MercedesAMGF1_Bounds |
| Tower Bridge | [1.87, 0.57, 0.57] | DSP_Bridge_Bounds |
| Medium architecture | [0.5475, 0.57, 0.525] | DSP_Architecture_Bounds |
| Medium collectible | [0.5475, 0.57, 0.54] | DSP_MediumModel_Bounds |
| Small collectible | [0.5475, 0.57, 0.605] | DSP_SmallModel_Bounds |

## Floor and support surfaces

The floor cutaway retains five XZ corners: (-3.69,2.99), (1.61,2.99), (3.69,.91), (3.69,-2.99), (-3.69,-2.99); the diagonal is x+z=4.60. Floor top Y=0, bottom Y=-.12.

There are two rugs. Workstation rug top Y=.016 supports the chair. Lounge rug top Y=.021 lies under the coffee table and most of the sofa footprint. New sofa feet must use their actual XZ support, not assume floor Y=0. The main agent chose local sofa feet x±.78,z±.23, all on that rug. Bed and round side-table support on bare floor Y=0. Tabletop support heights stay desk .74, bedside .58, coffee .48, round side table .54.

Documented A detail allowance: add only feet/support details below old bed/sofa/chair bodies to their real support surface, without changing the original anchors or upper/horizontal envelopes. Lounge rug may fill its old 3 mm bottom gap down to floor while keeping its .021 m top. The old source bodies themselves must not move down.

## Dog-bed partial replacement and exclusions

`DEC_DogBedProxy` contains bedding and a future dog. Replace only `DEC_DogBedProxy_Mesh` (bed, local X±.55/Y0… .20/Z±.375). Preserve `DEC_DogBedProxy_Mesh_1`, which contains the existing dog body and head placeholder volumes for C. Dog visual production is not A.

`ENV_RoomShell` is an empty metadata anchor. `ENV_WindowGlass` remains one independent original glass visual; A window-frame modeling does not require a second transparent layer. `ENV_CityBackground`, the ten DSP proxies, all B devices and all C decorations remain unchanged. `FUR_BedsideTable` is a real separate A furniture anchor and is not the foreground round `FUR_SideTable`.

## Reproduction and evidence boundary

Run `measure_blender_components.py` read-only against the frozen .blend, then `node validation/v06a/planning/measure-frozen-space.mjs`. The Blender source SHA-256 before and after was identical. These are geometry/planning checks only, not browser or visual approval. New actual GLBs are covered by `tests/furniture-geometry.test.ts` once produced.

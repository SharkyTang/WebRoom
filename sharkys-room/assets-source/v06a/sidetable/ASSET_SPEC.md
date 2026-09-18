# v0.6A · Round side table

Original editable procedural approximation from `scripts/assets/build_furniture_assets.py -- sidetable`; no external models or reference pixels. Exact counts and round-trip checks are in `asset-statistics.json`.

- `VIS_SideTable` → `FUR_SideTable`, identity root, anchor-local glTF Y-up metres.
- Circular warm-oak top of radius 0.24 m and thickness 0.03 m, plus exactly three fine metal legs of radius 0.014 m. This remains distinct from both the rectangular coffee table and bedside cabinet.
- Local Y −0.27–0.27 m; frozen anchor world Y 0.27 m. World tabletop stays at 0.54 m for the unchanged lounge lamp, and the legs stand on floor Y 0.
- `VIS_SideTableSupportThreeLegs` has `v06a_support=true`. Shared original 512×512 oak and scalar PBR metal; no baked lighting.
- Combined nine-family target ≤55,000 triangles / ≤2.6 MB GLB. Installed envelope, lamp support and actual ground contact are verified by the furniture geometry tests.

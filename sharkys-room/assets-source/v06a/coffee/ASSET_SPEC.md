# v0.6A · Coffee table

Original editable procedural approximation from `scripts/assets/build_furniture_assets.py -- coffee`; no external models or reference pixels. Exact counts and round-trip checks are in `asset-statistics.json`.

- `VIS_Coffee` → `FUR_CoffeeTable`, identity root. Preserve the original anchor's −4° Web Y rotation.
- Rounded rectangular warm-oak top, 1.10 × 0.65 m; top remains world Y 0.48 m, maintaining the unchanged iPad support. It is intentionally not a circular table.
- Four dark fine legs terminate on the lounge rug at Y 0.021 m, preserving the original horizontal/upper envelope. `VIS_CoffeeSupportFeet` carries `v06a_support=true`.
- Shared original 512×512 oak image and scalar metal PBR. Combined nine-family target ≤55,000 triangles / ≤2.6 MB GLB.
- `tests/furniture-geometry.test.ts` checks actual tabletop down-rays, support grounding, runtime ancestry and source invariance.

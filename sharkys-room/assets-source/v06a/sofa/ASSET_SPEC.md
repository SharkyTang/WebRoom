# v0.6A · Sofa

Original editable procedural approximation from `scripts/assets/build_furniture_assets.py -- sofa`; no external models or reference pixels. Exact exported counts and round-trip checks are in `asset-statistics.json`.

- `VIS_Sofa` → `FUR_Sofa`, identity root. The existing 98° Web Y rotation stays entirely on the frozen anchor.
- Rounded taupe plinth, back, arms, two separately formed seat cushions and two gently inclined back cushions. Low-cost piping follows seat and cushion perimeters.
- Frozen body bounds: X ±0.985, Y 0.115–0.92, Z −0.44–0.435 m. Upper silhouette and placement stay within these limits.
- Four slim `VIS_SofaSupportFeet`, tagged `v06a_support=true`, stand at local X ±0.72, Z ±0.23 on the lounge rug at world Y 0.021 m. The first proposed X ±0.78 would put a foot beyond the rug after the original 98° rotation; the final inset preserves actual contact without moving either frozen anchor. Only these supports fill the old gap under the body.
- Original repeating 512×512 sRGB taupe weave; scalar PBR seams and graphite feet. No baked lighting or procedural shader required at runtime.
- Combined nine-family target ≤55,000 triangles / ≤2.6 MB GLB. Actual support down-rays and source geometry contracts are in `tests/furniture-geometry.test.ts`.

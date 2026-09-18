# v0.6A · Bedside table

Original editable procedural approximation from `scripts/assets/build_furniture_assets.py -- bedside`; no external model or reference pixels. Exact exported counts and round-trip checks are in `asset-statistics.json`.

- `VIS_Bedside` → `FUR_BedsideTable`, identity root, original anchor-local glTF Y-up metres.
- Separate warm-oak side, back, bottom and top panels create a real open-front carcass. Three inset drawer fronts sit ahead of dark recessed reveals; narrow handles project within the original outer envelope. There is no solid front box face hiding these details.
- Frozen local bounds are X ±0.30, Y ±0.29, Z ±0.265 m. World support top remains Y 0.58 m for the unchanged bedside lamp.
- Shared original 512×512 sRGB oak base color; dark scalar PBR reveals/handles. Geometry and materials remain editable in the `.blend`.
- Combined nine-family budget ≤55,000 triangles / ≤2.6 MB GLB. Tests verify original source hashes, mounted envelopes and actual lamp support raycasts.

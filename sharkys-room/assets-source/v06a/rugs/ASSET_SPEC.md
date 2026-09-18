# v0.6A · Work and lounge rugs

Two original editable rugs from `scripts/assets/build_furniture_assets.py -- rugs`; no external model or reference pixels. Exact exported counts and checks are in `asset-statistics.json`.

- Identity roots `VIS_RugWorkstation` → `DEC_Rug_Workstation` and `VIS_RugLounge` → `DEC_Rug_Lounge`. No other source rug exists in A.
- Work rug preserves 2.94 × 2.00 m rectangle and world Y 0–0.016 m.
- Lounge rug preserves 2.82 × 1.77 m rectangle and world top Y 0.021 m; its old 3 mm empty underside is filled down to floor Y 0, without moving the anchor or raising support surfaces.
- Rounded backing and separate bound perimeter surround a woven center field. Coplanar center and perimeter occupy disjoint regions; no full-size duplicate top surface is stacked over them.
- Original repeating 512×512 sRGB weave and border textures. No fur cards, alpha layers or baked lighting. Combined nine-family target ≤55,000 triangles / ≤2.6 MB GLB.
- Tests verify both original rectangle bounds and actual chair/sofa/coffee support contacts.

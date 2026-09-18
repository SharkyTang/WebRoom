# v0.6A · Office chair

Original editable procedural approximation from `scripts/assets/build_furniture_assets.py -- chair`; no external models or reference pixels. Exact counts and export checks are in `asset-statistics.json`.

- `VIS_Chair` → `FUR_OfficeChair`, identity root, original glTF Y-up anchor coordinates.
- Separate rounded seat/back, two padded armrests with posts, back spine, gas lift, five-spoke base and five individually oriented caster wheels.
- Body remains within frozen local X −0.270–0.309219, Y ≤1.055, Z ±0.296730 m. Seat height and relation to the piano extraction corridor are unchanged.
- `VIS_ChairSupportWheels`, tagged `v06a_support=true`, extends the old wheel gap down to the unchanged work rug top at world Y 0.016 m. Other chair bodies retain their original height envelope.
- Original repeating 512×512 fabric image, graphite and rubber scalar PBR. All curve samples are realized editable mesh geometry.
- Combined nine-family target ≤55,000 triangles / ≤2.6 MB GLB. Geometry tests cover actual wheel support, all 17 sampled piano positions and 20 assembled mechanism cycles.

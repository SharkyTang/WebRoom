# v0.6A · Dog bed only

Original editable procedural approximation from `scripts/assets/build_furniture_assets.py -- dogbed`; no external model or reference pixels. Exact exported counts and round-trip checks are in `asset-statistics.json`.

- `VIS_DogBed` → `DEC_DogBedProxy`, identity root, original glTF Y-up local metres.
- The runtime manifest explicitly replaces only `DEC_DogBedProxy_Mesh`. Original `DEC_DogBedProxy_Mesh_1` contains the grey dog body/head and remains unchanged for the later C scope.
- A rounded grounded base, continuous soft raised bolster with a slightly lowered entrance, and inset cushion remain inside the original dog-bed local envelope X ±0.55, Y 0–0.20, Z ±0.375 m.
- Two original repeating 512×512 sRGB fabric images with scalar roughness. Volumetric rim and cushion remain editable mesh geometry, without baked lighting or photo sources.
- Combined nine-family target ≤55,000 triangles / ≤2.6 MB GLB. Furniture geometry tests verify selective suppression, the retained dog's real triangle raycast, source references and full rollback behavior.

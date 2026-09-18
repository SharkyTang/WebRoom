# v0.6A · Beanbag

Original editable procedural approximation from `scripts/assets/build_furniture_assets.py -- beanbag`; no external model or reference pixels. Exact counts and round-trip checks are in `asset-statistics.json`.

- `VIS_Beanbag` → `FUR_BeanBag`, identity root, original glTF Y-up local metres.
- A single closed radial surface forms a depressed sitting area, raised rear support, softly undulating skirt and flat grounded underside. Four mesh seams run up fabric panels; it is not built by stacking two ordinary spheres.
- Frozen envelope X ±0.39, Y 0–0.78, Z −0.417300–0.370500 m. Original placement and rotation stay on the existing anchor.
- Original repeating 512×512 sRGB weave; scalar PBR stitching. Fabric folds and the seated depression are genuine geometry, not baked shadows.
- Thin panel seams have 1 mm radius and their centerlines are offset 2.5 mm along computed outward shell normals. At the steep seat/rear transition the upper path also rises 7 mm; the actual exported seam vertices and face centers all remain outside the closed shell with >0.4 mm minimum clearance. This prevents intermittent dark depth dots while preserving the original outer envelope.
- Combined nine-family target ≤55,000 triangles / ≤2.6 MB GLB. Export stats include exact realized geometry bounds and UV round-trip checks; installed tests preserve source and interaction contracts.

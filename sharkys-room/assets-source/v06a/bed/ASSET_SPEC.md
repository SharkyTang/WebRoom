# v0.6A · Bed

Original stylized furniture authored by `scripts/assets/build_furniture_assets.py`. This is an editable procedural approximation, with no external model, brand asset or reference pixels. Reproduce only this family with Blender's `-- bed` argument. Export validation and exact budgets are recorded in `asset-statistics.json`.

- Root `VIS_Bed` attaches with identity TRS to frozen `FUR_Bed`; metre coordinates are glTF Y-up in that anchor's local frame.
- Rounded warm-oak frame and headboard, linen mattress, two separate volumetric pillows, upholstered headboard panel and fine seams. The blue-grey cover is a closed, thickness-bearing folded grid; its entire surface stays inside the original cover envelope Y 0.51–0.56 m.
- Original horizontal/upper envelope: X ±0.85, Z −1.10–1.02, Y ≤1.04 m. Existing anchor, furniture placement and bedside props remain unchanged.
- Only `VIS_BedSupportFeet` fills the original empty space underneath the body, down to floor Y 0. It has `v06a_support=true`; the frame stays at Y ≥0.04 m.
- The headboard wood core stops at local Z −1.008 m; the linen panel projects to Z −0.98 m inside the original headboard envelope. These visible front surfaces are separated, avoiding a coincident wood/fabric depth plane.
- Materials use original 512×512 repeating sRGB linen/bedding textures and the shared original oak image. Seams and dark metal feet use scalar PBR; no baked light, runtime texture painting or external dependency.
- The nine furniture families share a combined target of ≤55,000 triangles and ≤2.6 MB GLB. UV/PBR, source hashes, support surfaces and installed geometry are checked by `tests/furniture-geometry.test.ts`.

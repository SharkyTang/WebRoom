# Display cabinet — v0.6A

Original stylized approximation by Codex for this project. No specific real product dimensions or model are claimed. Existing concept and frozen Hero guide style/proportion; their pixels are not redistributed in textures.

## Form and protected space

The cabinet retains the exact 13 frozen panel volumes. Warm wood shelves meet dark eased structural uprights, while the back has actual narrow wood panels over a recessed substrate. This preserves the irregular tall, wide and small collection slots instead of generating a new regular grid.

VIS_CabinetSolid_00 through VIS_CabinetSolid_12 each export sourceComponentIndex, sourceMin and sourceMax. The source panel boxes come from validation/v06a/planning/blender-solid-components.json. All geometry remains within those boxes; ten source compartments and every collectible proxy remain independently available. The asymmetric local Z extent is -1.65 to +2.10 m; do not recenter it.

All roots below have identity TRS and attach directly to the existing anchors. Coordinates are Web/glTF Y-up metres, with no local adaptation matrix. Exact exported bounds:

| Root | Original anchor | Local min | Local max |
| --- | --- | --- | --- |
| VIS_Cabinet | FUR_DisplayCabinet | [-0.3,0,-1.65] | [0.3,2.6,2.1] |

## Material and UV

Oak shelf/back surfaces use the shared 512 RGB sRGB original grain, metallic 0 / roughness .49. Dark structure uses .18 / .46. One texture is embedded once and shared within the family.

All 14 meshes have UVs. Wood uses physical planar projections following the visible grain direction; folded cloth uses continuous panel UV coordinates, while scalar PBR surfaces retain primitive UVs. Export uses standard metallic/roughness materials, normals and UVs. No complex Blender-only material is required.

Texture source, if present: assets-source/v06a/shared/warm_oak_basecolor_512.png, original deterministic mathematical grain/pores (512 x 512 RGB, sRGB, 49,211 bytes). No downloaded models, logos, external texture license or reference-image pixels are involved. The image is packed in the source .blend and embedded once in this GLB; cross-family copies are counted separately. Estimated decoded image memory is 1048576 bytes RGBA8, or approximately 1398101 bytes with mipmaps, excluding driver overhead. See ../shared/TEXTURE_SOURCES.md.

## Reproduction and output

Source: blender-assets/cabinet_v06a.blend. Web delivery: public/models/production/cabinet_v06a.glb. From project root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python scripts/assets/build_architecture_assets.py -- cabinet
```

Blender 5.2.1 LTS. The helper maps Web vertices once to Blender (x,-z,y), then the normal Y-up GLB exporter reverses that conversion. Applied geometry, normals, UVs, materials and custom properties are exported; lights/cameras/animation/compression are disabled. The frozen FINAL GLB/.blend are not edited.

Current exported totals: **4,460 triangles, 14 primitives, 2 materials, 1 embedded image, 220,208 GLB bytes**. Exact SHA256, per-root bounds, texture payload and source-component metadata are in asset-statistics.json. The primitive count is structural, not a renderer draw-call measurement.

Fresh Blender import passed triangle/mesh counts, UV coverage, root-name matching and bounds within 1 micrometre. Actual Web installation, focus/occlusion, reference-space checks and mouse/touch regressions are assessed by the batch validation. Model export success does not assert user visual approval.

Final coplanar-face correction: wood shelf front ends were recessed 4 mm along local X, back ends 1 mm, and the outer Z endpoints 1 mm, all inside their original solid volumes. This avoids color/z-fighting at original interlocking wood/frame intersections. Original source bounds remain in metadata; support Y heights, total outer envelope and all reserved compartment clearances are unchanged.

Independent exported-byte audit: run `node scripts/assets/inspect_architecture_export.mjs`; see `assets-source/v06a/architecture-export-audit.json` for source envelopes, closed edges, outward normals, positive volume and per-solid subset checks. All architecture materials explicitly use backface culling.

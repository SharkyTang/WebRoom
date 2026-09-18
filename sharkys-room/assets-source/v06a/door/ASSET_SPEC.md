# Door and handle — v0.6A

Original stylized approximation by Codex for this project. No specific real product dimensions or model are claimed. Existing concept and frozen Hero guide style/proportion; their pixels are not redistributed in textures.

## Form and protected space

The original door now has distinct stiles, rails, a crossrail and two recessed wood panels. The original independent handle anchor carries a modeled rosette, spindle and cylindrical lever, rather than a rectangular placeholder.

Door front faces +X, height spans exactly its original +/-1.065 m local bounds. The separate handle fits within its own original 60 x 35 x 120 mm local envelope. No door-opening interaction was added.

All roots below have identity TRS and attach directly to the existing anchors. Coordinates are Web/glTF Y-up metres, with no local adaptation matrix. Exact exported bounds:

| Root | Original anchor | Local min | Local max |
| --- | --- | --- | --- |
| VIS_DoorBody | ENV_Door | [-0.0375,-1.065,-0.495] | [0.0375,1.065,0.495] |
| VIS_DoorHandle | DEC_DoorHandle | [-0.0205,-0.016,-0.0525] | [0.028,0.016,0.0525] |

## Material and UV

Oak uses the shared original 512 RGB sRGB grain image, roughness .47; handle is satin brass, metallic .74 / roughness .32. One image is embedded once.

All 2 meshes have UVs. Wood uses physical planar projections following the visible grain direction; folded cloth uses continuous panel UV coordinates, while scalar PBR surfaces retain primitive UVs. Export uses standard metallic/roughness materials, normals and UVs. No complex Blender-only material is required.

Texture source, if present: assets-source/v06a/shared/warm_oak_basecolor_512.png, original deterministic mathematical grain/pores (512 x 512 RGB, sRGB, 49,211 bytes). No downloaded models, logos, external texture license or reference-image pixels are involved. The image is packed in the source .blend and embedded once in this GLB; cross-family copies are counted separately. Estimated decoded image memory is 1048576 bytes RGBA8, or approximately 1398101 bytes with mipmaps, excluding driver overhead. See ../shared/TEXTURE_SOURCES.md.

## Reproduction and output

Source: blender-assets/door_v06a.blend. Web delivery: public/models/production/door_v06a.glb. From project root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python scripts/assets/build_architecture_assets.py -- door
```

Blender 5.2.1 LTS. The helper maps Web vertices once to Blender (x,-z,y), then the normal Y-up GLB exporter reverses that conversion. Applied geometry, normals, UVs, materials and custom properties are exported; lights/cameras/animation/compression are disabled. The frozen FINAL GLB/.blend are not edited.

Current exported totals: **2,072 triangles, 2 primitives, 2 materials, 1 embedded image, 125,612 GLB bytes**. Exact SHA256, per-root bounds, texture payload and source-component metadata are in asset-statistics.json. The primitive count is structural, not a renderer draw-call measurement.

Fresh Blender import passed triangle/mesh counts, UV coverage, root-name matching and bounds within 1 micrometre. Actual Web installation, focus/occlusion, reference-space checks and mouse/touch regressions are assessed by the batch validation. Model export success does not assert user visual approval.

Independent exported-byte audit: run `node scripts/assets/inspect_architecture_export.mjs`; see `assets-source/v06a/architecture-export-audit.json` for source envelopes, closed edges, outward normals, positive volume and per-solid subset checks. All architecture materials explicitly use backface culling.

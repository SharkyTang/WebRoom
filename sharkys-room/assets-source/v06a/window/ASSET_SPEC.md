# Window frame — v0.6A

Original stylized approximation by Codex for this project. No specific real product dimensions or model are claimed. Existing concept and frozen Hero guide style/proportion; their pixels are not redistributed in textures.

## Form and protected space

All six original frame members use a stepped structural body and narrower inset front profile, giving actual depth at the reveal. The existing independent glass is retained once.

Each new member remains inside the corresponding frozen member volume. ENV_WindowFrame keeps its original Window semantic anchor; ENV_WindowGlass, the opening, city background and weather remain untouched.

All roots below have identity TRS and attach directly to the existing anchors. Coordinates are Web/glTF Y-up metres, with no local adaptation matrix. Exact exported bounds:

| Root | Original anchor | Local min | Local max |
| --- | --- | --- | --- |
| VIS_WindowFrame | ENV_WindowFrame | [-2.74,0.86,-0.065] | [1.39,2.82,0.065] |

## Material and UV

Graphite profiles use metallic .45 / roughness .34; satin rebated faces use .60 / .30. No image texture or transparency.

All 2 meshes have UVs. Wood uses physical planar projections following the visible grain direction; folded cloth uses continuous panel UV coordinates, while scalar PBR surfaces retain primitive UVs. Export uses standard metallic/roughness materials, normals and UVs. No complex Blender-only material is required.

Texture source, if present: assets-source/v06a/shared/warm_oak_basecolor_512.png, original deterministic mathematical grain/pores (512 x 512 RGB, sRGB, 49,211 bytes). No downloaded models, logos, external texture license or reference-image pixels are involved. The image is packed in the source .blend and embedded once in this GLB; cross-family copies are counted separately. Estimated decoded image memory is 0 bytes RGBA8, or approximately 0 bytes with mipmaps, excluding driver overhead. See ../shared/TEXTURE_SOURCES.md.

## Reproduction and output

Source: blender-assets/window_v06a.blend. Web delivery: public/models/production/window_v06a.glb. From project root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python scripts/assets/build_architecture_assets.py -- window
```

Blender 5.2.1 LTS. The helper maps Web vertices once to Blender (x,-z,y), then the normal Y-up GLB exporter reverses that conversion. Applied geometry, normals, UVs, materials and custom properties are exported; lights/cameras/animation/compression are disabled. The frozen FINAL GLB/.blend are not edited.

Current exported totals: **2,256 triangles, 2 primitives, 2 materials, 0 embedded images, 69,628 GLB bytes**. Exact SHA256, per-root bounds, texture payload and source-component metadata are in asset-statistics.json. The primitive count is structural, not a renderer draw-call measurement.

Fresh Blender import passed triangle/mesh counts, UV coverage, root-name matching and bounds within 1 micrometre. Actual Web installation, focus/occlusion, reference-space checks and mouse/touch regressions are assessed by the batch validation. Model export success does not assert user visual approval.

Independent exported-byte audit: run `node scripts/assets/inspect_architecture_export.mjs`; see `assets-source/v06a/architecture-export-audit.json` for source envelopes, closed edges, outward normals, positive volume and per-solid subset checks. All architecture materials explicitly use backface culling.

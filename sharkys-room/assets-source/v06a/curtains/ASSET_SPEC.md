# Static pleated curtains — v0.6A

Original stylized approximation by Codex for this project. No specific real product dimensions or model are claimed. Existing concept and frozen Hero guide style/proportion; their pixels are not redistributed in textures.

## Form and protected space

Both curtains use original closed thin cloth geometry with five static pleats, gentle vertical variation, a wavy lower edge and a gathered header. The two sides share materials but retain independently mounted roots. Cloth has actual front/back surfaces and closed perimeter edges; no DoubleSide material hides reversed winding.

Each folded curtain and its header fit within the original 0.30 x 2.82 x 0.18 m anchor-local reserve. The panels are not widened over the desk or Window semantic entrance.

All roots below have identity TRS and attach directly to the existing anchors. Coordinates are Web/glTF Y-up metres, with no local adaptation matrix. Exact exported bounds:

| Root | Original anchor | Local min | Local max |
| --- | --- | --- | --- |
| VIS_CurtainLeft | ENV_Curtain_Left | [-0.15,-1.398939,-0.085] | [0.15,1.41,0.085] |
| VIS_CurtainRight | ENV_Curtain_Right | [-0.15,-1.398939,-0.085] | [0.15,1.41,0.085] |

## Material and UV

Warm linen uses metallic 0 / roughness .91; gathered headers use 0 / .88. The modeled folds supply shape; no simulation, image textures, hair or permanent animation loop.

All 4 meshes have UVs. Wood uses physical planar projections following the visible grain direction; folded cloth uses continuous panel UV coordinates, while scalar PBR surfaces retain primitive UVs. Export uses standard metallic/roughness materials, normals and UVs. No complex Blender-only material is required.

Texture source, if present: assets-source/v06a/shared/warm_oak_basecolor_512.png, original deterministic mathematical grain/pores (512 x 512 RGB, sRGB, 49,211 bytes). No downloaded models, logos, external texture license or reference-image pixels are involved. The image is packed in the source .blend and embedded once in this GLB; cross-family copies are counted separately. Estimated decoded image memory is 0 bytes RGBA8, or approximately 0 bytes with mipmaps, excluding driver overhead. See ../shared/TEXTURE_SOURCES.md.

## Reproduction and output

Source: blender-assets/curtains_v06a.blend. Web delivery: public/models/production/curtains_v06a.glb. From project root:

```sh
/Applications/Blender.app/Contents/MacOS/Blender --background --factory-startup --python-exit-code 1 --python scripts/assets/build_architecture_assets.py -- curtains
```

Blender 5.2.1 LTS. The helper maps Web vertices once to Blender (x,-z,y), then the normal Y-up GLB exporter reverses that conversion. Applied geometry, normals, UVs, materials and custom properties are exported; lights/cameras/animation/compression are disabled. The frozen FINAL GLB/.blend are not edited.

Current exported totals: **5,400 triangles, 4 primitives, 2 materials, 0 embedded images, 131,452 GLB bytes**. Exact SHA256, per-root bounds, texture payload and source-component metadata are in asset-statistics.json. The primitive count is structural, not a renderer draw-call measurement.

Fresh Blender import passed triangle/mesh counts, UV coverage, root-name matching and bounds within 1 micrometre. Actual Web installation, focus/occlusion, reference-space checks and mouse/touch regressions are assessed by the batch validation. Model export success does not assert user visual approval.

Final normal correction: thin perimeter faces use flat normals so opposing front/back surfaces do not contaminate the smooth fold normals. Actual exported indexed geometry is closed, has positive volume and has zero vertex-normal/triangle disagreements; no DoubleSide material hides winding errors.

Independent exported-byte audit: run `node scripts/assets/inspect_architecture_export.mjs`; see `assets-source/v06a/architecture-export-audit.json` for source envelopes, closed edges, outward normals, positive volume and per-solid subset checks. All architecture materials explicitly use backface culling.

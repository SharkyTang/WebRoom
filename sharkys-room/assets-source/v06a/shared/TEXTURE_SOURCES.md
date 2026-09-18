# v0.6A shared source texture registry

| File | Author / origin | Content | Color space | Size | License / external dependency |
|---|---|---|---|---|---|
| `warm_oak_basecolor_512.png` | Codex, original mathematics in `v06a_blender_common.py` | Longitudinal grain and sparse pores; no lighting, logos or copied pixels | sRGB base color | 512×512 RGB; 49,211 bytes | Original project asset; no external material or attribution dependency |
| `bluegreybedding_weave_512.png` | Codex, deterministic warp/weft mathematics in `build_furniture_assets.py` | Blue-grey cover; original low-amplitude periodic weave | sRGB base color | 512×512 RGB; 5,580 bytes | Original project asset; no external material or attribution dependency |
| `linen_weave_512.png` | Codex, same original textile generator | Pale linen mattress, pillows and headboard panel | sRGB base color | 512×512 RGB; 5,611 bytes | Original project asset; no external material or attribution dependency |
| `taupeupholstery_weave_512.png` | Codex, same original textile generator | Taupe sofa cushions, arms and base | sRGB base color | 512×512 RGB; 5,352 bytes | Original project asset; no external material or attribution dependency |
| `chairfabric_weave_512.png` | Codex, same original textile generator | Dark blue-grey office chair fabric | sRGB base color | 512×512 RGB; 5,269 bytes | Original project asset; no external material or attribution dependency |
| `beanbagweave_weave_512.png` | Codex, same original textile generator | Warm neutral beanbag woven shell | sRGB base color | 512×512 RGB; 5,487 bytes | Original project asset; no external material or attribution dependency |
| `rugborder_weave_512.png` | Codex, same original textile generator | Muted dark rug binding; both rugs share this image | sRGB base color | 512×512 RGB; 5,276 bytes | Original project asset; no external material or attribution dependency |
| `rugweave_weave_512.png` | Codex, same original textile generator | Muted light rug field; both rugs share this image | sRGB base color | 512×512 RGB; 5,302 bytes | Original project asset; no external material or attribution dependency |
| `dogbedcushion_weave_512.png` | Codex, same original textile generator | Light inset dog-bed cushion | sRGB base color | 512×512 RGB; 6,621 bytes | Original project asset; no external material or attribution dependency |
| `dogbedupholstery_weave_512.png` | Codex, same original textile generator | Darker dog-bed base and bolstered rim | sRGB base color | 512×512 RGB; 5,410 bytes | Original project asset; no external material or attribution dependency |

The generator writes a standard PNG from deterministic NumPy arrays using PNG/zlib encoding. It is the editable common source. Each participating GLB embeds its own image once, and shares that image among materials inside the family. Network accounting includes repeated embedded copies. No cross-family runtime texture cache is introduced.

The nine fabric PNGs total 49,908 compressed bytes. Each appears in exactly one family GLB, while the linen material covers multiple combined bed volumes and the two rug images cover both rug roots without duplicate embedding inside `rugs_v06a.glb`. Furniture also embeds four independent copies of the 49,211-byte oak image (bed, bedside, coffee and sidetable). Thus furniture texture transfer totals 246,752 encoded bytes across 13 embedded images. Decoding these nine furniture families requires an estimated 13,631,488 bytes in RGBA8, or 18,175,317 bytes with complete mip chains; these are texture estimates only, not total GPU memory.

RGBA8 decoded-memory estimate per loaded image is `512 × 512 × 4 = 1,048,576 bytes`; a full mip chain is approximately `×4/3 = 1,398,101 bytes`, excluding driver allocation overhead. These estimates differ from the compressed PNG size.

Reference images in the surrounding workspace are used only to guide style. They are not included in this texture or redistributed from `public/`.

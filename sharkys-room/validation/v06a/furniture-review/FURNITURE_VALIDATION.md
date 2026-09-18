# v0.6A furniture validation

Nine furniture families are complete: bed, bedside, sofa, chair, coffee, sidetable, beanbag, rugs and dogbed. The final delivery totals **26,728 triangles, 1,021,724 GLB bytes and 25 primitives**, below the combined 55,000-triangle / 2.6 MB budget. Exact hashes and per-family counts are in `production-summary.json`.

Each family has an editable `blender-assets/*_v06a.blend`, deployable `public/models/production/*_v06a.glb`, source specification and export statistics. The generator is `scripts/assets/build_furniture_assets.py`; all furniture uses the final shared PBR helper with explicit back-face culling. No exported material is double-sided. All nine Blender GLB re-import checks preserve roots, bounds, triangle counts and UV presence.

`node --import tsx --test tests/furniture-geometry.test.ts`: **32 passed, 0 failed**. `npm run typecheck`: passed.

The geometry tests load actual GLB triangles and decode embedded PNG pixels on the CPU. They check every A family, installed semantic ancestry, identity roots, original source hashes, all four desk solid components over 17 piano positions, all 13 cabinet solids around ten unchanged DSP proxies, tabletop support, floor/rug contact, partial dog-bed proxy rollback and 20 complete piano mechanism cycles. Invalid empty roots, duplicate names, undecoded textures and moved roots are rejected before any source proxy changes or resource ownership transfer. Browser decoding and browser appearance remain the separate root-agent acceptance pass.

Three shape corrections were required by measurements: exact single-vertex soft-cushion poles prevent microscopic cap holes; the dog-bed base stays below its inset pad; newly added sofa feet use local X ±0.72 instead of ±0.78 so the frozen 98° anchor rotation keeps their entire bottom footprint on the lounge rug. Original furniture anchors, bodies and rug dimensions remain unchanged.

The final browser review identified a coincident bed headboard depth plane and beanbag seam dots. The headboard wood core now ends at Z −1.008 while its visible linen panel reaches the original front at −0.98. Twelve independent forward ray samples confirm the fabric is ahead of wood by more than 3 mm. Beanbag seam paths lie outside the formed shell; actual exported seam vertices and triangle centers pass closed-shell parity checks and have more than 0.4 mm nearest-surface clearance. Both assets still pass frozen outer-envelope checks.

The PNGs in this directory are read-only Cycles renders of the final standalone GLBs, used to inspect volume, silhouette, seams, front-face normals and material separation. `render-furniture-review.py` changes only its temporary review scene and writes these images; it never saves or exports model assets. The two rug roots are separated only inside that review scene for visibility.

The shared texture registry lists the original oak source and all nine original 512×512 textile images, including encoded sizes, sRGB interpretation, usage and repeated-image accounting. There are no external models, copied texture pixels or new runtime shader dependencies.

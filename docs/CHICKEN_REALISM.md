# Chicken parmesan revision

The approved chicken study is integrated into the main buffet. The interface,
menu choices and serving controls remain the same.

## Asset

- Hand-authored irregular cutlet, breadcrumb relief, tomato sauce, browned
  mozzarella, parmesan and basil: 42,258 triangles, one baked PBR material.
- Embedded 2048 px color, normal and roughness maps. The three generated input
  images and their exact prompts are in `source/chicken_parmesan/`.
- The horizontal footprint remains 9.792 × 6.5965 cm. The new model is thinner,
  1.889 cm including garnish. Other food models retain their original dimensions.
- The editable Blender source includes packed textures. This is authored
  geometry with synthetic textures, not a photograph or a scan of real food.

## Motion and sauce

`web/src/chicken.js` animates the transfer from the tray, then uses fixed 240 Hz
integration for gravity, damped rocking, bending and compression. Each serving
has its own vertex buffers. Resting portions stop updating geometry. Starting a
new serving settles the previous serving so fast repeated clicks cannot leave
animated portions intersecting one another.

The existing triangle-based placement reserves a stable final position. Actual
chicken vertices are also checked against the plate/meal support grid during
landing. The grid now follows the porcelain rim's actual upper profile. Moving
or removing food recalculates support, and photographs settle all animation
before capture. Saved records retain ordinary portion positions and counts;
transient animation is reconstructed rather than stored.

Thin tomato and amber oil films spread after contact. Their geometry follows
the plate profile, stays within its edge, moves with the portion and is removed
with it. For stacked chicken, the film represents drippings projected onto the
plate underneath. It is excluded from picking and food placement.

These effects approximate cooked-food motion and pooling. They are not a full
soft-body or fluid simulation; juices do not flow around other food or leave
trails after dragging. Placement still uses an approximate 3 mm support grid.

## Rebuild

Requires Blender 5.x:

```sh
blender --background --python tools/build_chicken.py
```

The authoring script writes the editable model, baked maps, GLB and metrics to
`artifacts/chicken-build/` for review. Copy the approved GLB into
`web/assets/food/chicken_parmesan.glb` and update its manifest and source metrics
when replacing it. The original FBX conversion command will overwrite this
revision; retain the approved chicken asset when reconverting the other foods.

## Verification

`tools/test_chicken.py` exercises the actual game, including contact timing,
independent geometry, removal, dragging, stacking, reload and photographs.
`tools/test_pages.py` checks the complete standalone Pages flow with desktop
and mobile emulation. Reports and screenshots are written under `artifacts/`.
These browser checks do not establish performance on physical phones.

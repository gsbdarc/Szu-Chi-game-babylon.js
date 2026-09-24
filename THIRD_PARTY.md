# Provenance and notices

- Except for the revised chicken parmesan, food geometry, albedo/normal/surface textures, menu descriptions, food previews, fonts, and research backend/integration code originate in the supplied `/Users/jeffott/Asta_test` project. The FBX-to-GLB conversion script is included. No food was replaced with a primitive placeholder. Converted sizes and source paths are in `web/assets/food/manifest.json`.
- Chicken parmesan revision: authored Blender geometry with AI-generated breading, mozzarella and tomato color textures, plus procedural surface detail. Source, packed textures and generation prompts are in `source/chicken_parmesan/`; `tools/build_chicken.py` reproduces the asset. The new preview is rendered from the actual model. Bending and sauce films are original runtime code. See `docs/CHICKEN_REALISM.md`.
- Cafeteria geometry is reconstructed in `web/src/world.js` from Asta_test's `CafeteriaEnvironment.cs`. Plate geometry follows `PlateBuilder.cs`. These are code-authored meshes.
- Babylon.js and Babylon.js Loaders **9.11.0**, Apache License 2.0: `web/vendor/license.md`. Official project: https://github.com/BabylonJS/Babylon.js . Vendored bundles were obtained from the corresponding versioned npm packages.
- The prefiltered lighting environment is `environmentSpecular.env`, from https://assets.babylonjs.com/environments/environmentSpecular.env (BabylonJS assets repository, https://github.com/BabylonJS/Assets).
- Inter and Lora font licenses are bundled beside the fonts in `web/assets/fonts/`.
- No runtime network request to an external asset host is required. Runtime requests stay on the application's origin.

Implementation references: Babylon's [model loading documentation](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/importers/loadingFileTypes.md) and [environment lighting documentation](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/materials/using/HDREnvironment.md).

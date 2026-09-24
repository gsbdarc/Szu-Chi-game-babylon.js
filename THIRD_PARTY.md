# Provenance and notices

- Food geometry, albedo/normal/surface textures, menu descriptions, food previews, fonts, and research backend/integration code originate in the supplied `/Users/jeffott/Asta_test` project. The FBX-to-GLB conversion script is included. No food was replaced with a primitive placeholder. Converted sizes and source paths are in `web/assets/food/manifest.json`.
- Cafeteria geometry is reconstructed in `web/src/world.js` from Asta_test's `CafeteriaEnvironment.cs`. Plate geometry follows `PlateBuilder.cs`. These are code-authored meshes.
- Babylon.js and Babylon.js Loaders **9.11.0**, Apache License 2.0: `web/vendor/license.md`. Official project: https://github.com/BabylonJS/Babylon.js . Vendored bundles were obtained from the corresponding versioned npm packages.
- The prefiltered lighting environment is `environmentSpecular.env`, from https://assets.babylonjs.com/environments/environmentSpecular.env (BabylonJS assets repository, https://github.com/BabylonJS/Assets).
- Inter and Lora font licenses are bundled beside the fonts in `web/assets/fonts/`.
- Dela Gothic One (anime theme display face), SIL Open Font License 1.1, https://github.com/syakuzen/DelaGothic via https://github.com/google/fonts . Bundled as a Latin/kana subset, `web/assets/fonts/DelaGothicOne-subset.woff2`, with its license in `DelaGothicOne-OFL.txt`.
- No runtime network request to an external asset host is required. Runtime requests stay on the application's origin.

Implementation references: Babylon's [model loading documentation](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/importers/loadingFileTypes.md) and [environment lighting documentation](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/materials/using/HDREnvironment.md).

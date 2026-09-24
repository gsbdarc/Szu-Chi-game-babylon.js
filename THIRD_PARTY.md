# Provenance and notices

- Food geometry, albedo/normal/surface textures, menu descriptions, food previews, fonts, and research backend/integration code originate in the supplied `/Users/jeffott/Asta_test` project. The FBX-to-GLB conversion script is included. No food was replaced with a primitive placeholder. Converted sizes and source paths are in `web/assets/food/manifest.json`.
- Cafeteria geometry is reconstructed in `web/src/world.js` from Asta_test's `CafeteriaEnvironment.cs`. Plate geometry follows `PlateBuilder.cs`. These are code-authored meshes.
- Babylon.js and Babylon.js Loaders **9.11.0**, Apache License 2.0: `web/vendor/license.md`. Official project: https://github.com/BabylonJS/Babylon.js . Vendored bundles were obtained from the corresponding versioned npm packages.
- The prefiltered lighting environment is `environmentSpecular.env`, from https://assets.babylonjs.com/environments/environmentSpecular.env (BabylonJS assets repository, https://github.com/BabylonJS/Assets).
- Background music is **“Airport Lounge” by Kevin MacLeod** (incompetech.com), licensed under **Creative Commons Attribution 3.0** (https://creativecommons.org/licenses/by/3.0/). Obtained from https://archive.org/download/Incompetech/mp3-royaltyfree/Airport%20Lounge.mp3 . The required credit is shown to participants in the in-app **How to play** dialog.
- Cafeteria room ambience is **“Busy cafeteria environment in university - Ambient” by lastraindrop**, released under **CC0 1.0** (public domain dedication, https://creativecommons.org/publicdomain/zero/1.0/). Obtained from https://freesound.org/people/lastraindrop/sounds/717748 . No attribution is required; it is credited anyway.
- Both beds were trimmed to a loop length, seam-crossfaded, RMS-levelled and re-encoded to AAC by `tools/build_audio.py`, which reproduces them from the upstream URLs. Durations, levels, byte counts and SHA-256 digests are recorded in `web/assets/audio/manifest.json` so the stimulus delivered to every participant can be verified.
- Inter and Lora font licenses are bundled beside the fonts in `web/assets/fonts/`.
- No runtime network request to an external asset host is required. Runtime requests stay on the application's origin.

Implementation references: Babylon's [model loading documentation](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/importers/loadingFileTypes.md) and [environment lighting documentation](https://github.com/BabylonJS/Documentation/blob/master/content/features/featuresDeepDive/materials/using/HDREnvironment.md).

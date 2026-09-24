# The Common Table — Babylon.js

A playable recreation of the Unity game in `../Asta_test`. The browser runs Babylon.js directly: no Unity runtime, build step, npm installation, or external CDN is needed.

## Play online

**[Play The Common Table](https://gsbdarc.github.io/Szu-Chi-game-babylon.js/)**

GitHub hosts this public website. Open it in a modern WebGL browser on a computer or phone; no local server or installation is required. The website remains available when the developer's computer is off.

The GitHub Pages build is a standalone preview with the same foods and controls. It saves meals and photographs in the player's browser and offers downloads. It does **not** upload research records or send survey completion messages. See [GitHub Pages deployment](docs/GITHUB_PAGES.md).

- Browse with the dish arrows or keyboard arrows.
- Click/tap the current dish, use **Add one portion**, press Space, or drag the dish to your plate.
- Open **View plate** to select and drag individual portions. **Undo last** and **Remove selected portion** respect study settings.
- **Photograph** saves a 1024×1024 plate image and offers a PNG download.
- **Review meal → Finish meal** records completion. Check the saving message before closing.

The same URL restores the previous session in that browser, including unfinished portions. After finishing, choose **Start a new meal** to play again. Each player has their own browser session; there is no shared multiplayer state.

## Included

The original 15 foods and textures, converted from the Unity FBX files to GLB at their original scale; a 29 cm porcelain plate; the furnished cafeteria, kitchen, buffet counters, dining furniture and distant diners; guided camera transitions; desktop and touch controls; menus and instructions; sound; configurable conditions; SQLite storage; CSV/JSON exports; screenshot logging; offline queues; refresh recovery; and the Qualtrics/Prolific identity and iframe bridge.

Placement uses the actual food mesh surfaces on a 3 mm grid to find supported positions. Serving is animated; portions rest at their assigned positions. This replaces Unity rigidbody simulation with the assisted placement permitted by the ask list.

## Run the research version locally

For development or the full research version, run this command from the repository directory. Requires Python 3.10+.

```sh
python3 server/buffet_server.py
```

Then open **http://127.0.0.1:8766** on that computer. `127.0.0.1` and `localhost` refer to your own computer. These local addresses work only while the Python server is running there. To start another local session, append `?SESSION_ID=my-next-preview` with a new identifier.

### Local research tools

The following addresses belong to the local Python server:

- [Study settings](http://127.0.0.1:8766/researcher)
- [Survey handoff sandbox](http://127.0.0.1:8766/study/embed-sandbox.html)
- [JSON export](http://127.0.0.1:8766/api/export.json) · [CSV export](http://127.0.0.1:8766/api/export.csv)
- [Research setup and deployment](docs/RESEARCH.md)
- [Requirement mapping and verification](docs/IMPLEMENTATION_STATUS.md)

The original food reference and final study assignments are unresolved in the recovered ask list. This recreation uses Asta_test's menu and settings. The local survey handoff is tested; publishing to an institutional host and validating a real Qualtrics response/Prolific submission require those accounts and study settings.

## Edit and verify

`web/src/` contains ordinary JavaScript modules and CSS. `web/assets/menu.json` is the food catalog. `study/conditions.json` controls study conditions. `web/assets/food/` contains the editable GLB models. Babylon.js **9.11.0**, its GLTF loader, and its environment map are bundled under `web/vendor/`.

```sh
python3 -m unittest discover -s server -p 'test_server.py'
python3 -m venv .venv
.venv/bin/pip install -r tools/test-requirements.txt
.venv/bin/python tools/test_game.py
```

The browser test uses an installed Google Chrome, a temporary profile, a temporary SQLite database, and port 8767. It tests the actual Babylon scene and exported records. `artifacts/verification/report.json` records the result; accompanying PNGs show the tested layouts and plate. Compact test reports and screenshots are bundled in `docs/evidence/`. Physical mobile devices and live external survey accounts are not covered by emulation.

Optional cross-browser checks: `.venv/bin/playwright install webkit firefox`, then `.venv/bin/python tools/test_browsers.py` with the local server running. The Qualtrics snippet contract check is `node study/test_integration.cjs` when Node.js is available.

Reconvert food assets with Blender 4.5+:

```sh
blender --background --factory-startup --python tools/convert_food.py -- /path/to/Asta_test
```

Run `python3 tools/package.py` to create `dist/Asta-Babylon.zip`, excluding databases, credentials, caches and test environments. See `THIRD_PARTY.md` for asset provenance and notices.

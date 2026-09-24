# GitHub Pages

Repository: https://github.com/gsbdarc/Szu-Chi-game-babylon.js

Expected site address after Pages is enabled and deployment succeeds:
https://gsbdarc.github.io/Szu-Chi-game-babylon.js/

## What the hosted preview saves

The preview preserves the game, original food models, appearance, portion controls,
photographs, and completion flow. Meals and photographs are stored in IndexedDB
on the player's device. Refresh restores a session; clearing browser site data
removes it. Download your choices as JSON or use **Download meal and photographs**
to include the PNG images as data URLs. **Start a new meal** opens a fresh session.

There is no central collection, researcher dashboard, screenshot upload, or survey
handoff on this static site. Do not use the Pages preview to collect a participant
study. The complete Python research server remains included; use [RESEARCH.md](RESEARCH.md)
to host it with persistent storage.

## Publishing

GitHub Pages requires a public repository on GitHub Free for organizations.
A private repository requires an eligible paid plan. Repository visibility must
be chosen by its owner before publishing.

1. In repository **Settings → Pages → Build and deployment**, select **GitHub Actions**.
2. Run **Deploy game to GitHub Pages** from the Actions tab.
3. Once enabled, every push to `main` rebuilds and deploys the preview automatically.

The workflow runs the research server tests, generates `_site/`, and publishes
only that directory. Databases, local artifacts, study administration pages,
Python source, and credentials are not part of the website.

## Build and test locally

```sh
python3 tools/build_pages.py
python3 -m http.server 8768 --directory _site
```

Open http://localhost:8768. The build refuses to overwrite an existing `_site/`;
remove that generated directory before rebuilding. All asset paths are relative,
so the same output works under the repository's GitHub Pages URL prefix.

The source `web/src/deployment.js` uses server storage. The build replaces that
file only in `_site/` with local storage mode and the configured conditions from
`study/conditions.json`. Server errors never silently switch a study to local mode.

For a browser test with a temporary static server and the repository URL prefix:

```sh
.venv/bin/python tools/test_pages.py
```

After publication, run the same check against the actual site:

```sh
.venv/bin/python tools/test_pages.py --url https://gsbdarc.github.io/Szu-Chi-game-babylon.js/
```

The test covers all food loading, serving, local restoration, screenshot and JSON
downloads, completion, starting a fresh meal, mobile controls, and the absence of
research API calls. It uses isolated browser storage and synthetic session IDs.

## Verification

[Standalone browser test report](evidence/pages-report.json) records the source
hashes and tested features for the Pages addition. `VERIFICATION.json` records
the earlier research implementation and retains its original source hashes.

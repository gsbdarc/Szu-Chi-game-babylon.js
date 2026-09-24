# Research operation

The [GitHub Pages preview](GITHUB_PAGES.md) saves only on the player's device. The
server collection and survey integration described below require the Python host.

Run `python3 server/buffet_server.py` from the project directory and open http://127.0.0.1:8766. Python 3.10+ includes every backend dependency. SQLite data and PNGs live in `server/data/buffet.sqlite3`; this directory is excluded from distribution packages.

## Study settings and identity

Open `/researcher` to edit condition instructions, included foods/order, screenshots, sound, background music, room ambience, removal, portion limit and overview duration. Saving updates `study/conditions.json`. Existing sessions retain their original settings; new sessions use the revised condition. Defaults `default`, `no_screenshot`, `no_music`, `music_only` and `quiet` are examples, not inferred experimental assignments.

## Cafeteria audio

Two independent looping beds play through separate gain buses, so music can be manipulated without changing the room tone or the interface cues:

| Field | Meaning |
| --- | --- |
| `soundEnabled` | Master gate. `false` builds no audio at all and disables the participant Sound button. |
| `musicEnabled` / `musicVolume` | Background music bed (“Airport Lounge”, CC BY 3.0), gain 0–1. |
| `ambienceEnabled` / `ambienceVolume` | Recorded university-cafeteria room tone (CC0), gain 0–1. |

Both files are trimmed to a five-minute loop with a crossfaded seam and levelled to a fixed RMS (music −20 dBFS, ambience −26 dBFS) so the delivered stimulus is identical across participants; `web/assets/audio/manifest.json` records the SHA-256 of each and `tools/audit_assets.py` verifies them. Regenerate with `python3 tools/build_audio.py`. Playback is reported in `window.buffet.snapshot().audio` and logged as `audio_started` / `audio_failed` events. If a bed cannot be fetched or decoded the ambience falls back to a synthesised room tone rather than going silent, which the `audio_failed` event records; treat affected sessions accordingly.

Background music is a known influence on eating pace and intake, so it is an experimental variable here rather than set dressing. Set it deliberately per condition and keep `buffet_condition` in your survey so it can be modelled.

Example participant URL:

```
https://buffet.example.edu/?PROLIFIC_PID=test-person&STUDY_ID=test-study&SESSION_ID=test-submission&condition=default
```

| URL input | Saved field |
| --- | --- |
| `PROLIFIC_PID` or `participantId` | `participantId` |
| `STUDY_ID` or `studyId` | `studyId` |
| `SESSION_ID` or `sessionId` | `sourceSessionId` |
| `condition` | Configured condition key |
| `parentOrigin` | Exact allowed survey origin for iframe messaging |

The app generates a separate random internal session ID and write credential. Only the credential hash is stored server-side. Exports and survey messages exclude credentials. No login, email or name is requested. Use one browser tab per submission. To make a fresh preview, choose a new `SESSION_ID` value in the URL.

## Measurements and persistence

The schema stays compatible with Asta_test's version 1 research backend. A session contains identifiers, condition/configuration, revision, UTC start/completion timestamps, elapsed seconds, `completed`, `portions[]` and append-only `events[]`. The additional `engine` field identifies this implementation as `babylonjs`.

Each portion has its own `portionId`, `foodId`, `plateId="main"`, and original `addedAt` elapsed time. `position`, `rotation` (yaw, radians) and `tilt` (settle pitch/roll, radians) preserve the plate arrangement across refresh. `tilt` is additive to the version 1 schema; the backend does not require it and older records restore without it. Counts derive from individual portion records, not meshes or clicks. Removing a portion removes its current record but preserves the interaction history. One portion of each selected food increments its count by one.

Elapsed time accumulates from session initialization, including loading, instructions and overview, and freezes at completion. Closing the page excludes closed time; recovery resumes the last saved elapsed value. Client timestamps describe the interaction, while database timestamps record server receipt. For time after starting the buffet, use the `begin` and `complete` event times.

Events: `begin`, `station_view`, `dish_view`, `plate_view`, `dish_information`, `portion_added`, `portion_removed`, `portion_moved`, `review`, `complete`, `screenshot_captured`, `screenshot_saved`, `sound_muted`, `sound_unmuted`, `audio_started`, `audio_failed`. The two audio events carry the bed identifier in `detail`. In `screenshot_saved`, `portionId` carries the image SHA-256, matching the original bridge convention. No nutritional, eating or waste outcomes are inferred.

Snapshots and pending PNGs are saved to IndexedDB before upload. Failed requests retry every three seconds. Full snapshots have increasing revisions; retries of the same revision are idempotent, history cannot shrink and completed contents cannot change. SQLite commits sessions, events and portion records together with FULL synchronization.

The status distinguishes local pending data from server acknowledgement. Survey completion is emitted only after the final revision and every pending image have saved. Refresh restores both incomplete and completed sessions. The recovery download contains the session JSON and pending image data URLs; it can support manual research recovery but is not an automatic import mechanism. Keep the same browser while offline changes await upload.

Screenshots are 1024×1024 PNG plate views without interface overlays. The server deduplicates identical images. Limits are 30 distinct PNGs per session, 8 MiB per upload, and 2 MiB per session JSON snapshot. A screenshot-disabled condition blocks both the UI and screenshot API.

## Export and backup

- `/api/export.json`: all sessions, portions, events, screenshot IDs and server timestamps.
- `/api/export.csv`: one row per session/plate/food, counts, elapsed time, total portions and screenshot count. Empty selections produce a zero-count row.
- `/api/screenshots/INTERNAL_SESSION_ID/IMAGE_SHA256`: stored PNG.

CSV output quotes cells and neutralizes formula-leading text. The participant can download their session JSON. Researcher maintenance commands:

```sh
python3 server/manage.py export-json /path/to/export.json
python3 server/manage.py export-csv /path/to/portions.csv
python3 server/manage.py backup /path/to/backup.sqlite3
```

Backup uses SQLite's live backup API, checks integrity, and refuses to overwrite an existing destination. Screenshots are in the database; a JSON export alone is not an image backup. Restore by stopping the service and using `--db /path/to/backup.sqlite3`.

## Hosting

Serve `web/` and the API from the same HTTPS origin. The bundled Python server serves both; place it behind the institution's TLS reverse proxy and process supervisor with persistent, backed-up database storage. The data directory must remain outside `web/`. Load-test the chosen host for the study's expected concurrency.

Set a random secret of at least 32 characters in `BUFFET_ADMIN_TOKEN` before exposing the service, including through a proxy. The server refuses a public bind without it. Researcher settings, exports and image reads then require `Authorization: Bearer …`. Do not place this token in participant code or the survey.

```sh
python3 server/buffet_server.py --host 0.0.0.0 --port 8766 --allow-origin https://YOUR-BRAND.qualtrics.com
```

Allow exact survey origins. Configure framing headers to permit the intended survey. URL condition selection is not signed: assign and validate study conditions in the survey as needed. This recreation does not invent a production randomization scheme.

## Qualtrics and Prolific

1. Test locally at `/study/embed-sandbox.html`. Complete a meal; the receiving page displays the saved payload and acknowledges it.
2. In your Qualtrics sandbox, add the fields in `study/embedded-data-fields.txt` to an Embedded Data block before the buffet question. Capture incoming `PROLIFIC_PID`, `STUDY_ID`, `SESSION_ID`, and assign `buffet_condition`.
3. Add a Text/Graphic question using `study/qualtrics-question.html`. Paste `study/qualtrics-question.js` into its JavaScript editor and replace `https://buffet.example.edu` with the deployed origin.
4. Allow the exact Qualtrics origin on the server. The snippet supplies `parentOrigin` in the iframe URL. It checks source window, origin, session identity and portion IDs; writes counts, elapsed time, identifiers and a compact JSON payload; then sends `buffet:ack` and enables Next.
5. Finish a known meal in the published survey, submit the whole survey, and export the actual Qualtrics response. Match `buffet_session_id`, food counts, elapsed time and image IDs against the backend. Repeat with zero portions, screenshots disabled, and an interrupted connection.
6. In Prolific, use the published Qualtrics link with its supported URL parameters. Supply the actual new study's completion URL/code only at the end of the survey. Verify the Prolific submission identity matches Qualtrics and the buffet export before recruiting participants.

The game posts `{type:'buffet:complete',schemaVersion:1,session:…}` to its allowed parent origin every three seconds until the matching `{type:'buffet:ack',sessionId,revision}` arrives from that parent. Acknowledgement establishes receiver execution; an exported, submitted Qualtrics response is the evidence of durable external survey storage.

The local handoff and the actual Qualtrics snippet are tested. No external survey, Prolific study, institutional host, participant recruitment or historical approval has been modified or claimed verified. The source ask list leaves the final historical food reference, schema approval and experiment assignments unresolved; this version carries forward Asta_test's concrete choices.

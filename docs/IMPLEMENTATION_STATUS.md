# Recreation audit — September 24, 2026

The requested software recreation is implemented in Babylon.js, using Asta_test's concrete menu, food assets, style, controls and research contracts. `Asta_test` was inspected as the authoritative Unity reference; its files were not edited. The supplied HTML ask list is preserved as `ASK_LIST.md` in readable form.

This audit distinguishes delivered software from historical external approvals and live institutional deployment. The historical food reference, researcher signoff, lost contractor accounts, invoices and recovery requests are contextual evidence in the ask list, not assets or accounts available to this port.

## Feature mapping

| Ask | Current implementation and evidence |
| --- | --- |
| A01, A02 — 15 foods, individual portions | Fourteen source FBX models converted to GLB and one newly authored chicken parmesan, fifteen menu entries. Browser test selects every food and checks unique portion IDs and exact stored counts. |
| A03 — food appearance | Original Asta_test geometry and baked maps retained for fourteen foods. Chicken parmesan uses the approved new cutlet and 2K PBR maps; see `CHICKEN_REALISM.md`. Green kale salad retained. The missing historical Word reference cannot be independently compared; no claim of new researcher approval. `ASSET_AUDIT.json` proves asset presence and texture embedding. |
| A04, A05 — relative portion and plate scale | Fourteen GLBs agree with Unity food metrics within 0.01 mm. Chicken retains its original footprint and has an intentionally thinner 1.889 cm profile, verified against its new source metrics. Baked smoothness is converted to GLTF roughness, preserving ingredient-specific surface finish. The original 29 cm plate profile is recreated. Pizza and burger retain original physical size. `artifacts/verification/plate.png` and browser plate views show relative scale. The 40-portion capacity check verifies a supported full stack and camera framing. |
| A06, A07 — stable, natural assisted placement | Actual triangle surfaces sampled on a 3 mm grid; each portion placed against the current meal/plate surface and constrained to the plate. Food remains attached during navigation; remaining portions settle when a supporting portion moves or is removed. Full run verifies all food extents and stable positions after refresh. Chicken has damped vertex bending and sauce/oil films; serving is animated and resting portions use supported assigned positions. Photographs settle transient motion. Grid discretization is an approximation of contact. |
| A08, B01 — cafeteria and assets | Meter-scale kitchen, serving counters, trays, signage, windows, tables, chairs, plants, equipment, lighting and seated diners reconstructed from Unity's environment builder. Pizza is presented as a whole cut pie, its six 59° wedges reassembled from the authored slice, and the slice is split into crust and topping submeshes so melted cheese reads glossier than baked bread; portions settle at a small lean scaled to each food's height, so flat items do not read as decals. Recorded cafeteria room ambience and openly licensed background music on separate buses, plus serving sounds. `world.js`, overview, station and plate PNGs. |
| A09–A12 — guided navigation and overview | Welcome overview, configured delay, automatic move to first dish, next/previous stations, plate view, no free camera controls. Picking only accepts the current station. Drag cancellation and repeated station visits verified. |
| A13 — dish information and menu | Text labels, current dish card, ingredient/portion dialog and image menu; keyboard and pointer controls. Browser test verifies details and menu navigation. |
| A14, B08 — plate screenshots and user conditions | Dedicated 1024×1024 camera, PNG download, session-linked database images, condition-controlled UI and upload API. Actual screenshots checked in Chromium, WebKit and Firefox. |
| A15, B06, B07 — research data and persistence | Per-portion IDs, per-food counts, timings, event history, URL identities, revisions, immutable completion, SQLite, CSV/JSON exports, recovery. Actual browser payload compared with server export. Fourteen backend tests passed; study documentation defines fields. Historical researcher review is not claimed. |
| A16 — evaluation build | Complete local application plus portable source/runtime ZIP and reproducible tests. All automated local checks passed. Institutional pilot approval is a separate research decision. |
| B02 — hostable multi-user web app | Self-contained browser assets, bundled HTTP/SQLite API, per-session credentials, HTTPS/reverse-proxy instructions. Different browser sessions have distinct records. No institutional host was selected or deployed by this task. |
| B03 — web/mobile and browser evaluation | Full Chromium test at desktop 1440×1000, touch portrait 390×844 and landscape 844×390; rotation, interaction, plate and dialogs checked. WebKit and Firefox completed meals and photographs. These are local automation/emulation results, not physical-device certification. |
| B04 — landing and instructions | Welcome, three-step guide, study-specific instructions and help dialog, responsive HTML interface. |
| B05 — drag and click selection | Real mouse tray click, drag to plate, rejected drop outside plate, independent plate rearrangement and removal tested. A separate Chromium mobile check sends actual touch events to drag from the tray to the plate. |
| B09 — subgroup settings | Existing researcher UI and condition configuration retained. Restricted-condition browser case proves food subset/order, portion limit and disabled screenshot/removal controls. Backend tests verify durable settings edits. Preview links create distinct session IDs so changed settings can be reviewed. |
| B10 — local sandbox and handoff | Runs with Python's included SQLite, no Unity or database installation. Source/runtime package and instructions included. Formal stakeholder signoff remains a human review. |
| C01, C02 — survey iframe and data handoff | Actual Babylon app embedded in local survey sandbox; final data emitted only after database/images save, received and acknowledged. The supplied Qualtrics script passed origin/window, identity, duplicate portion, count and ACK tests. Actual Qualtrics response storage requires a published institutional survey test. |
| C03 — Prolific identities and repeatable setup | PROLIFIC_PID, STUDY_ID and SESSION_ID preserved. Local iframe test verifies identifiers. Setup instructions and embedded-data fields included. No real Prolific study was changed or launched. |
| C04 — small sample review | Original Asta_test foods are reused; the live local game and menu permit review. The historical approval exchange is not repeated or fabricated. |
| C05 — lost/floating plate and repeat-selection defects | Plate parenting, constrained navigation, assisted positioning, repeat visits and stable reload arrangements tested. Full meal screenshots inspect all food types. |

D01–D08 corroborate historical behavior. Applicable navigation, serving, menus, ambient sound, data and image logging are included. Separate dessert plates and dynamic plate resizing remain unresolved historical proposals; Asta_test uses one plate and this port preserves it. Steam and a phone-camera visual treatment are explicitly optional. Name/email collection, login, real-time multiplayer, payments and contractor recovery are not features of the source game being recreated.

## Evidence

The working directory retains the full `artifacts/` tree. The distribution also includes compact reports and representative PNGs under `docs/evidence/`.

- `artifacts/verification/report.json`: full Chromium flow, 15 foods, independent portions, drag/click, counts, reload, configured limits, mobile layouts, offline completion/image recovery and iframe ACK; no JavaScript errors.
- `artifacts/verification/export.json`: corresponding test data, generated with disposable QA identities and database.
- `artifacts/verification/*.png`: actual scene, phone layouts, plate PNG, completion and survey handoff.
- `artifacts/browsers/report.json`: WebKit and Firefox meal completion, 1024×1024 photograph, completed reload preservation; no JavaScript errors.
- `docs/evidence/capture-guard.json`: serving/review/navigation stay disabled during a delayed screenshot save; capture then completes and finalizes durably.
- `artifacts/server-tests.txt`: 14 passing backend tests.
- `artifacts/qualtrics-bridge-tests.txt`: real integration script contract tests.
- `artifacts/final/report.json`: keyboard navigation/serving, overview input guard, fresh researcher previews, real touch drag, full 40-portion capacity, empty-meal completion and final-material rendering.
- `docs/ASSET_AUDIT.json`: 15 GLBs, embedded images, source dimension comparison and bundled dependency hashes.

Recorded frame rate samples are stored in the corresponding reports. WebKit measured approximately 53 FPS and Firefox 75 FPS on this machine. These are observations from automated local sessions, not hardware-wide performance guarantees. Test profiles are temporary; the distributed ZIP excludes all participant databases, environment secrets and Python caches.

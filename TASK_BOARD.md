# 商业空间 AI 头脑风暴工具任务看板

Status legend: `Active`, `Pending`, `Done`

## Phase 0 - Product Alignment

Status: Done

- [x] ~~Confirm MVP scope from product design plan~~
- [x] ~~Freeze JSON schema v0 for project, scheme, case, and Revit import~~
- [x] ~~Define demo dataset requirements: 20-50 seed cases~~
- [x] ~~Confirm output package: PDF, PNG, SVG, DXF, JSON~~

Completion record:

- Date: 2026-06-17
- Agents: Product Design Agent, Backend AI Agent, Geometry Agent, QA Release Agent
- Files: `docs/mvp-scope.md`, `docs/json-schema-v0.md`, `docs/demo-seed-dataset.md`, `docs/export-package-v0.md`, `schemas/*.schema.json`, `samples/schema-examples/*.json`, `scripts/validate_schemas.py`
- Validation: `python3 scripts/validate_schemas.py`
- Result: all four schema examples validated successfully.
- Remaining risks: geometric topology checks such as polygon self-intersection, traffic-weight sum tolerance, and overlay alignment require implementation in Phase 3.

## Phase 1 - Web MVP Foundation

Status: Done

- [x] ~~Scaffold Web app and API project~~
- [x] ~~Add project creation and file upload~~
- [x] ~~Add 2D canvas with locked background plan~~
- [x] ~~Add manual boundary, entrance, column, and back-of-house marking~~
- [x] ~~Persist project JSON and editable scheme JSON~~

Completion record:

- Date: 2026-06-17
- Agents: Frontend Canvas Agent, Backend AI Agent, QA Release Agent
- Files: `package.json`, `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`
- Validation: `curl http://127.0.0.1:4173/api/health`, `curl http://127.0.0.1:4173/api/sample/project`, `python3 scripts/validate_schemas.py`, Browser open at `http://127.0.0.1:4173`
- Result: API returns health/sample project, schema examples validate, desktop and mobile browser routes load.
- Remaining risks: upload persistence, real canvas editing, geometry validation, and AI generation are not implemented yet.

Completion record - project creation and file upload:

- Date: 2026-06-17
- Agents: Frontend Canvas Agent, Backend AI Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`
- Validation: `python3 scripts/validate_schemas.py`, `node --check apps/api/server.mjs && node --check apps/web/app.js`, API smoke test for `/api/health`, `/api/uploads`, `/api/projects`, `/api/projects/:id`, persisted project schema validation, Playwright desktop/mobile UI check at `http://127.0.0.1:4173`
- Result: PNG/PDF upload works, unsupported or missing file data returns `400`, created projects preserve `source.fileId = uploadId`, `.data/projects.json` and `.data/uploads/` persist locally, UI can select a plan image and create a project.
- Remaining risks: local `.data` is a development store rather than production database/object storage; Playwright file upload used a workspace asset due browser test sandbox; real plan recognition and editable geometry are still later Phase 1/3 tasks.

Completion record - 2D canvas with locked background plan:

- Date: 2026-06-17
- Agents: Product Design Agent, Frontend Canvas Agent, Backend AI Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`
- Validation: `node --check apps/api/server.mjs && node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, API smoke test for `GET /api/uploads/:uploadId`, persisted project schema validation, Playwright desktop/mobile UI check at `http://127.0.0.1:4173`
- Result: uploaded PNG sources can be read back into the canvas through `/api/uploads/:uploadId`; the canvas has a locked background layer, overlay layer, zoom in/out, reset, opacity control, wheel zoom, and pan; sample projects fall back to the demo source plan without 404 console noise.
- Remaining risks: PDF preview depends on browser PDF support; DXF/Revit JSON sources are saved but still render as a fallback until the vector/Revit parsing tasks are implemented; boundary/entrance/column marking remains the next Phase 1 task.

Completion record - manual boundary, entrance, column, and back-of-house marking:

- Date: 2026-06-17
- Agents: Product Design Agent, Frontend Canvas Agent, Backend AI Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`
- Validation: `node --check apps/api/server.mjs && node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, API smoke test for `PATCH /api/projects/:projectId`, persisted project schema validation, Playwright desktop/mobile UI marking flow at `http://127.0.0.1:4173`
- Result: users can draw a rectangular design boundary, click entrance markers with traffic weight, click column markers, drag back-of-house regions, render those annotations over the locked plan, and save them into schema-valid Project JSON.
- Remaining risks: boundary/back-of-house drawing is rectangle-first MVP behavior; complex polygons, snapping, undo/redo, layer toggles, and editable scheme JSON persistence remain later tasks.

Completion record - project JSON and editable scheme JSON persistence:

- Date: 2026-06-17
- Agents: Product Design Agent, Frontend Canvas Agent, Backend AI Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`
- Validation: `node --check apps/api/server.mjs && node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, API smoke test for `GET/POST /api/projects/:projectId/schemes` and `GET/PATCH /api/schemes/:schemeId`, persisted project and scheme schema validation, Playwright desktop/mobile scheme JSON create/edit/save/reload flow at `http://127.0.0.1:4173`
- Result: local `.data/projects.json` and `.data/schemes.json` persist schema-valid Project and Scheme JSON; users can create a draft Scheme JSON, edit it in the Web UI, save it, select it from scheme cards, and reload it after refresh.
- Remaining risks: scheme editing is JSON-first in this phase; visual drag editing, undo/redo, AI generation, and geometry validation remain Phase 2/3 work.

## Phase 2 - AI Brainstorming

Status: Done

- [x] ~~Build case library schema and seed import flow~~
- [x] ~~Add embedding/RAG retrieval for similar cases~~
- [x] ~~Add LLM prompt pipeline for 3-8 scheme strategies~~
- [x] ~~Convert strategy output into scheme JSON~~
- [x] ~~Add scheme cards, scoring, and explanation~~

Completion record - case library schema and seed import flow:

- Date: 2026-06-17
- Agents: Product Design Agent, Backend AI Agent, Frontend Canvas Agent, QA Release Agent
- Files: `samples/seed-cases.json`, `scripts/validate_schemas.py`, `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`, `.data/cases.json`
- Validation: `node --check apps/api/server.mjs && node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, API smoke test for `GET /api/cases`, `POST /api/cases/import-seed`, `GET /api/cases/case_seed_001`, stored case schema validation, Playwright desktop/mobile UI check at `http://127.0.0.1:4173`
- Result: local case store imports 20 schema-valid seed cases, supports list/detail/upsert APIs, and the Web AI panel can import, refresh, list, and inspect reference cases.
- Remaining risks: this is still keyword/filter-ready case retrieval, not embeddings/RAG; the seed set is demo-quality and should be replaced or expanded with reviewed real project cases before production use.

Completion record - embedding/RAG retrieval for similar cases:

- Date: 2026-06-17
- Agents: Product Design Agent, Backend AI Agent, Frontend Canvas Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`, `TASK_BOARD.md`
- Validation: `node --check apps/api/server.mjs && node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, API smoke test for `POST /api/cases/retrieve` and `GET /api/projects/:projectId/retrieve-cases`, Playwright desktop/mobile UI check at `http://127.0.0.1:4173`
- Result: current Project JSON and brief can retrieve Top N similar cases using `local_feature_rag_v0`, returning scores, matched signals, reasons, and `referenceCaseIds`; the Web AI panel can trigger retrieval, show scored result cards, and open selected case details.
- Remaining risks: this is a zero-cost local weighted feature/token vector retriever, not a production embedding model or vector database; real embeddings, permission-aware private libraries, and retrieval evaluation metrics remain future work.

Completion record - LLM prompt pipeline for 3-8 scheme strategies:

- Date: 2026-06-17
- Agents: Product Design Agent, Backend AI Agent, Frontend Canvas Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`, `TASK_BOARD.md`, `.data/strategy-runs.json`
- Validation: `node --check apps/api/server.mjs && node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, API smoke test for `POST /api/strategies/generate`, `GET /api/strategy-runs/:runId`, and `POST /api/projects/:projectId/generate-strategies`, Playwright desktop/mobile UI check at `http://127.0.0.1:4173`
- Result: Project JSON, brief, and retrieved reference cases now produce 3-8 strategy drafts through `local_prompt_pipeline_v0`, including prompt messages, response format contract, reference case ids, strategy summaries, rationale, tradeoffs, placement hints, and score bias; the Web AI panel can generate strategies, show draft cards, inspect a strategy, and view the provider-ready prompt.
- Remaining risks: this is a local no-cost prompt pipeline and deterministic strategy draft generator, not a live external LLM call; real provider integration, streaming, prompt evaluation, and human approval flows remain future work.

Completion record - strategy output into scheme JSON:

- Date: 2026-06-17
- Agents: Product Design Agent, Backend AI Agent, Geometry Agent, Frontend Canvas Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`, `TASK_BOARD.md`, `.data/schemes.json`
- Validation: `node --check apps/api/server.mjs`, `node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, generated `.data/schemes.json` validation against `schemas/scheme.schema.json`, API smoke test for `POST /api/strategies/generate`, `POST /api/schemes/from-strategy`, `POST /api/strategies/:runId/schemes`, and `GET /api/schemes/:schemeId`, Playwright browser click flow for generating a strategy, selecting the second strategy, converting to Scheme JSON, checking desktop/mobile overflow, and checking console errors.
- Result: selected strategy drafts now convert into persisted schema-valid Scheme JSON with `origin.source = ai_strategy`, linked run/reference case metadata, 3 generated zones, furniture primitives, main circulation arrow, annotations, scores, and a visible MVP geometry warning; the Web UI can convert the selected strategy and load the generated scheme into the editor and scheme cards.
- Remaining risks: generated geometry is still template-based and intentionally marked `warn`; boundary clipping, furniture collision checks, door clearance, column avoidance, visual scheme overlay rendering, and export-safe geometry remain Phase 3 tasks.

Completion record - scheme cards, scoring, and explanation:

- Date: 2026-06-17
- Agents: Product Design Agent, Frontend Canvas Agent, Backend AI Agent, QA Release Agent
- Files: `apps/web/app.js`, `apps/web/styles.css`, `apps/README.md`, `TASK_BOARD.md`, `.data/schemes.json`
- Validation: `node --check apps/web/app.js`, `node --check apps/api/server.mjs`, `python3 scripts/validate_schemas.py`, generated `.data/schemes.json` validation against `schemas/scheme.schema.json`, Playwright browser flow for generating a strategy, selecting the third strategy, converting it to a Scheme card, checking 5 scoring rows, tags, meta items, warning copy, selected state, desktop/mobile overflow, and console errors.
- Result: scheme cards now show an overall score, five score bars, source/status/validation labels, strategy explanation, concept tags, zone/furniture/reference counts, and the primary validation warning; selecting or converting a scheme updates the JSON editor and card selected state.
- Remaining risks: scoring still uses the strategy `scoreBias` values from the local prompt pipeline rather than measured geometry metrics; real capacity, circulation, collision, and export-readiness scoring remain Phase 3.

## Phase 3 - Geometry And Editing

Status: Done

- [x] ~~Add zone placement and boundary clipping~~
- [x] ~~Add furniture primitives and collision checks~~
- [x] ~~Add door clearance and column avoidance checks~~
- [x] ~~Add edit, undo, redo, and version save~~
- [x] ~~Add SVG, DXF, PNG, PDF, JSON export~~

Completion record - zone placement and boundary clipping:

- Date: 2026-06-17
- Agents: Geometry Agent, Backend AI Agent, Product Design Agent, Frontend Canvas Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/README.md`, `TASK_BOARD.md`, `.data/schemes.json`
- Validation: `node --check apps/api/server.mjs`, `node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, generated `.data/schemes.json` validation against `schemas/scheme.schema.json`, API smoke test with a convex slanted project boundary verifying every generated zone point remains inside the boundary with tolerance, and Playwright browser regression for strategy generation, conversion, scheme card scoring display, desktop/mobile overflow, and console errors.
- Result: strategy-generated zones now pass through convex polygon boundary clipping before persistence; clipped zones update polygon, area, capacity, source (`geometry_engine`), rationale text, and add `boundary_clipping_applied` validation warnings when clipping occurs.
- Remaining risks: clipping assumes a convex confirmed design boundary; concave boundary decomposition, furniture relocation after clipping, collision checks, door clearance, and column avoidance remain upcoming Phase 3 tasks.

Completion record - furniture primitives and collision checks:

- Date: 2026-06-17
- Agents: Geometry Agent, Backend AI Agent, Frontend Canvas Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/README.md`, `TASK_BOARD.md`, `.data/schemes.json`
- Validation: `node --check apps/api/server.mjs`, `node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, generated `.data/schemes.json` validation against `schemas/scheme.schema.json`, API smoke test for `POST /api/geometry/validate-furniture` with a normal generated scheme returning `pass`, a deliberately overlapped furniture pair returning `furniture_overlap`, and Playwright browser regression for strategy generation, conversion, scheme card scoring display, desktop/mobile overflow, and console errors.
- Result: generated schemes now include fitted furniture primitives with axis-aligned size boxes; the backend validates missing zone links, furniture outside its zone polygon, and same-zone furniture overlap or insufficient clearance, and exposes the checks through `POST /api/geometry/validate-furniture`.
- Remaining risks: collision checks are axis-aligned and do not yet account for true rotated geometry, door clearance, column avoidance, or cross-zone circulation conflicts; those remain subsequent Phase 3 tasks.

Completion record - door clearance and column avoidance checks:

- Date: 2026-06-17
- Agents: Geometry Agent, Backend AI Agent, Frontend Canvas Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/README.md`, `TASK_BOARD.md`, `.data/schemes.json`
- Validation: `node --check apps/api/server.mjs`, `node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, generated `.data/schemes.json` validation against `schemas/scheme.schema.json`, API smoke test for `POST /api/geometry/validate-constraints` with a normal generated scheme returning `pass`, a deliberately misplaced furniture pair returning `door_clearance_conflict` and `column_collision`, and Playwright browser regression for strategy generation, conversion, scheme card scoring display, desktop/mobile overflow, and console errors.
- Result: generated schemes now validate entrance clearance boxes and structural column boxes against furniture size boxes; conflicts are emitted as schema-compatible validation issues, and `POST /api/geometry/validate-constraints` exposes the check for later editing workflows.
- Remaining risks: clearance boxes are approximate and based on entrance side, width, and clearance depth; exact swing arcs, emergency egress rules, rotated furniture geometry, and construction-code compliance remain future validation work.

Completion record - edit, undo, redo, and version save:

- Date: 2026-06-17
- Agents: Frontend Canvas Agent, Backend AI Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`, `TASK_BOARD.md`, `.data/scheme-versions.json`
- Validation: `node --check apps/api/server.mjs`, `node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, API smoke test for `POST /api/schemes/:schemeId/versions` and `GET /api/schemes/:schemeId/versions`, schema validation for `.data/schemes.json` and `.data/scheme-versions.json` snapshots, and Playwright browser flow for strategy generation, scheme conversion, JSON editor modification, undo, redo, version save, desktop/mobile overflow, and console errors.
- Result: the Scheme JSON editor now keeps a local undo/redo history, exposes undo/redo/save-version controls, saves schema-valid version snapshots to `.data/scheme-versions.json`, and reports saved version metadata in the result panel.
- Remaining risks: version restore, diff comparison, collaborative editing, and visual canvas object editing are not implemented yet; this is a JSON-editor-first editing workflow.

Completion record - SVG, DXF, PNG, PDF, JSON export:

- Date: 2026-06-17
- Agents: Geometry Agent, Frontend Canvas Agent, Backend AI Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/web/index.html`, `apps/web/styles.css`, `apps/web/app.js`, `apps/README.md`, `TASK_BOARD.md`, `.data/schemes.json`
- Validation: `node --check apps/api/server.mjs`, `node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, schema validation for `.data/schemes.json` and `.data/scheme-versions.json`, API smoke test for `GET /api/schemes/:schemeId/export/json`, `/svg`, `/dxf`, and `/pdf`, checking SVG markup, DXF entities, PDF header, and JSON content, plus Playwright browser validation for export buttons, SVG-to-PNG rasterization, desktop/mobile overflow, and console errors.
- Result: schemes can now be exported as JSON, SVG, DXF, PNG, and summary PDF; SVG/DXF include zones, furniture, arrows, and annotations, PNG is generated client-side from SVG, and PDF exports a lightweight printable summary.
- Remaining risks: PDF is an MVP summary rather than a fully drawn presentation sheet; PNG export depends on browser canvas rasterization; DXF uses simple LWPOLYLINE/TEXT entities and needs downstream CAD compatibility testing before production.

## Phase 4 - Revit JSON Import

Status: Done

- [x] ~~Scaffold Windows C# Revit Add-in~~
- [x] ~~Export walls, doors, windows, columns, rooms, furniture, annotations~~
- [x] ~~Normalize units to mm and view coordinates~~
- [x] ~~Generate installer and `.addin` manifests~~
- [x] ~~Add JSON upload/import into Web project~~

Completion record - scaffold Windows C# Revit Add-in:

- Date: 2026-06-17
- Agents: Revit Export Agent, Backend AI Agent, QA Release Agent
- Files: `revit-addin/README.md`, `revit-addin/manifests/CommercialSpaceAI.RevitExporter.addin.template`, `revit-addin/scripts/build-revit2025.ps1`, `revit-addin/src/CommercialSpaceAI.RevitExporter.Core/*`, `revit-addin/src/CommercialSpaceAI.RevitExporter.Revit2025/*`, `TASK_BOARD.md`
- Validation: file structure inspection with `find revit-addin -type f`, XML parse validation for `.csproj` and `.addin.template` files using Python `xml.etree.ElementTree`; `dotnet --version` was attempted but `dotnet` is not installed in this macOS workspace, and Revit API DLLs require Windows + Revit 2025 for build verification.
- Result: created a staged Windows Revit Add-in scaffold with a Revit-independent Core model/serializer, Revit 2025 application and export command, Ribbon tab registration, local JSON save command, manifest template, and PowerShell publish script.
- Remaining risks: the scaffold exports document/view metadata only; element collectors, unit/view coordinate conversion, installer output, and real Revit build validation remain Phase 4 tasks.

Completion record - export Revit elements:

- Date: 2026-06-17
- Agents: Revit Export Agent, Backend AI Agent, QA Release Agent
- Files: `revit-addin/src/CommercialSpaceAI.RevitExporter.Revit2025/Services/RevitElementCollectorService.cs`, `revit-addin/src/CommercialSpaceAI.RevitExporter.Revit2025/Services/RevitExportService.cs`, `TASK_BOARD.md`
- Validation: file structure inspection, `.csproj` XML parsing, simple brace-balance scan for all C# files, and search for placeholder extractor warnings; build verification remains blocked in this macOS workspace because `dotnet` and Revit API DLLs are not installed.
- Result: Revit 2025 export service now collects walls, structural/architectural columns, doors, windows, rooms, areas, furniture, fixtures, text notes, filled regions, detail lines, and dimensions into schema-shaped element arrays with IDs, Revit IDs, UniqueIds, category/type/family names, basic geometry, and simple parameter snapshots.
- Remaining risks: Revit API compile/runtime behavior must be verified on Windows + Revit 2025; geometry and parameter extraction are first-pass and need real RVT fixture tests.

Completion record - normalize units and view coordinates:

- Date: 2026-06-17
- Agents: Revit Export Agent, Geometry Agent, QA Release Agent
- Files: `revit-addin/src/CommercialSpaceAI.RevitExporter.Revit2025/Services/RevitViewCoordinateService.cs`, `revit-addin/src/CommercialSpaceAI.RevitExporter.Revit2025/Services/RevitElementCollectorService.cs`, `revit-addin/src/CommercialSpaceAI.RevitExporter.Revit2025/Services/RevitExportService.cs`, `revit-addin/README.md`, `TASK_BOARD.md`
- Validation: `.csproj` XML parsing, simple brace-balance scan for all C# files, source search for coordinate conversion references; build verification remains blocked in this macOS workspace because `dotnet` and Revit API DLLs are not installed.
- Result: Revit export now uses a view coordinate context that normalizes Revit feet to millimeters and converts element geometry into view-local canvas coordinates using the active view crop box minimum point as the origin; crop box coordinates are emitted in the Revit Import JSON view metadata.
- Remaining risks: rotation and true view transform handling are currently placeholders (`rotation = 0`, `scale = 1`); real rotated/cropped views need Windows/Revit fixture validation.

Completion record - installer and addin manifests:

- Date: 2026-06-17
- Agents: Revit Export Agent, QA Release Agent
- Files: `revit-addin/manifests/CommercialSpaceAI.RevitExporter.Revit2025.addin`, `revit-addin/manifests/CommercialSpaceAI.RevitExporter.addin.template`, `revit-addin/scripts/build-revit2025.ps1`, `revit-addin/scripts/install-revit2025.ps1`, `revit-addin/scripts/uninstall-revit2025.ps1`, `revit-addin/README.md`, `TASK_BOARD.md`
- Validation: XML parsing for manifest template and Revit 2025 manifest, script structure check for PowerShell files, file structure inspection; Windows execution is not available in this macOS workspace and `pwsh` is not installed.
- Result: added fixed and templated `.addin` manifests, a Revit 2025 publish script, per-user/all-users install script, uninstall script, and README installation instructions.
- Remaining risks: installer scripts need validation on Windows with Revit 2025 installed; no MSI/MSIX installer has been produced yet.

Completion record - JSON upload/import into Web project:

- Date: 2026-06-17
- Agents: Revit Export Agent, Backend AI Agent, Frontend Canvas Agent, QA Release Agent
- Files: `apps/api/server.mjs`, `apps/web/app.js`, `apps/README.md`, `TASK_BOARD.md`, `.data/projects.json`
- Validation: `node --check apps/api/server.mjs`, `node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, API smoke test with `samples/schema-examples/revit-import.example.json` against `POST /api/projects/from-revit-import`, `.data/projects.json` validation against `schemas/project.schema.json`, and Playwright browser regression for recent project display, desktop/mobile overflow, and console errors.
- Result: the Web app can convert Revit Import JSON into Project JSON with `source.type = revit_json`, candidate boundary, fixed elements, candidate entrances, and an explicit next step for user confirmation; `.json` uploads in the project creation flow now route through the Revit import endpoint.
- Remaining risks: the sample import contains no door/column objects, so rich entrance/fixed-element mapping needs real Revit fixture validation; Revit JSON is parsed client-side before upload routing and may need stronger file-size/error UX later.

## Phase 5 - QA, Docs, And PR

Status: Done

- [x] ~~Run UI, API, schema, and export verification~~
- [x] ~~Update README and developer docs~~
- [x] ~~Prepare demo flow and sample data~~
- [x] ~~Open draft PR with verification summary~~

Completion record - final UI, API, schema, and export verification:

- Date: 2026-06-17
- Agents: QA Release Agent, Backend AI Agent, Frontend Canvas Agent, Revit Export Agent
- Files: `TASK_BOARD.md`
- Validation: `node --check apps/api/server.mjs && node --check apps/web/app.js`, `python3 scripts/validate_schemas.py`, schema validation for `.data/projects.json`, `.data/schemes.json`, and `.data/scheme-versions.json`, end-to-end API smoke covering health, Revit JSON import, strategy generation, strategy-to-scheme conversion, furniture validation, door/column constraints validation, and SVG/DXF export, plus Playwright desktop/mobile UI checks and console error inspection.
- Result: final verification passed across API, local data stores, schema examples, export endpoints, and responsive Web UI.
- Remaining risks: Revit Add-in compile/runtime validation and installer execution still require Windows + Revit 2025.

Completion record - README and developer docs:

- Date: 2026-06-17
- Agents: QA Release Agent, Product Design Agent
- Files: `README.md`, `DEVELOPMENT.md`, `TASK_BOARD.md`
- Validation: readback of both docs and search checks for run commands, schema verification command, Revit Add-in references, and scheme export API references.
- Result: added root project README and developer handoff covering architecture, key API groups, local verification commands, Revit Add-in build notes, and known engineering risks.
- Remaining risks: docs should be refreshed after real Windows/Revit validation and after replacing local stores with production services.

Completion record - demo flow and sample data:

- Date: 2026-06-17
- Agents: Product Design Agent, QA Release Agent
- Files: `docs/demo-flow.md`, `samples/demo-briefs.json`, `README.md`, `TASK_BOARD.md`
- Validation: `python3 -m json.tool samples/demo-briefs.json`, document readback, and search checks for run command, Revit Import sample reference, demo brief reference, and Scheme conversion step.
- Result: added a step-by-step demo flow covering case import, manual plan flow, AI strategy generation, Scheme conversion, editing/versioning, exports, and Revit JSON import; added three demo briefs for coffee, retail, and office/lounge scenarios.
- Remaining risks: demo should be refreshed after real customer sample files and real Revit exports are available.

Completion record - draft PR summary:

- Date: 2026-06-17
- Agents: QA Release Agent
- Files: `PR_SUMMARY.md`, `TASK_BOARD.md`
- Validation: `git rev-parse --is-inside-work-tree`, `git status --short`
- Result: generated `PR_SUMMARY.md` with goal, changed files, verification, risks, and follow-ups.
- Remaining risks: draft PR creation is blocked because `/Users/kartz/Development/Revit` is not a Git repository; no branch, commit, push, or GitHub PR could be created from this workspace.

## Phase 6 - Beta Hardening And Real-World Validation

Status: Active

- [x] ~~Generate multi-agent goal runbook and automatic PR protocol~~
- [ ] Build beta fixture validation pack with 10 real or anonymized project types
- [ ] Validate Revit Add-in on Windows with Revit 2025 and document Revit 2026 path
- [ ] Define real LLM/provider adapter decision gate and evaluation harness
- [ ] Add retrieval, geometry, and export quality reports for beta runs
- [ ] Run beta release verification and open/update draft PR

Phase intent:

- Move from demo-complete MVP to beta-ready workflow.
- Keep local deterministic AI behavior as the default until the user explicitly approves provider/API-key changes.
- Prove the Revit JSON path with real Windows/Revit fixtures before APS or installer investment.
- Treat every completed task as PR-ready: verified, documented, committed, pushed, and opened as a draft PR when GitHub access permits.

Completion record - multi-agent goal runbook and automatic PR protocol:

- Date: 2026-06-20
- Agents: Product Design Agent, QA Release Agent
- Files: `agnet.md`, `GOAL_PROMPT.md`, `MULTI_AGENT_IMPLEMENTATION_PLAN.md`, `docs/multi-agent-goal-runbook.md`, `docs/superpowers/plans/2026-06-20-multi-agent-beta-hardening.md`, `TASK_BOARD.md`
- Validation: `rg -n "GOAL_PROMPT|multi-agent-goal-runbook|Phase 6|draft PR|/goal|automatic PR|自动 PR|Auto PR" agnet.md GOAL_PROMPT.md MULTI_AGENT_IMPLEMENTATION_PLAN.md TASK_BOARD.md docs/multi-agent-goal-runbook.md docs/superpowers/plans/2026-06-20-multi-agent-beta-hardening.md`, `git diff --check`, GOAL prompt length check (`2307` characters inside the prompt block)
- Result: added a reusable goal prompt, typo-compatible `agnet.md` launcher, multi-agent runbook, detailed implementation plan, Phase 6 beta hardening task board, and automatic draft PR protocol.
- Remaining risks: automatic PR creation still depends on local GitHub CLI authentication, remote push permission, and GitHub availability; real Windows/Revit and paid provider tasks remain gated follow-ups.

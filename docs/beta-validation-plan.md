# Beta Validation Plan

Date: 2026-06-20

Purpose: prove that the Commercial Space AI MVP works on realistic commercial
space inputs before investing in production storage, paid model providers,
Autodesk APS conversion, or a public Revit Add-in release.

This is a beta hardening plan, not a promise of construction-document accuracy.
The product remains an early-stage test-fit and brainstorming tool.

## Product Positioning Under Test

The beta must validate this promise:

```text
Upload a commercial floor plan, confirm constraints, generate 3-6 editable
function layout options, and export a first discussion package within 15 minutes.
```

The beta must not validate or imply:

- automatic construction drawings;
- code, fire, or approval compliance;
- perfect PNG/PDF semantic recognition;
- complete BIM model generation;
- paid LLM/provider behavior without explicit approval.

## Fixture Matrix

Each fixture must have a short brief, an input source, expected constraints, and
validation evidence. Private customer files must stay outside git unless they are
anonymized and explicitly approved for repository storage.

| ID | Fixture Class | Source Inputs | Required Conditions | Primary Risk Tested |
| --- | --- | --- | --- | --- |
| `beta_01_simple_coffee` | Simple rectangular coffee shop, 80-120 sqm, one street entrance | PNG or PDF plus Project JSON | one entrance, one back-of-house region, no columns | first-run speed and manual boundary confirmation |
| `beta_02_long_retail` | Long narrow retail unit, 120-200 sqm, front entrance and rear service door | PNG/PDF and optional SVG/DXF | long rectangle, front display goal, rear BOH or service area | aisle continuity and display/capacity tradeoff |
| `beta_03_dual_entrance_cafe` | Dual-entrance mall cafe, 150-250 sqm, street and mall traffic weights | PNG/PDF plus Project JSON | two entrances with traffic weights such as 60/40 | weighted entry strategy and scheme differentiation |
| `beta_04_column_grid_showroom` | Column-grid retail showroom, 200-400 sqm, at least six columns | PNG/PDF or DXF plus fixed elements | six or more structural columns | column avoidance and furniture collision checks |
| `beta_05_office_lounge_testfit` | Office/lounge test-fit, 250-500 sqm, meeting and social zones | PNG/PDF plus brief | meeting, focus, social, and support zones | mixed workplace zoning and capacity scoring |
| `beta_06_restaurant_boh` | Restaurant with kitchen/back-of-house, 150-300 sqm | PNG/PDF plus Project JSON | kitchen/BOH fixed zone, public dining, service path | service/public separation and door clearance |
| `beta_07_irregular_popup` | Irregular boundary pop-up store, 60-120 sqm | SVG/DXF preferred, PNG acceptable | non-rectangular or slanted boundary | boundary clipping and user correction workflow |
| `beta_08_revit_export_rich` | Revit sample export with rooms, doors, columns, and furniture | Revit Import JSON exported from RVT | rooms, walls, doors, columns, furniture, text notes, warnings if applicable | Revit-to-Web semantic mapping and traceability |
| `beta_09_noisy_scan_plan` | Noisy PDF/PNG plan that requires manual boundary confirmation | scanned PDF or low-quality PNG | visible scale ambiguity or noisy annotations | manual correction fallback and user trust |
| `beta_10_export_compatibility` | Export compatibility sample for SVG, DXF, PNG, PDF, and JSON | any schema-valid generated Scheme JSON | zones, furniture, arrows, annotations, validation warnings | downstream openability and stable IDs across exports |

## Fixture Package Requirements

Every fixture should include as many of these artifacts as privacy allows:

- `brief.md`: business type, goals, required zones, constraints, target output count.
- `source/`: sanitized PNG, PDF, SVG, DXF, or external pointer to private storage.
- `project.json`: schema-valid Project JSON after manual or Revit import confirmation.
- `expected-cases.md`: what a good retrieval result should match.
- `validation-notes.md`: expected warnings, known ambiguities, and acceptance notes.
- `exports/`: generated JSON, SVG, DXF, PNG, and PDF outputs when available.
- `evidence/`: screenshots or notes proving the fixture was run through the app.

Real customer source files must be anonymized before repository storage. When a
source cannot be stored, the fixture may include only metadata plus a private
storage pointer without credentials.

## Beta Run Protocol

For each fixture:

1. Create or load the project.
2. Upload the source plan or Revit Import JSON.
3. Confirm boundary, entrances, traffic weights, columns, BOH, and other fixed elements.
4. Import or refresh seed cases.
5. Retrieve similar cases and record the top matches.
6. Generate 3-6 strategy options with the current local pipeline.
7. Convert at least one selected strategy into Scheme JSON.
8. Run geometry validation for furniture, door clearance, and column avoidance.
9. Save a version snapshot after one manual edit.
10. Export JSON, SVG, DXF, PNG, and PDF where supported.
11. Record whether a designer would continue editing the result.

## Acceptance Metrics

### Product Value

- First generated scheme set appears within 60 seconds for normal-size fixtures.
- A first discussion package can be exported within 15 minutes.
- At least one scheme per fixture is worth continuing to edit.
- Strategy cards are meaningfully different, not superficial copies.
- Users understand warnings and know what must be manually corrected.

### Retrieval Quality

- Top retrieved cases share business type, size band, shape, entrance pattern, or
  layout pattern with the fixture.
- Retrieval reasons explain matched signals in plain language.
- Poor retrieval matches are recorded as evaluation failures, not hidden.

### Geometry Quality

- Generated zones stay inside the confirmed boundary.
- Furniture stays linked to zones and avoids obvious overlap.
- Door clearance and column conflicts appear as validation issues.
- Irregular or concave boundary limitations are recorded clearly.

### Export Quality

- JSON validates against the current schema.
- SVG opens and preserves zones, furniture, arrows, annotations, and IDs.
- DXF opens in at least one downstream CAD viewer before production claims.
- PNG rasterization does not crop key content.
- PDF communicates the strategy and warnings, even if it remains an MVP summary sheet.

### Revit Import Quality

- Revit Import JSON keeps `revitElementId` or `uniqueId` where available.
- Walls, doors, columns, rooms, furniture, text notes, filled regions, and view
  metadata are preserved when present.
- Candidate entrances and BOH hints are marked as candidates, not final truth.
- Export warnings are visible and actionable.

## Privacy And Security Rules

- Do not commit customer names, addresses, project paths, usernames, tokens, API
  keys, or private storage credentials.
- Prefer synthetic names such as `beta_03_dual_entrance_cafe`.
- Strip title blocks, logos, owner names, coordinates, and site addresses from
  screenshots before committing.
- Keep raw RVT, DWG, and customer PDFs outside git unless written approval allows
  anonymized storage.
- Record the anonymization method in `validation-notes.md`.

## Roles

- Product Design Agent: confirms fixture classes, user goals, and value acceptance.
- Backend AI Agent: checks Project/Case/Scheme JSON and retrieval behavior.
- Geometry Agent: checks boundary, collisions, door clearance, column avoidance, and export semantics.
- Revit Export Agent: checks Revit Import JSON fixture coverage and Windows validation handoff.
- QA Release Agent: owns run evidence, task board updates, and PR readiness.

## Go / No-Go Gates

Move to the provider adapter and deeper beta release work only when:

- at least 8 of 10 fixture classes have runnable sanitized artifacts or private
  evidence pointers;
- schema validation passes for committed JSON artifacts;
- every fixture has a recorded expected warning profile;
- Revit fixture requirements are clear enough for Windows/Revit validation;
- export compatibility failures are tracked rather than ignored.

Do not move to APS, paid provider calls, production deployment, or enterprise
permissions as part of this fixture task.

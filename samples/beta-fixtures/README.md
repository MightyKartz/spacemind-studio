# Beta Fixtures

This directory is the intake point for real or anonymized beta validation
fixtures. It supports Phase 6 of the Commercial Space AI task board.

Do not place private customer source files here unless they have been anonymized
and approved for repository storage.

## Directory Layout

Use one folder per fixture:

```text
samples/beta-fixtures/
  beta_01_simple_coffee/
    brief.md
    project.json
    expected-cases.md
    validation-notes.md
    source/
    exports/
    evidence/
```

If a source plan, RVT, DWG, or PDF must stay private, leave `source/` empty and
write a non-secret pointer in `validation-notes.md`, for example:

```text
Private source stored in customer-approved secure drive.
Repository contains only anonymized Project JSON and run evidence.
```

## Fixture Classes

The beta validation pack tracks these 10 fixture classes:

| ID | Fixture Class | Minimum Repository Artifact |
| --- | --- | --- |
| `beta_01_simple_coffee` | Simple rectangular coffee shop, 80-120 sqm, one street entrance | `brief.md` and schema-valid `project.json` |
| `beta_02_long_retail` | Long narrow retail unit, 120-200 sqm, front entrance and rear service door | `brief.md` and schema-valid `project.json` |
| `beta_03_dual_entrance_cafe` | Dual-entrance mall cafe, 150-250 sqm, street and mall traffic weights | `brief.md` and schema-valid `project.json` |
| `beta_04_column_grid_showroom` | Column-grid retail showroom, 200-400 sqm, at least six columns | `brief.md` and fixed-element evidence |
| `beta_05_office_lounge_testfit` | Office/lounge test-fit, 250-500 sqm, meeting and social zones | `brief.md` and expected zones |
| `beta_06_restaurant_boh` | Restaurant with kitchen/back-of-house, 150-300 sqm | `brief.md` and BOH constraints |
| `beta_07_irregular_popup` | Irregular boundary pop-up store, 60-120 sqm | boundary evidence or Project JSON |
| `beta_08_revit_export_rich` | Revit sample export with rooms, doors, columns, and furniture | schema-valid Revit Import JSON when available |
| `beta_09_noisy_scan_plan` | Noisy PDF/PNG plan that requires manual boundary confirmation | anonymized screenshot or private pointer |
| `beta_10_export_compatibility` | Export compatibility sample for SVG, DXF, PNG, PDF, and JSON | generated Scheme JSON and export evidence |

## Required Files

Each fixture should include:

- `brief.md`: business type, target user, goals, fixed constraints, and desired option count.
- `project.json`: Project JSON after boundary, entrance, BOH, and fixed-element confirmation.
- `expected-cases.md`: what similar cases should match and why.
- `validation-notes.md`: anonymization notes, expected warnings, pass/fail results, and private source pointer if needed.

Add these only when available and safe:

- `source/`: anonymized PNG, PDF, SVG, DXF, or Revit Import JSON source.
- `exports/`: generated JSON, SVG, DXF, PNG, and PDF.
- `evidence/`: screenshots, console-free browser notes, CAD viewer notes, or Revit export logs.

## Privacy Checklist

Before committing any fixture artifact:

- Remove client names, site names, addresses, title blocks, logos, and coordinates.
- Remove local usernames, project paths, machine names, and storage URLs with tokens.
- Do not commit raw RVT, DWG, or customer PDFs unless they are explicitly approved.
- Do not commit API keys, bearer tokens, upload credentials, or private links.
- Record what was anonymized in `validation-notes.md`.

## Validation Checklist

For every committed fixture:

1. Run `python3 scripts/validate_schemas.py`.
2. If fixture JSON is not covered by the schema script yet, validate it manually
   against `schemas/project.schema.json`, `schemas/scheme.schema.json`, or
   `schemas/revit-import.schema.json`.
3. Confirm the fixture has expected warnings documented.
4. Confirm any export evidence opens in the target viewer before claiming compatibility.
5. Update `docs/beta-validation-plan.md` or the task board if the fixture exposes
   a new beta risk.

## Intake Status

Initial status: no real customer beta fixtures are committed yet.

The first beta pass is complete only when at least 8 of the 10 fixture classes
have runnable sanitized artifacts or private evidence pointers, and all committed
JSON artifacts validate.

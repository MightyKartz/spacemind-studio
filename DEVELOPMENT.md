# Development Handoff

## Architecture

The MVP intentionally uses a small native Node server instead of a framework:

- API routes and local persistence live in `apps/api/server.mjs`.
- Static UI assets live in `apps/web/`.
- JSON contracts live in `schemas/`.
- Local development data is stored in `.data/*.json`.
- Revit Add-in scaffold lives in `revit-addin/`.

## Main API Groups

- Project/upload: `/api/uploads`, `/api/projects`, `/api/projects/from-revit-import`
- Cases/RAG: `/api/cases`, `/api/cases/import-seed`, `/api/cases/retrieve`
- Strategies: `/api/strategies/generate`, `/api/strategy-runs/:runId`
- Schemes: `/api/projects/:projectId/schemes`, `/api/schemes/:schemeId`
- Geometry validation: `/api/geometry/validate-furniture`, `/api/geometry/validate-constraints`
- Export: `/api/schemes/:schemeId/export/:format`

## Local Verification Checklist

```bash
node --check apps/api/server.mjs && node --check apps/web/app.js
python3 scripts/validate_schemas.py
```

Optional store validation:

```bash
python3 - <<'PY'
import json
from pathlib import Path
from jsonschema import Draft202012Validator
root = Path('.')
checks = [
    ('project', 'schemas/project.schema.json', '.data/projects.json', 'projects', None),
    ('scheme', 'schemas/scheme.schema.json', '.data/schemes.json', 'schemes', None),
    ('scheme version', 'schemas/scheme.schema.json', '.data/scheme-versions.json', 'versions', 'scheme'),
]
for label, schema_path, data_path, key, nested in checks:
    path = root / data_path
    if not path.exists():
        continue
    validator = Draft202012Validator(json.loads((root / schema_path).read_text()))
    for item in json.loads(path.read_text()).get(key, []):
        value = item[nested] if nested else item
        errors = list(validator.iter_errors(value))
        if errors:
            raise SystemExit(f'{label} validation failed: {errors[0].message}')
    print(f'OK {label}')
PY
```

## Revit Add-in Notes

The Revit project is scaffolded for Revit 2025:

```powershell
$env:REVIT_2025_DIR = "C:\Program Files\Autodesk\Revit 2025"
.\revit-addin\scripts\build-revit2025.ps1
.\revit-addin\scripts\install-revit2025.ps1
```

This macOS workspace cannot compile the Add-in because `dotnet` and Revit API DLLs are unavailable.

## Next Engineering Risks

- Replace local stores with database/object storage.
- Add real LLM provider adapter, streaming, and prompt evaluation.
- Validate Revit extraction on real RVT fixtures.
- Upgrade PDF export from summary PDF to full presentation sheet.
- Add version restore/diff and visual canvas object editing.

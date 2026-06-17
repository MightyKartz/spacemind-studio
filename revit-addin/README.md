# Commercial Space AI Revit Exporter

Windows C# Revit Add-in scaffold for exporting Revit floor-plan data into the `revit-import.schema.json` shape used by the Commercial Space AI brainstorming tool.

## Target

- Revit 2025 first (`net8.0-windows`)
- Local JSON export first
- Later adapters can target Revit 2024, Revit 2026, or Autodesk APS Design Automation

## Structure

```text
revit-addin/
  manifests/
    CommercialSpaceAI.RevitExporter.addin.template
  scripts/
    build-revit2025.ps1
  src/
    CommercialSpaceAI.RevitExporter.Core/
    CommercialSpaceAI.RevitExporter.Revit2025/
```

## Windows Build

Set the Revit install directory if it differs from the default:

```powershell
$env:REVIT_2025_DIR = "C:\Program Files\Autodesk\Revit 2025"
.\scripts\build-revit2025.ps1
```

The build script publishes binaries to:

```text
revit-addin/artifacts/Revit2025/
```

Copy the generated `.addin` file to:

```text
C:\ProgramData\Autodesk\Revit\Addins\2025\
```

Then restart Revit and open the `商业空间 AI` ribbon tab.

Or install the published artifacts for the current Windows user:

```powershell
.\scripts\install-revit2025.ps1
```

Install for all users from an elevated PowerShell prompt:

```powershell
.\scripts\install-revit2025.ps1 -AllUsers
```

Uninstall:

```powershell
.\scripts\uninstall-revit2025.ps1
```

## MVP Scope

The first command creates a schema-shaped JSON file containing:

- document and view metadata
- unit normalized to `mm`
- view-local coordinates using the Revit view crop box minimum point as the current canvas origin
- required element arrays for walls, columns, doors, windows, rooms, furniture, notes, filled regions, and detail lines
- warnings for unsupported or not-yet-implemented extractors

Element-level extraction is intentionally staged in later tasks so the schema and installer path can stabilize first.

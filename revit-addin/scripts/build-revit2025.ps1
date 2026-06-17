$ErrorActionPreference = "Stop"

$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
$Project = Join-Path $Root "src\CommercialSpaceAI.RevitExporter.Revit2025\CommercialSpaceAI.RevitExporter.Revit2025.csproj"
$Artifacts = Join-Path $Root "artifacts\Revit2025"
$ManifestTemplate = Join-Path $Root "manifests\CommercialSpaceAI.RevitExporter.addin.template"
$ManifestOutput = Join-Path $Artifacts "CommercialSpaceAI.RevitExporter.addin"

if (-not $env:REVIT_2025_DIR) {
  $env:REVIT_2025_DIR = "C:\Program Files\Autodesk\Revit 2025"
}

New-Item -ItemType Directory -Force -Path $Artifacts | Out-Null

dotnet publish $Project -c Release -o $Artifacts /p:RevitInstallDir="$env:REVIT_2025_DIR"

(Get-Content $ManifestTemplate) `
  -replace "{{INSTALL_DIR}}", ($Artifacts -replace "\\", "\\") |
  Set-Content -Encoding UTF8 $ManifestOutput

Write-Host "Published Revit 2025 add-in to $Artifacts"
Write-Host "Copy $ManifestOutput to C:\ProgramData\Autodesk\Revit\Addins\2025\"

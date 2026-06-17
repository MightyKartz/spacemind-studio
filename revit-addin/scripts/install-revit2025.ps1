param(
  [switch]$AllUsers,
  [string]$SourceDir = "",
  [string]$InstallDir = "C:\Program Files\CommercialSpaceAI\RevitExporter"
)

$ErrorActionPreference = "Stop"
$Root = Split-Path -Parent (Split-Path -Parent $MyInvocation.MyCommand.Path)
if (-not $SourceDir) {
  $SourceDir = Join-Path $Root "artifacts\Revit2025"
}

if (-not (Test-Path $SourceDir)) {
  throw "SourceDir not found: $SourceDir. Run scripts\build-revit2025.ps1 first."
}

$AddinsDir = if ($AllUsers) {
  "C:\ProgramData\Autodesk\Revit\Addins\2025"
} else {
  Join-Path $env:APPDATA "Autodesk\Revit\Addins\2025"
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $AddinsDir | Out-Null

Copy-Item -Path (Join-Path $SourceDir "*") -Destination $InstallDir -Recurse -Force

$Template = Join-Path $Root "manifests\CommercialSpaceAI.RevitExporter.addin.template"
$Manifest = Join-Path $AddinsDir "CommercialSpaceAI.RevitExporter.addin"
(Get-Content $Template) `
  -replace "{{INSTALL_DIR}}", ($InstallDir -replace "\\", "\\") |
  Set-Content -Encoding UTF8 $Manifest

Write-Host "Installed Commercial Space AI Revit Exporter"
Write-Host "Binaries: $InstallDir"
Write-Host "Manifest: $Manifest"
Write-Host "Restart Revit 2025 to load the add-in."

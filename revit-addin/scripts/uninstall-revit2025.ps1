param(
  [switch]$AllUsers,
  [switch]$RemoveBinaries,
  [string]$InstallDir = "C:\Program Files\CommercialSpaceAI\RevitExporter"
)

$ErrorActionPreference = "Stop"
$AddinsDir = if ($AllUsers) {
  "C:\ProgramData\Autodesk\Revit\Addins\2025"
} else {
  Join-Path $env:APPDATA "Autodesk\Revit\Addins\2025"
}

$Manifest = Join-Path $AddinsDir "CommercialSpaceAI.RevitExporter.addin"
if (Test-Path $Manifest) {
  Remove-Item $Manifest -Force
  Write-Host "Removed manifest: $Manifest"
}

if ($RemoveBinaries -and (Test-Path $InstallDir)) {
  Remove-Item $InstallDir -Recurse -Force
  Write-Host "Removed binaries: $InstallDir"
}

Write-Host "Uninstall complete. Restart Revit 2025 if it is running."

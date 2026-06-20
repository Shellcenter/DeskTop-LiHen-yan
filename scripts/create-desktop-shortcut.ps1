param(
  [switch]$BuildIfMissing
)

$ErrorActionPreference = "Stop"
$InstallDir = Join-Path $env:LOCALAPPDATA "DesktopPet"
$InstalledExe = Join-Path $InstallDir "DesktopPet.exe"

if (Test-Path -LiteralPath $InstalledExe) {
  & (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "install-desktop-pet.ps1") -SkipBuild
  exit 0
}

if ($BuildIfMissing) {
  & (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "install-desktop-pet.ps1")
  exit 0
}

Write-Host "请先运行：npm run install:app"

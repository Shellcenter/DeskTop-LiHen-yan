param(
  [switch]$SkipBuild,
  [switch]$ForceRebuild
)

$ErrorActionPreference = "Stop"
$ProjectRoot = (Resolve-Path (Join-Path $PSScriptRoot "..")).Path
$InstallDir = Join-Path $env:LOCALAPPDATA "DesktopPet"
$InstalledExe = Join-Path $InstallDir "DesktopPet.exe"
$InstalledIcon = Join-Path $InstallDir "icon.ico"
$SilentLauncher = Join-Path $InstallDir "LaunchDesktopPet.vbs"
$IconSrc = Join-Path $ProjectRoot "src-tauri\icons\icon.ico"
$SilentLauncherSrc = Join-Path $ProjectRoot "scripts\launch-silent.vbs"

function Find-BuiltExe {
  $releaseDir = Join-Path $ProjectRoot "src-tauri\target\release"
  $candidates = @()

  if (Test-Path -LiteralPath $releaseDir) {
    Get-ChildItem -LiteralPath $releaseDir -Filter "*.exe" | ForEach-Object {
      if ($_.Name -notmatch 'build-script|installer|setup|wix|light') {
        $candidates += $_.FullName
      }
    }
  }

  $preferred = Join-Path $releaseDir "desktop-pet.exe"
  if (Test-Path -LiteralPath $preferred) {
    return $preferred
  }

  foreach ($path in ($candidates | Select-Object -Unique)) {
    if (Test-Path -LiteralPath $path) { return $path }
  }
  return $null
}

function New-AppShortcut {
  param(
    [string]$ShortcutPath,
    [string]$TargetPath,
    [string]$WorkingDirectory,
    [string]$IconPath
  )

  $parent = Split-Path -Parent $ShortcutPath
  if ($parent -and -not (Test-Path -LiteralPath $parent)) {
    New-Item -ItemType Directory -Force -Path $parent | Out-Null
  }

  $shell = New-Object -ComObject WScript.Shell
  $shortcut = $shell.CreateShortcut($ShortcutPath)
  $shortcut.TargetPath = $TargetPath
  $shortcut.WorkingDirectory = $WorkingDirectory
  $shortcut.WindowStyle = 1
  $shortcut.Description = "离恨烟桌宠"
  if ($IconPath -and (Test-Path -LiteralPath $IconPath)) {
    $shortcut.IconLocation = "$IconPath,0"
  }
  $shortcut.Save()
}

$builtExe = Find-BuiltExe
$needBuild = (-not $SkipBuild) -and ($ForceRebuild -or -not $builtExe)

if ($needBuild) {
  Write-Host "正在构建发布版（首次构建可能需要几分钟）..."
  Push-Location $ProjectRoot
  npm run build:exe
  Pop-Location
  $builtExe = Find-BuiltExe
}

if (-not $builtExe) {
  throw "未找到发布版 exe，构建可能失败。"
}

New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
Copy-Item -LiteralPath $builtExe -Destination $InstalledExe -Force
if (Test-Path -LiteralPath $IconSrc) {
  Copy-Item -LiteralPath $IconSrc -Destination $InstalledIcon -Force
}
if (Test-Path -LiteralPath $SilentLauncherSrc) {
  Copy-Item -LiteralPath $SilentLauncherSrc -Destination $SilentLauncher -Force
}

$desktopShortcut = Join-Path ([Environment]::GetFolderPath("Desktop")) "离恨烟桌宠.lnk"
$startMenuDir = Join-Path ([Environment]::GetFolderPath("Programs")) "离恨烟桌宠"
$startMenuShortcut = Join-Path $startMenuDir "离恨烟桌宠.lnk"

New-AppShortcut -ShortcutPath $desktopShortcut -TargetPath $InstalledExe -WorkingDirectory $InstallDir -IconPath $InstalledIcon
New-AppShortcut -ShortcutPath $startMenuShortcut -TargetPath $InstalledExe -WorkingDirectory $InstallDir -IconPath $InstalledIcon

$versionInfo = @(
  "installed_at=$(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')",
  "source=$builtExe"
) -join "`n"
Set-Content -Path (Join-Path $InstallDir "install-info.txt") -Value $versionInfo -Encoding UTF8

Write-Host ""
Write-Host "安装完成。"
Write-Host "安装位置：$InstalledExe"
Write-Host "桌面快捷方式：$desktopShortcut"
Write-Host ""
Write-Host "以后双击桌面上的“离恨烟桌宠”即可启动。"
Write-Host "只有修改项目代码后，才需要重新运行安装。"

param(
  [string]$Source
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$SourceDir = Join-Path $ProjectRoot "assets\source"
$PublicCharacterDir = Join-Path $ProjectRoot "public\character"
$IconDir = Join-Path $ProjectRoot "src-tauri\icons"
$ReferencePath = Join-Path $SourceDir "reference.png"
$IdlePath = Join-Path $PublicCharacterDir "idle.png"
$IconSourcePath = Join-Path $ProjectRoot "assets\icon-source.png"

New-Item -ItemType Directory -Force -Path $SourceDir, $PublicCharacterDir, $IconDir | Out-Null

if ([string]::IsNullOrWhiteSpace($Source)) {
  $Source = $ReferencePath
}

if (!(Test-Path -LiteralPath $Source)) {
  throw "未找到源图片：$Source。请传入 -Source <图片路径>，或把默认图片放到 assets\source\reference.png。"
}

$ResolvedSource = (Resolve-Path -LiteralPath $Source).Path
if ($ResolvedSource -ne $ReferencePath) {
  Copy-Item -LiteralPath $ResolvedSource -Destination $ReferencePath -Force
}

Add-Type -AssemblyName System.Drawing

function Test-IsBackgroundPixel {
  param([System.Drawing.Color]$Color)

  $max = [Math]::Max($Color.R, [Math]::Max($Color.G, $Color.B))
  $min = [Math]::Min($Color.R, [Math]::Min($Color.G, $Color.B))
  $nearWhite = $Color.R -ge 238 -and $Color.G -ge 238 -and $Color.B -ge 238
  $lowSaturation = ($max - $min) -le 18

  return $nearWhite -and $lowSaturation
}

function Remove-EdgeBackground {
  param([System.Drawing.Bitmap]$Bitmap)

  $width = $Bitmap.Width
  $height = $Bitmap.Height
  $visited = New-Object "bool[,]" $width, $height
  $queue = New-Object System.Collections.Generic.Queue[object]

  function Add-Point {
    param([int]$X, [int]$Y)

    if ($X -lt 0 -or $Y -lt 0 -or $X -ge $width -or $Y -ge $height) { return }
    if ($visited[$X, $Y]) { return }

    $color = $Bitmap.GetPixel($X, $Y)
    if (!(Test-IsBackgroundPixel $color)) { return }

    $visited[$X, $Y] = $true
    $queue.Enqueue(@($X, $Y))
  }

  for ($x = 0; $x -lt $width; $x++) {
    Add-Point $x 0
    Add-Point $x ($height - 1)
  }

  for ($y = 0; $y -lt $height; $y++) {
    Add-Point 0 $y
    Add-Point ($width - 1) $y
  }

  while ($queue.Count -gt 0) {
    $point = $queue.Dequeue()
    $x = [int]$point[0]
    $y = [int]$point[1]

    $Bitmap.SetPixel($x, $y, [System.Drawing.Color]::FromArgb(0, 255, 255, 255))

    Add-Point ($x + 1) $y
    Add-Point ($x - 1) $y
    Add-Point $x ($y + 1)
    Add-Point $x ($y - 1)
  }

  return $Bitmap
}

function Save-ContainedPng {
  param(
    [System.Drawing.Bitmap]$SourceBitmap,
    [string]$Destination,
    [int]$CanvasSize,
    [double]$PaddingRatio
  )

  $canvas = New-Object System.Drawing.Bitmap $CanvasSize, $CanvasSize, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($canvas)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
  $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
  $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
  $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

  $maxSize = [int]($CanvasSize * (1 - $PaddingRatio * 2))
  $scale = [Math]::Min($maxSize / $SourceBitmap.Width, $maxSize / $SourceBitmap.Height)
  $drawWidth = [int]($SourceBitmap.Width * $scale)
  $drawHeight = [int]($SourceBitmap.Height * $scale)
  $x = [int](($CanvasSize - $drawWidth) / 2)
  $y = [int](($CanvasSize - $drawHeight) / 2)

  $graphics.DrawImage($SourceBitmap, $x, $y, $drawWidth, $drawHeight)
  $canvas.Save($Destination, [System.Drawing.Imaging.ImageFormat]::Png)

  $graphics.Dispose()
  $canvas.Dispose()
}

$sourceImage = [System.Drawing.Image]::FromFile($ReferencePath)
$bitmap = New-Object System.Drawing.Bitmap $sourceImage
$sourceImage.Dispose()

$transparent = Remove-EdgeBackground $bitmap

Save-ContainedPng -SourceBitmap $transparent -Destination $IdlePath -CanvasSize 1024 -PaddingRatio 0.04
Save-ContainedPng -SourceBitmap $transparent -Destination $IconSourcePath -CanvasSize 1024 -PaddingRatio 0.12

$transparent.Dispose()

npx tauri icon "$IconSourcePath"

Write-Host "已保存项目源图：$ReferencePath"
Write-Host "已保存桌宠图片：$IdlePath"
Write-Host "已保存图标源图：$IconSourcePath"

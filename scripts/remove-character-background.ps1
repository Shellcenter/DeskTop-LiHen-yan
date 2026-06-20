param(
  [string]$CharacterDir = (Join-Path (Resolve-Path (Join-Path $PSScriptRoot "..")) "public\character"),
  [int]$DarkThreshold = 28,
  [int]$LightThreshold = 238
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if (!(Test-Path -LiteralPath $CharacterDir)) {
  throw "目录不存在: $CharacterDir"
}

function Test-IsBackground {
  param([byte]$R, [byte]$G, [byte]$B, [byte]$A)

  if ($A -lt 8) { return $true }

  $max = [Math]::Max($R, [Math]::Max($G, $B))
  $min = [Math]::Min($R, [Math]::Min($G, $B))
  $nearBlack = $max -le $DarkThreshold
  $nearWhite = $R -ge $LightThreshold -and $G -ge $LightThreshold -and $B -ge $LightThreshold -and ($max - $min) -le 18

  return $nearBlack -or $nearWhite
}

function Remove-EdgeBackgroundFast {
  param([System.Drawing.Bitmap]$Bitmap)

  $width = $Bitmap.Width
  $height = $Bitmap.Height
  $rect = New-Object System.Drawing.Rectangle 0, 0, $width, $height
  $data = $Bitmap.LockBits($rect, [System.Drawing.Imaging.ImageLockMode]::ReadWrite, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $stride = $data.Stride
  $bytes = New-Object byte[] ($stride * $height)
  [System.Runtime.InteropServices.Marshal]::Copy($data.Scan0, $bytes, 0, $bytes.Length)

  $visited = New-Object bool[] ($width * $height)
  $queue = New-Object System.Collections.Generic.Queue[int]

  function Get-Index {
    param([int]$X, [int]$Y)
    return ($Y * $width) + $X
  }

  function Get-Pixel {
    param([int]$X, [int]$Y)
    $offset = ($Y * $stride) + ($X * 4)
    return @{
      B = $bytes[$offset]
      G = $bytes[$offset + 1]
      R = $bytes[$offset + 2]
      A = $bytes[$offset + 3]
    }
  }

  function Set-Transparent {
    param([int]$X, [int]$Y)
    $offset = ($Y * $stride) + ($X * 4)
    $bytes[$offset] = 0
    $bytes[$offset + 1] = 0
    $bytes[$offset + 2] = 0
    $bytes[$offset + 3] = 0
  }

  function Enqueue-IfBackground {
    param([int]$X, [int]$Y)

    if ($X -lt 0 -or $Y -lt 0 -or $X -ge $width -or $Y -ge $height) { return }
    $idx = Get-Index $X $Y
    if ($visited[$idx]) { return }

    $pixel = Get-Pixel $X $Y
    if (!(Test-IsBackground $pixel.R $pixel.G $pixel.B $pixel.A)) { return }

    $visited[$idx] = $true
    $queue.Enqueue($idx)
  }

  for ($x = 0; $x -lt $width; $x++) {
    Enqueue-IfBackground $x 0
    Enqueue-IfBackground $x ($height - 1)
  }
  for ($y = 0; $y -lt $height; $y++) {
    Enqueue-IfBackground 0 $y
    Enqueue-IfBackground ($width - 1) $y
  }

  while ($queue.Count -gt 0) {
    $idx = $queue.Dequeue()
    $x = $idx % $width
    $y = [int][Math]::Floor($idx / $width)
    Set-Transparent $x $y

    Enqueue-IfBackground ($x + 1) $y
    Enqueue-IfBackground ($x - 1) $y
    Enqueue-IfBackground $x ($y + 1)
    Enqueue-IfBackground $x ($y - 1)
  }

  [System.Runtime.InteropServices.Marshal]::Copy($bytes, 0, $data.Scan0, $bytes.Length)
  $Bitmap.UnlockBits($data)
}

$files = Get-ChildItem -LiteralPath $CharacterDir -File | Where-Object {
  $_.Extension -match '^\.(png|jpg|jpeg|webp)$' -and -not $_.Name.StartsWith('_')
}

if ($files.Count -eq 0) {
  throw "未找到图片: $CharacterDir"
}

$backupDir = Join-Path $CharacterDir "_original"
New-Item -ItemType Directory -Force -Path $backupDir | Out-Null

foreach ($file in $files) {
  $backupPath = Join-Path $backupDir $file.Name
  if (!(Test-Path -LiteralPath $backupPath)) {
    Copy-Item -LiteralPath $file.FullName -Destination $backupPath -Force
  }

  $sourceImage = [System.Drawing.Image]::FromFile($file.FullName)
  $bitmap = New-Object System.Drawing.Bitmap $sourceImage.Width, $sourceImage.Height, ([System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
  $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
  $graphics.Clear([System.Drawing.Color]::Transparent)
  $graphics.DrawImage($sourceImage, 0, 0, $sourceImage.Width, $sourceImage.Height)
  $graphics.Dispose()
  $sourceImage.Dispose()

  Remove-EdgeBackgroundFast $bitmap
  $bitmap.Save($file.FullName, [System.Drawing.Imaging.ImageFormat]::Png)
  $bitmap.Dispose()

  Write-Host "已去背景: $($file.Name)"
}

Write-Host "完成。原图备份在: $backupDir"

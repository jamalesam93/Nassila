Add-Type -AssemblyName System.Drawing
$path = Join-Path (Split-Path $PSScriptRoot -Parent) 'build\icon.png'
New-Item -ItemType Directory -Force -Path (Split-Path $path -Parent) | Out-Null
$bmp = New-Object System.Drawing.Bitmap 256, 256
$g = [System.Drawing.Graphics]::FromImage($bmp)
$g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::AntiAlias
$g.Clear([System.Drawing.Color]::FromArgb(255, 37, 99, 235))
$brush = New-Object System.Drawing.SolidBrush ([System.Drawing.Color]::White)
$font = New-Object System.Drawing.Font('Arial', [single]96.0, [System.Drawing.FontStyle]::Bold, [System.Drawing.GraphicsUnit]::Pixel)
$g.DrawString('R', $font, $brush, 72, 64)
$g.Dispose()
$font.Dispose()
$brush.Dispose()
$bmp.Save($path, [System.Drawing.Imaging.ImageFormat]::Png)
$bmp.Dispose()
Write-Host "Wrote $path"

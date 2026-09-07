Add-Type -AssemblyName System.Drawing

$srcPath = "$PSScriptRoot\..\docs\play-assets\icon-513.png"
$src = [System.Drawing.Bitmap]::FromFile($srcPath)

function Resize-Image {
    param(
        [System.Drawing.Image]$Image,
        [int]$Width,
        [int]$Height,
        [bool]$IsRound = $false
    )
    $dest = New-Object System.Drawing.Bitmap($Width, $Height, [System.Drawing.Imaging.PixelFormat]::Format32bppArgb)
    $g = [System.Drawing.Graphics]::FromImage($dest)
    $g.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
    $g.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::HighQuality
    $g.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
    $g.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality

    if ($IsRound) {
        $path = New-Object System.Drawing.Drawing2D.GraphicsPath
        $path.AddEllipse(0, 0, $Width, $Height)
        $g.SetClip($path)
    }

    $g.DrawImage($Image, 0, 0, $Width, $Height)
    $g.Dispose()
    return $dest
}

# 1. assets/icon.png (1024x1024)
$icon1024 = Resize-Image -Image $src -Width 1024 -Height 1024
$icon1024.Save("$PSScriptRoot\..\apps\mobile\assets\icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon1024.Save("$PSScriptRoot\..\apps\mobile\assets\adaptive-icon.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon1024.Dispose()
Write-Host "Generated apps/mobile/assets/icon.png and adaptive-icon.png (1024x1024)"

# 2. docs/play-assets/icon-512.png (512x512)
$icon512 = Resize-Image -Image $src -Width 512 -Height 512
$icon512.Save("$PSScriptRoot\..\docs\play-assets\icon-512.png", [System.Drawing.Imaging.ImageFormat]::Png)
$icon512.Dispose()
Write-Host "Generated docs/play-assets/icon-512.png (512x512)"

# 3. Android mipmap densities
$densities = @(
    @{ Name = "mipmap-mdpi"; Size = 108 },
    @{ Name = "mipmap-hdpi"; Size = 162 },
    @{ Name = "mipmap-xhdpi"; Size = 216 },
    @{ Name = "mipmap-xxhdpi"; Size = 324 },
    @{ Name = "mipmap-xxxhdpi"; Size = 432 }
)

foreach ($d in $densities) {
    $dir = "$PSScriptRoot\..\apps\mobile\android\app\src\main\res\$($d.Name)"
    if (-not (Test-Path $dir)) {
        New-Item -ItemType Directory -Force -Path $dir | Out-Null
    }

    # ic_launcher.png
    $launcher = Resize-Image -Image $src -Width $d.Size -Height $d.Size -IsRound $false
    $launcher.Save("$dir\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $launcher.Dispose()

    # ic_launcher_round.png
    $round = Resize-Image -Image $src -Width $d.Size -Height $d.Size -IsRound $true
    $round.Save("$dir\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $round.Dispose()

    # ic_launcher_foreground.png
    $fg = Resize-Image -Image $src -Width $d.Size -Height $d.Size -IsRound $false
    $fg.Save("$dir\ic_launcher_foreground.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $fg.Dispose()

    Write-Host "Generated $dir (Size: $($d.Size)x$($d.Size))"
}

$src.Dispose()
Write-Host "All Android launcher icons generated successfully."

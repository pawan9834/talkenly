param (
    [string]$inputPath,
    [string]$outputPath
)

Add-Type -AssemblyName System.Drawing

# Load original image
$original = [System.Drawing.Image]::FromFile($inputPath)

# Calculate new size (scale down to 60%)
$scale = 0.6
$newWidth = [math]::Round($original.Width * $scale)
$newHeight = [math]::Round($original.Height * $scale)

# Create a new blank 1024x1024 Bitmap with transparent background
$canvas = New-Object System.Drawing.Bitmap(1024, 1024)
$graphics = [System.Drawing.Graphics]::FromImage($canvas)
$graphics.Clear([System.Drawing.Color]::Transparent)
$graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic

# Calculate X and Y to center the scaled image
$x = [math]::Round((1024 - $newWidth) / 2)
$y = [math]::Round((1024 - $newHeight) / 2)

# Draw scaled image onto canvas
$graphics.DrawImage($original, $x, $y, $newWidth, $newHeight)

# Save to output
$canvas.Save($outputPath, [System.Drawing.Imaging.ImageFormat]::Png)

# Cleanup
$graphics.Dispose()
$original.Dispose()
$canvas.Dispose()

Write-Output "Successfully padded and resized image to $outputPath"

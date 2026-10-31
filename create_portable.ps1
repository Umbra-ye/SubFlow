$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $baseDir) { $baseDir = "E:\杂乱项目gemini\SubConverter-Extended" }

$desktopRoot = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$folderName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvd+iuoumYhea1gQ=="))
$desktopDir = Join-Path $desktopRoot $folderName
if (-not (Test-Path $desktopDir)) {
    New-Item -ItemType Directory -Path $desktopDir -Force | Out-Null
}

$tempZipDir = Join-Path $env:TEMP "SubFlow-v1.0-Portable"
if (Test-Path $tempZipDir) {
    Remove-Item $tempZipDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $tempZipDir -Force | Out-Null

# 1. Copy binaries and libs
Copy-Item (Join-Path $baseDir "SubFlow.exe") $tempZipDir -Force
Copy-Item (Join-Path $baseDir "WebView2Loader.dll") $tempZipDir -Force
Copy-Item (Join-Path $baseDir "Microsoft.Web.WebView2.WinForms.dll") $tempZipDir -Force
Copy-Item (Join-Path $baseDir "Microsoft.Web.WebView2.Core.dll") $tempZipDir -Force
Copy-Item (Join-Path $baseDir "app.ico") $tempZipDir -Force
Copy-Item (Join-Path $baseDir "gateway_config.example.json") (Join-Path $tempZipDir "gateway_config.json") -Force -ErrorAction SilentlyContinue

# 2. Copy web assets
$webDest = Join-Path $tempZipDir "web"
New-Item -ItemType Directory -Path $webDest -Force | Out-Null
Copy-Item (Join-Path $baseDir "web\index.html") $webDest -Force
Copy-Item (Join-Path $baseDir "web\qrcode.min.js") $webDest -Force

# 3. Copy linux kit
$linuxDest = Join-Path $tempZipDir "linux"
New-Item -ItemType Directory -Path $linuxDest -Force | Out-Null
Copy-Item (Join-Path $baseDir "linux\*") $linuxDest -Recurse -Force

# 4. Copy bin (cloudflared)
$binDest = Join-Path $tempZipDir "bin"
New-Item -ItemType Directory -Path $binDest -Force | Out-Null
if (Test-Path (Join-Path $baseDir "bin\cloudflared.exe")) {
    Copy-Item (Join-Path $baseDir "bin\cloudflared.exe") $binDest -Force
}

# 5. Copy runtimes
$rtDest = Join-Path $tempZipDir "runtimes\win-x64\native"
New-Item -ItemType Directory -Path $rtDest -Force | Out-Null
if (Test-Path (Join-Path $baseDir "runtimes\win-x64\native\WebView2Loader.dll")) {
    Copy-Item (Join-Path $baseDir "runtimes\win-x64\native\WebView2Loader.dll") $rtDest -Force
}

# 6. Copy readme
$readmeDestName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("5L2/55So6K+05piOLnR4dA=="))
if (Test-Path (Join-Path $baseDir "readme.txt")) {
    Copy-Item (Join-Path $baseDir "readme.txt") (Join-Path $tempZipDir $readmeDestName) -Force
}

# 7. Compress to zip
$zipName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvdy12MS4wLeS+v+aQuueJiC56aXA="))
$zipOut = Join-Path $desktopDir $zipName
if (Test-Path $zipOut) {
    Remove-Item $zipOut -Force -ErrorAction SilentlyContinue
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempZipDir, $zipOut, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Remove-Item $tempZipDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Portable package created successfully at: $zipOut"
Get-Item $zipOut | Select-Object Name, Length, LastWriteTime

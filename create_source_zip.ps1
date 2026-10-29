$baseDir = Split-Path -Parent $MyInvocation.MyCommand.Definition
if (-not $baseDir) { $baseDir = "E:\杂乱项目gemini\SubConverter-Extended" }

$desktopRoot = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$folderName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvd+iuoumYhea1gQ=="))
$desktopDir = Join-Path $desktopRoot $folderName
if (-not (Test-Path $desktopDir)) {
    New-Item -ItemType Directory -Path $desktopDir -Force | Out-Null
}

$tempSrcDir = Join-Path $env:TEMP "SubFlow-v1.0-SourceBackup"
if (Test-Path $tempSrcDir) {
    Remove-Item $tempSrcDir -Recurse -Force -ErrorAction SilentlyContinue
}
New-Item -ItemType Directory -Path $tempSrcDir -Force | Out-Null

# 1. Copy source files
Copy-Item (Join-Path $baseDir "SubConverterApp.cs") $tempSrcDir -Force
Copy-Item (Join-Path $baseDir "compile.ps1") $tempSrcDir -Force
Copy-Item (Join-Path $baseDir "README.md") $tempSrcDir -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $baseDir "LICENSE") $tempSrcDir -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $baseDir ".gitignore") $tempSrcDir -Force -ErrorAction SilentlyContinue
Copy-Item (Join-Path $baseDir "app.ico") $tempSrcDir -Force
Copy-Item (Join-Path $baseDir "gateway_config.example.json") $tempSrcDir -Force -ErrorAction SilentlyContinue

# 2. Copy web assets
$webDest = Join-Path $tempSrcDir "web"
New-Item -ItemType Directory -Path $webDest -Force | Out-Null
Copy-Item (Join-Path $baseDir "web\index.html") $webDest -Force
Copy-Item (Join-Path $baseDir "web\qrcode.min.js") $webDest -Force

# 3. Copy linux kit
$linuxDest = Join-Path $tempSrcDir "linux"
New-Item -ItemType Directory -Path $linuxDest -Force | Out-Null
Copy-Item (Join-Path $baseDir "linux\*") $linuxDest -Recurse -Force

# 4. Copy native_libs
$libDest = Join-Path $tempSrcDir "native_libs"
New-Item -ItemType Directory -Path $libDest -Force | Out-Null
Get-ChildItem (Join-Path $baseDir "native_libs") | Copy-Item -Destination $libDest -Force

# 5. Copy readme
$readmeDestName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("5L2/55So6K+05piOLnR4dA=="))
if (Test-Path (Join-Path $baseDir "readme.txt")) {
    Copy-Item (Join-Path $baseDir "readme.txt") (Join-Path $tempSrcDir $readmeDestName) -Force
}

# 6. Compress to source zip
$srcZipName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvdy12MS4wLea6kOeggeWkh+S7vS56aXA="))
$srcZipOut = Join-Path $desktopDir $srcZipName
if (Test-Path $srcZipOut) {
    Remove-Item $srcZipOut -Force -ErrorAction SilentlyContinue
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempSrcDir, $srcZipOut, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Remove-Item $tempSrcDir -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Source code backup created successfully at: $srcZipOut"
Get-Item $srcZipOut | Select-Object Name, Length, LastWriteTime

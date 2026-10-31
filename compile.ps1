$csc = "C:\Windows\Microsoft.NET\Framework64\v4.0.30319\csc.exe"
$baseDir = $PSScriptRoot
$libsDir = Join-Path $baseDir "native_libs"
$outExe = Join-Path $baseDir "SubFlow.exe"
$src = Join-Path $baseDir "SubConverterApp.cs"

Push-Location $baseDir
try {
    # Ensure runtimes structure exists
    $runtimeDir = Join-Path $baseDir "runtimes\win-x64\native"
    if (-not (Test-Path $runtimeDir)) { New-Item -ItemType Directory -Path $runtimeDir -Force | Out-Null }
    if (-not (Test-Path (Join-Path $runtimeDir "WebView2Loader.dll"))) { Copy-Item (Join-Path $libsDir "WebView2Loader.dll") $runtimeDir -Force -ErrorAction SilentlyContinue }
    if (-not (Test-Path (Join-Path $baseDir "WebView2Loader.dll"))) { Copy-Item (Join-Path $libsDir "WebView2Loader.dll") $baseDir -Force -ErrorAction SilentlyContinue }
    if (-not (Test-Path (Join-Path $baseDir "Microsoft.Web.WebView2.WinForms.dll"))) { Copy-Item (Join-Path $libsDir "Microsoft.Web.WebView2.WinForms.dll") $baseDir -Force -ErrorAction SilentlyContinue }
    if (-not (Test-Path (Join-Path $baseDir "Microsoft.Web.WebView2.Core.dll"))) { Copy-Item (Join-Path $libsDir "Microsoft.Web.WebView2.Core.dll") $baseDir -Force -ErrorAction SilentlyContinue }

    Write-Host "Compiling native SubFlow.exe..."
    & $csc /target:winexe /platform:x64 /optimize+ /win32icon:app.ico /codepage:65001 /out:SubFlow.exe "/reference:System.dll" "/reference:System.Drawing.dll" "/reference:System.Windows.Forms.dll" "/reference:System.Core.dll" "/reference:native_libs\Microsoft.Web.WebView2.WinForms.dll" "/reference:native_libs\Microsoft.Web.WebView2.Core.dll" SubConverterApp.cs
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "Compilation SUCCESSFUL: SubFlow.exe"
        Get-Item "SubFlow.exe" | Select-Object Name, Length, LastWriteTime
    } else {
        Write-Error "Compilation FAILED with code $LASTEXITCODE"
    }
} finally {
    Pop-Location
}

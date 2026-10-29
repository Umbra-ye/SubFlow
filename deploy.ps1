$cnSuffix = [string][char]0x8BA2 + [char]0x9605 + [char]0x8F6C + [char]0x6362 + [char]0x5668
$desktopDir = Join-Path $env:USERPROFILE ("Desktop\SubConverter" + $cnSuffix)

if (-not (Test-Path $desktopDir)) {
    New-Item -ItemType Directory -Path $desktopDir -Force | Out-Null
}

$oldFiles = Get-ChildItem -Path $desktopDir -ErrorAction SilentlyContinue
if ($oldFiles) {
    foreach ($f in $oldFiles) {
        if ($f.Extension -eq ".exe") {
            Remove-Item $f.FullName -Force -ErrorAction SilentlyContinue
        }
    }
}

$baseDir = "E:\" + [char]0x6742 + [char]0x4E71 + [char]0x9879 + [char]0x76EE + "gemini\SubConverter-Extended"
$targetExe = Join-Path $baseDir "SubConverter.exe"
$icoPath = Join-Path $baseDir "app.ico"

$wsh = New-Object -ComObject WScript.Shell
$lnkPath = Join-Path $desktopDir ("SubConverter 2026 " + $cnSuffix + ".lnk")
$shortcut = $wsh.CreateShortcut($lnkPath)
$shortcut.TargetPath = $targetExe
$shortcut.WorkingDirectory = $baseDir
$shortcut.IconLocation = "$icoPath,0"
$shortcut.Description = "SubConverter 2026 Liquid Glass"
$shortcut.Save()

Write-Host "Created shortcut successfully:"
Get-ChildItem -Path $desktopDir | Select-Object Name, Length, LastWriteTime

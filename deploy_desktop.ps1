$desktopRoot = [System.Environment]::GetFolderPath([System.Environment+SpecialFolder]::Desktop)
$folderName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvd+iuoumYhea1gQ=="))
$desktopDir = Join-Path $desktopRoot $folderName
if (-not (Test-Path $desktopDir)) {
    New-Item -ItemType Directory -Path $desktopDir -Force | Out-Null
}

$portableFolderName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvdy12MS4wLeS+v+aQuueJiA=="))
$portableFolder = Join-Path $desktopDir $portableFolderName
$zipName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvdy12MS4wLeS+v+aQuueJiC56aXA="))
$zipPath = Join-Path $desktopDir $zipName

# Clean legacy 2026 zip and folders if present
Get-ChildItem -Path $desktopDir -Filter "*2026*" -ErrorAction SilentlyContinue | Remove-Item -Recurse -Force -ErrorAction SilentlyContinue

# Extract portable zip
if (Test-Path $zipPath) {
    if (Test-Path $portableFolder) {
        Remove-Item $portableFolder -Recurse -Force -ErrorAction SilentlyContinue
    }
    Add-Type -AssemblyName System.IO.Compression.FileSystem
    [System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $portableFolder)
    Write-Host "Unpacked portable folder to: $portableFolder"
}

$portableExe = Join-Path $portableFolder "SubFlow.exe"
$portableIco = Join-Path $portableFolder "app.ico"

# 1. Create shortcuts
$wsh = New-Object -ComObject WScript.Shell
$lnkName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvdyDorqLpmIXmtYEubG5r"))
$desc = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("U3ViRmxvdyDorqLpmIXmtYE="))

# Shortcut in folder
$lnkPath = Join-Path $desktopDir $lnkName
$shortcut = $wsh.CreateShortcut($lnkPath)
$shortcut.TargetPath = $portableExe
$shortcut.WorkingDirectory = $portableFolder
$shortcut.IconLocation = $portableIco + ",0"
$shortcut.Description = $desc
$shortcut.Save()

# Shortcut on desktop root
$rootLnkPath = Join-Path $desktopRoot $lnkName
$rootShortcut = $wsh.CreateShortcut($rootLnkPath)
$rootShortcut.TargetPath = $portableExe
$rootShortcut.WorkingDirectory = $portableFolder
$rootShortcut.IconLocation = $portableIco + ",0"
$rootShortcut.Description = $desc
$rootShortcut.Save()

# 2. Bat helper
$batName = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String("5ZCv5YqoU3ViRmxvdy5iYXQ="))
$batPath = Join-Path $desktopDir $batName
$batContent = "@echo off`r`ncd /d ""%~dp0" + $portableFolderName + """`r`nstart """" SubFlow.exe"
[System.IO.File]::WriteAllText($batPath, $batContent, [System.Text.Encoding]::Default)

Write-Host "Desktop deployment completed successfully!"
Get-ChildItem -LiteralPath $desktopDir | Select-Object Name, Length, LastWriteTime

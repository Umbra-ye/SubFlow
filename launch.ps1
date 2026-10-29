$baseDir = $PSScriptRoot
$psi = New-Object System.Diagnostics.ProcessStartInfo
$psi.FileName = Join-Path $baseDir "SubConverter.exe"
$psi.WorkingDirectory = $baseDir
$psi.UseShellExecute = $true

$proc = [System.Diagnostics.Process]::Start($psi)
Write-Host "Started SubConverter with PID:" $proc.Id

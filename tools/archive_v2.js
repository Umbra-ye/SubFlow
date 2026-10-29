const fs = require('fs');
const path = require('path');
const cp = require('child_process');

const base = 'E:\\杂乱项目gemini\\SubConverter-Extended';
const archives = path.join(base, 'archives');
if (!fs.existsSync(archives)) {
  fs.mkdirSync(archives, { recursive: true });
}

const zipOut = path.join(archives, 'SubFlow_v2.0_20261029_CloudAlpha.zip');
console.log('Compressing V2.0 Cloud Alpha archive to:', zipOut);

const destB64 = Buffer.from(zipOut, 'utf8').toString('base64');
const baseB64 = Buffer.from(base, 'utf8').toString('base64');

const psScript = `
Add-Type -AssemblyName System.IO.Compression.FileSystem
$dest = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${destB64}'))
$base = [System.Text.Encoding]::UTF8.GetString([System.Convert]::FromBase64String('${baseB64}'))
$tempDir = Join-Path $env:TEMP ('subflow_v2_' + [System.Guid]::NewGuid().ToString('N'))
New-Item -ItemType Directory -Path $tempDir -Force | Out-Null
Get-ChildItem -LiteralPath $base -Exclude 'archives', '*.log', 'temp_*' | ForEach-Object {
    Copy-Item -LiteralPath $_.FullName -Destination $tempDir -Recurse -Force
}
if (Test-Path -LiteralPath $dest) { Remove-Item -LiteralPath $dest -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($tempDir, $dest)
Remove-Item -LiteralPath $tempDir -Recurse -Force
`;

const psPath = path.join(__dirname, 'temp_archive.ps1');
fs.writeFileSync(psPath, psScript, 'utf8');

cp.execSync('powershell -ExecutionPolicy Bypass -File "' + psPath + '"');
if (fs.existsSync(psPath)) fs.unlinkSync(psPath);

if (fs.existsSync(zipOut)) {
  const stat = fs.statSync(zipOut);
  console.log('✓ V2.0 Cloud Alpha backup SUCCESS! File size:', (stat.size / 1024 / 1024).toFixed(2), 'MB');
} else {
  console.error('Failed to create zipOut');
}

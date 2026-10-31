# Windows 个人客户端一键下载与启动脚本
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   正在一键获取 SubFlow Desktop 本地桌面客户端   " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

$destDir = "$HOME\SubFlow"
if (-not (Test-Path $destDir)) { New-Item -ItemType Directory -Path $destDir | Out-Null }

$exeUrl = "https://raw.githubusercontent.com/Umbra-ye/SubFlow/main/desktop-client/SubFlow.exe"
$destExe = "$destDir\SubFlow.exe"

Write-Host "[1/2] 正在拉取 SubFlow.exe 客户端程序..." -ForegroundColor Yellow
Invoke-WebRequest -Uri $exeUrl -OutFile $destExe

Write-Host "[2/2] 启动 SubFlow 桌面端..." -ForegroundColor Green
Start-Process -FilePath $destExe -WorkingDirectory $destDir

Write-Host "🎉 SubFlow 桌面客户端已启动！随开即用，0 门禁、0 注册。" -ForegroundColor Green

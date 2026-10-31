# Windows 云服务器一键安装与启动脚本
$ProgressPreference = 'SilentlyContinue'
$ErrorActionPreference = 'Stop'

Write-Host "=================================================" -ForegroundColor Cyan
Write-Host "   SubFlow Cloud Server (Windows Server 一键启动) " -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

# 检查 Python
try {
    $pyVer = python --version 2>&1
    Write-Host "[1/3] Python 环境正常: $pyVer" -ForegroundColor Green
} catch {
    Write-Host "[错误] 未检测到 Python，请先在 Windows Server 上安装 Python 3.8+ 并添加至环境变量！" -ForegroundColor Red
    Exit 1
}

# 安装依赖
Write-Host "[2/3] 正在检查依赖 (Flask / requests / pbkdf2)..." -ForegroundColor Yellow
pip install --quiet flask requests pbkdf2

# 启动服务
Write-Host "[3/3] 正在启动云端服务器网关..." -ForegroundColor Green
Write-Host "用户前台: http://127.0.0.1:25588/" -ForegroundColor Cyan
Write-Host "运维后台: http://127.0.0.1:25588/admin (初始管理员: admin)" -ForegroundColor Cyan
Write-Host "=================================================" -ForegroundColor Cyan

python gateway.py --port 25588 --server

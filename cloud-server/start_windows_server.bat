@echo off
chcp 65001 >nul
title SubFlow Cloud Server (Windows Server Edition)

echo ===================================================
echo   SubFlow 云端多用户服务器 (Windows Server 运行中)
echo ===================================================
echo.
echo [1/2] 正在检查 Python 运行环境...
python --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [错误] 未检测到 Python，请先安装 Python 3.8+ 并勾选 Add to PATH。
    pause
    exit /b
)

echo [2/2] 正在启动云端服务器网关 (端口 25588)...
echo.
echo - 用户前台地址: http://您的服务器公网IP:25588/
echo - 运维管理后台: http://您的服务器公网IP:25588/admin (初始账号: admin)
echo.
echo 服务正在后台稳定运行，请勿关闭本窗口...
echo ===================================================

python gateway.py --port 25588 --server
pause

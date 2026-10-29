@echo off
chcp 65001 >nul
title SubFlow - 纯净开源版 GitHub 一键直传
cd /d "%~dp0"
echo ====================================================
echo   SubFlow 订阅流 · 纯净开源版 GitHub 一键直传
echo   已启用强制数据安全隔离门禁（0 个人订阅 / 0 专属域名）
echo ====================================================
echo.
C:\Users\74185\miniconda3\python.exe tools\push_to_github.py %*
pause

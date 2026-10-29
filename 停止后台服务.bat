@echo off
title Stop SubConverter Service
cd /d "%~dp0"
tasklist /fi "imagename eq subconverter.exe" 2>nul | findstr /i "subconverter.exe" >nul
if errorlevel 1 goto not_running

taskkill /f /im subconverter.exe >nul 2>&1
echo SubConverter service stopped.
ping 127.0.0.1 -n 2 >nul
exit

:not_running
echo SubConverter is not running.
ping 127.0.0.1 -n 2 >nul
exit
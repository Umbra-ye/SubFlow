@echo off
title SubConverter-Extended
cd /d "%~dp0"
set SUBCONVERTER_SKIP_AUTO_UPDATE=1
set SUBCONVERTER_UPDATE_VALIDATION=1

tasklist /fi "imagename eq subconverter.exe" 2>nul | findstr /i "subconverter.exe" >nul
if not errorlevel 1 goto open_ui

echo Starting SubConverter-Extended Core...
start "SubConverter Core" /min "%~dp0subconverter.exe" -f "%~dp0base\pref.toml"
ping 127.0.0.1 -n 3 >nul

:open_ui
echo Opening WebUI in browser...
start http://127.0.0.1:25500/
exit
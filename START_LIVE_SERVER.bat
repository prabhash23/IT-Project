@echo off
title ICU Project - Live Server
cd /d "%~dp0"
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0start_tunnel.ps1"
pause

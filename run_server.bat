@echo off
title ICU Project Server
cd /d "%~dp0IT_Project"
call "..\venv\Scripts\activate.bat"
echo =======================================================
echo Starting City General Hospital - ICU System Server
echo Local Laptop URL:  http://127.0.0.1:8000/
echo Local Network URL: http://172.16.143.66:8000/
echo (Keep this window open while using the app)
echo =======================================================
python manage.py runserver 0.0.0.0:8000
pause

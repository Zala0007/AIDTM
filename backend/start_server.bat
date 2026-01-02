@echo off
echo Starting Clinker DSS Backend Server...
cd /d "%~dp0"
venv\Scripts\python.exe -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
pause

# PowerShell script to start Clinker DSS Backend
Write-Host "Starting Clinker DSS Backend Server..." -ForegroundColor Green
Set-Location "C:\AIDTM\clinker-dss\backend"

# Start the server
& ".\venv\Scripts\python.exe" -m uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload

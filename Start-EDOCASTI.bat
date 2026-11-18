@echo off
title EDOCASTI Local Server Launcher
echo ========================================
echo   EDOCASTI PORTAL - LOCAL DEVELOPMENT
echo ========================================
echo.

powershell -NoExit -ExecutionPolicy Bypass -Command "$Project = 'C:\Users\EDSG-JOOPSA\Documents\Apps\EDSCOAI_Production\EDSCOAI'; $Backend = \"$Project\backend\"; $EnvFile = \"$Backend\.env\"; Write-Host '=== STEP 1: ENSURING .env FILE ===' -ForegroundColor Cyan; $EnvContent = \"FLASK_CONFIG=development`nAPP_ENVIRONMENT=development`nENABLE_DEV_QUICK_LOGIN=true`nSECRET_KEY=local-development-only-change-me`nJWT_SECRET_KEY=local-development-jwt-only-change-me`nCLOUDINARY_CLOUD_NAME=iwe0cz5h`nCLOUDINARY_API_KEY=381689992551161`nCLOUDINARY_API_SECRET=G5ZhiQO0fw8D1rtq-WL-A-nnZe0\"; [System.IO.File]::WriteAllText($EnvFile, $EnvContent, (New-Object System.Text.UTF8Encoding $false)); Write-Host 'PASS: .env file written.' -ForegroundColor Green; Write-Host '=== STEP 2: STARTING BACKEND ===' -ForegroundColor Cyan; Start-Process PowerShell -ArgumentList '-NoExit', '-Command', \"cd '$Backend'; .\.venv\Scripts\Activate.ps1; `$env:FLASK_CONFIG='development'; python run.py\"; Write-Host '=== STEP 3: STARTING FRONTEND ===' -ForegroundColor Cyan; Start-Process PowerShell -ArgumentList '-NoExit', '-Command', \"cd '$Project'; `$env:VITE_API_BASE_URL='http://127.0.0.1:5000'; npm run dev\"; Write-Host '=== DONE ===' -ForegroundColor Green"

echo.
echo Both servers are starting in separate windows.
echo Close this window when done.
pause
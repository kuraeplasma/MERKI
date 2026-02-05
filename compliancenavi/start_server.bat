@echo off
cd /d "%~dp0"
echo サーバーを起動しています...
echo ブラウザが自動的に開かない場合は、以下のURLにアクセスしてください:
echo http://localhost:8000/
echo.

:: ブラウザを開く (少し待ってから開く)
timeout /t 2 >nul
start "" "http://localhost:8000/index.html"
start "" "http://localhost:8000/dashboard.html"

:: Pythonサーバーを起動
python -m http.server 8000

pause

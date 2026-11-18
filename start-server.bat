@echo off
REM Ruang Fisika - jalankan server lokal lalu buka browser.
cd /d "%~dp0"
where python >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000
  python -m http.server 8000 -d site
  goto :eof
)
where node >nul 2>nul
if %errorlevel%==0 (
  start "" http://localhost:8000
  node serve.mjs
  goto :eof
)
echo Python atau Node.js tidak ditemukan. Instal salah satunya, lalu jalankan file ini lagi.
pause

@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo Parando ContabilPro em Segundo Plano...
echo ========================================================

call npx pm2 delete contabil

echo.
echo [OK] Sistema finalizado com sucesso.
pause

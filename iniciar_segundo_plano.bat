@echo off
setlocal
cd /d "%~dp0"

echo ========================================================
echo Iniciando ContabilPro em Segundo Plano (PM2)...
echo ========================================================

:: Inicia o processo em segundo plano usando PM2
call npx pm2 start npm --name "contabil" -- run dev

echo.
echo Abrindo navegador...
start http://localhost:3000

echo.
echo [OK] O sistema esta rodando em segundo plano.
echo Voce pode fechar esta janela com seguranca.
timeout /t 3 >nul
exit

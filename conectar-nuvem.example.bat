@echo off
setlocal
cd /d "%~dp0"

echo # ========================================== > .env
echo # ContabilPro - Variaveis de Ambiente >> .env
echo # AMBIENTE ATUAL: NUVEM (Aiven) >> .env
echo # ========================================== >> .env
echo. >> .env
echo DATABASE_URL="mysql://USUARIO:SENHA@HOST:PORTA/defaultdb?ssl-mode=REQUIRED" >> .env

echo.
echo ========================================================
echo [SUCESSO] Conexao alterada para BANCO NA NUVEM
echo ========================================================
echo.
echo Se o sistema estiver rodando, reinicie-o para aplicar.
echo.
pause

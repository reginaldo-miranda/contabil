@echo off
setlocal
cd /d "%~dp0"

echo # ========================================== > .env
echo # ContabilPro - Variaveis de Ambiente >> .env
echo # AMBIENTE ATUAL: LOCAL (localhost) >> .env
echo # ========================================== >> .env
echo. >> .env
echo DATABASE_URL="mysql://root:SUA_SENHA_LOCAL@localhost:3306/contabil" >> .env

echo.
echo ========================================================
echo [SUCESSO] Conexao alterada para BANCO LOCAL (localhost:3306)
echo ========================================================
echo.
echo Se o sistema estiver rodando, reinicie-o para aplicar.
echo.
pause
